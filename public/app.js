const POS_EMAIL = 'pos@wearables.studio';
const SURFACES = [
  { key: 'front', label: 'Front', short: 'Front' },
  { key: 'back', label: 'Back', short: 'Back' },
  { key: 'leftShoulder', label: 'Left Shoulder', short: 'LS' },
  { key: 'rightShoulder', label: 'Right Shoulder', short: 'RS' }
];
const FONTS = [
  'Inter', 'Helvetica Neue', 'Arial', 'Arial Black', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Tahoma',
  'Gill Sans', 'Palatino', 'Garamond', 'Courier New', 'Lucida Console', 'Franklin Gothic Medium', 'Impact', 'Segoe UI',
  'Optima', 'Baskerville', 'Didot', 'Futura', 'Avenir', 'Montserrat', 'Poppins', 'Lato', 'Playfair Display', 'Oswald',
  'Bebas Neue', 'Source Sans Pro', 'Nunito', 'Raleway', 'Merriweather', 'PT Sans', 'Ubuntu', 'Work Sans'
];
const SHAPES = [
  { key: 'rect', label: 'Rectangle', typeLabel: 'Shape' },
  { key: 'circle', label: 'Circle', typeLabel: 'Shape' },
  { key: 'line', label: 'Line', typeLabel: 'Shape' }
];

function createTextLayer(id, label, content, x, y, fontSize, fontFamily, color) {
  return { id, label, type: 'text', content, x, y, fontSize, fontFamily, color };
}

const defaultSurfaces = () => ({
  front: [
    createTextLayer('headline-front', 'Front Text A', 'Wearables', 42, 52, 46, 'Inter', '#0b0b0b'),
    createTextLayer('subline-front', 'Front Text B', 'Studio Edition', 42, 124, 28, 'Helvetica Neue', '#0b0b0b')
  ],
  back: [createTextLayer('headline-back', 'Back Text A', 'Crafted Offline', 36, 72, 38, 'Georgia', '#0b0b0b')],
  leftShoulder: [createTextLayer('shoulder-left', 'LS Text A', 'WS', 24, 24, 26, 'Arial Black', '#0b0b0b')],
  rightShoulder: [createTextLayer('shoulder-right', 'RS Text A', 'No. 01', 24, 24, 24, 'Courier New', '#0b0b0b')]
});
const defaultDrawings = () => ({ front: [], back: [], leftShoulder: [], rightShoulder: [] });
const defaultSelectedIds = () => ({ front: 'headline-front', back: 'headline-back', leftShoulder: 'shoulder-left', rightShoulder: 'shoulder-right' });

const state = {
  bootstrap: null,
  cart: JSON.parse(localStorage.getItem('wearables-cart') || '[]'),
  session: JSON.parse(localStorage.getItem('wearables-session') || 'null'),
  currentPath: window.location.pathname,
  generatedQr: null,
  placedOrder: null,
  adminExports: [],
  posGuest: JSON.parse(localStorage.getItem('wearables-pos-guest') || '{"name":"Walk-in Customer","email":"","phone":""}'),
  designSetup: { step: 1, shirtColor: 'black', source: 'custom', suggestionId: null },
  designEditor: {
    activeSurface: 'front',
    selectedIds: defaultSelectedIds(),
    surfaces: defaultSurfaces(),
    drawings: defaultDrawings(),
    toolMode: 'select',
    strokeColor: '#0b0b0b',
    viewerRotation: 18
  }
};

const app = document.getElementById('app');
let dragState = null;
let drawingState = null;

function persistCart() { localStorage.setItem('wearables-cart', JSON.stringify(state.cart)); }
function persistSession() { localStorage.setItem('wearables-session', JSON.stringify(state.session)); }
function persistPosGuest() { localStorage.setItem('wearables-pos-guest', JSON.stringify(state.posGuest)); }
function currency(value) { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value); }
function dateLabel(value) { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
function api(url, options = {}) { return fetch(url, options).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data; }); }
function cartCount() { return state.cart.reduce((sum, item) => sum + item.quantity, 0); }
function totalCart() { return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }
function isPosMode() { return state.session?.email === POS_EMAIL; }
function canAccessAdmin() { return state.session?.role === 'admin' && state.session?.email !== POS_EMAIL; }
function activeSurface() { return state.designEditor.activeSurface; }
function surfaceElements(surfaceKey = activeSurface()) { return state.designEditor.surfaces[surfaceKey]; }
function surfaceDrawings(surfaceKey = activeSurface()) { return state.designEditor.drawings[surfaceKey]; }
function selectedLayer(surfaceKey = activeSurface()) { const elements = surfaceElements(surfaceKey); return elements.find((item) => item.id === state.designEditor.selectedIds[surfaceKey]) || elements[0] || null; }
function qrImage(payload) { return `/api/qr-preview?data=${encodeURIComponent(JSON.stringify(payload))}`; }
function creatorName(creatorId) { return state.bootstrap.creators.find((creator) => creator.id === creatorId)?.name || 'Wearables Creator'; }
function topSuggestions() { return [...state.bootstrap.designs].sort((a, b) => b.salesCount - a.salesCount).slice(0, 3); }
function activeClass(path) { return state.currentPath === path ? 'active' : ''; }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function currentTextColor() { return state.designSetup.shirtColor === 'black' ? '#ffffff' : '#0b0b0b'; }
function hasTabletSessionData() { return Boolean(state.cart.length || state.placedOrder || state.posGuest.email || state.posGuest.phone || (state.posGuest.name && state.posGuest.name !== 'Walk-in Customer')); }
function getDraftPayload() { return { shirtColor: state.designSetup.shirtColor, source: state.designSetup.source, suggestionId: state.designSetup.suggestionId, surfaces: state.designEditor.surfaces, drawings: state.designEditor.drawings, customer: isPosMode() ? state.posGuest : state.session || null }; }
function navigate(path) { history.pushState({}, '', path); state.currentPath = path; if (path === '/dashboard' && canAccessAdmin()) ensureAdminExports(); render(); }
function designBaseColor() { return state.designSetup.shirtColor === 'black' ? '#0b0b0b' : '#ffffff'; }
function designAccentColor() { return state.designSetup.shirtColor === 'black' ? '#d6cfc7' : '#1f1f1f'; }
function layerTypeName(type, shapeKey) {
  if (type === 'text') return 'Text';
  if (type === 'image') return 'Image';
  if (type === 'shape') return shapeKey === 'line' ? 'Line' : 'Shape';
  return 'Layer';
}
function nextLayerLabel(surfaceKey, type, shapeKey) {
  const surface = SURFACES.find((entry) => entry.key === surfaceKey);
  const prefix = surface.short;
  const typeName = layerTypeName(type, shapeKey);
  const similar = surfaceElements(surfaceKey).filter((layer) => layer.label?.startsWith(`${prefix} ${typeName}`)).length;
  return `${prefix} ${typeName} ${String.fromCharCode(65 + similar)}`;
}
function buildDesignPreviewSurfaces(design) {
  return {
    front: [createTextLayer(`${design.id}-front`, 'Front Text A', design.title, 42, 88, 34, 'Arial Black', '#ffffff')],
    back: [createTextLayer(`${design.id}-back`, 'Back Text A', `By ${creatorName(design.creatorId)}`, 32, 72, 24, 'Helvetica Neue', '#d6cfc7')],
    leftShoulder: [createTextLayer(`${design.id}-ls`, 'LS Text A', 'WS', 16, 16, 18, 'Inter', '#d6cfc7')],
    rightShoulder: [createTextLayer(`${design.id}-rs`, 'RS Text A', design.tags?.[0]?.toUpperCase() || 'DROP', 12, 16, 14, 'Inter', '#d6cfc7')]
  };
}
function shirtColorForDesign(design) { return design.tags?.includes('beige') ? 'white' : 'black'; }

function resetDesigner() {
  state.designSetup = { step: 1, shirtColor: 'black', source: 'custom', suggestionId: null };
  state.designEditor = { activeSurface: 'front', selectedIds: defaultSelectedIds(), surfaces: defaultSurfaces(), drawings: defaultDrawings(), toolMode: 'select', strokeColor: '#0b0b0b', viewerRotation: 18 };
}
function resetTablet() {
  state.cart = [];
  state.generatedQr = null;
  state.placedOrder = null;
  state.posGuest = { name: 'Walk-in Customer', email: '', phone: '' };
  resetDesigner();
  persistCart();
  persistPosGuest();
}
function applySuggestion(designId) {
  const suggestion = state.bootstrap.designs.find((item) => item.id === designId);
  resetDesigner();
  state.designSetup.source = designId ? 'suggestion' : 'custom';
  state.designSetup.suggestionId = designId;
  state.designSetup.step = 3;
  if (suggestion) {
    state.designEditor.surfaces = buildDesignPreviewSurfaces(suggestion);
    state.designEditor.selectedIds = { front: `${suggestion.id}-front`, back: `${suggestion.id}-back`, leftShoulder: `${suggestion.id}-ls`, rightShoulder: `${suggestion.id}-rs` };
  }
}

async function loadBootstrap() { state.bootstrap = await api('/api/bootstrap'); }
async function ensureAdminExports() { if (!canAccessAdmin()) return; const data = await api('/api/design-exports'); state.adminExports = data.exports; render(); }
window.addEventListener('popstate', () => { state.currentPath = window.location.pathname; if (state.currentPath === '/dashboard' && canAccessAdmin()) ensureAdminExports(); render(); });

document.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-link]');
  if (link) { event.preventDefault(); navigate(link.getAttribute('href')); return; }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const type = action.dataset.action;

  if (type === 'logout') { state.session = null; persistSession(); render(); }
  if (type === 'go-home') navigate('/');
  if (type === 'clear-tablet') { resetTablet(); render(); }
  if (type === 'pick-layer') { state.designEditor.selectedIds[activeSurface()] = action.dataset.id; render(); }
  if (type === 'set-surface') { state.designEditor.activeSurface = action.dataset.surface; render(); }
  if (type === 'set-tool') { state.designEditor.toolMode = action.dataset.tool; render(); }
  if (type === 'set-shirt-color') { state.designSetup.shirtColor = action.dataset.color; state.designSetup.step = 2; render(); }
  if (type === 'use-custom-designer') { applySuggestion(null); render(); }
  if (type === 'use-suggestion') { applySuggestion(action.dataset.designId); render(); }
  if (type === 'start-over-designer') { resetDesigner(); render(); }
  if (type === 'quick-checkout') navigate('/checkout');
  if (type === 'remove-cart') { state.cart = state.cart.filter((item) => !(item.designId === action.dataset.designId && item.size === action.dataset.size)); persistCart(); render(); }
  if (type === 'rotate-left') { state.designEditor.viewerRotation -= 12; render(); }
  if (type === 'rotate-right') { state.designEditor.viewerRotation += 12; render(); }
  if (type === 'add-text') {
    const id = `${activeSurface()}-text-${Date.now()}`;
    surfaceElements().push({ id, label: nextLayerLabel(activeSurface(), 'text'), type: 'text', content: 'New Text', x: 40, y: 56, fontSize: 36, fontFamily: 'Inter', color: currentTextColor() });
    state.designEditor.selectedIds[activeSurface()] = id;
    render();
  }
  if (type === 'add-shape') {
    const id = `${activeSurface()}-shape-${Date.now()}`;
    surfaceElements().push({ id, label: nextLayerLabel(activeSurface(), 'shape', action.dataset.shape), type: 'shape', shape: action.dataset.shape, x: 60, y: 80, width: 140, height: action.dataset.shape === 'line' ? 8 : 110, color: designAccentColor() });
    state.designEditor.selectedIds[activeSurface()] = id;
    render();
  }
  if (type === 'mark-status') {
    try {
      await api(`/api/orders/${action.dataset.orderId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action.dataset.status, paymentStatus: action.dataset.payment || undefined }) });
      await loadBootstrap();
      if (canAccessAdmin()) await ensureAdminExports();
      render();
    } catch (error) { alert(error.message); }
  }
  if (type === 'save-design-private') {
    try {
      const pngs = await exportDesignPngs();
      await api('/api/design-exports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId: state.session?.id || 'guest', shirtColor: state.designSetup.shirtColor, sourceDesignId: state.designSetup.suggestionId, surfaces: state.designEditor.surfaces, pngs }) });
      if (canAccessAdmin()) await ensureAdminExports();
      alert('Design saved privately for admin access.');
    } catch (error) { alert(error.message || 'Unable to save design export.'); }
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches('[data-pos-field]')) { state.posGuest[target.dataset.posField] = target.value; persistPosGuest(); render(); return; }
  if (target.matches('[data-upload="image"]')) {
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `${activeSurface()}-image-${Date.now()}`;
      surfaceElements().push({ id, label: nextLayerLabel(activeSurface(), 'image'), type: 'image', content: String(reader.result), x: 72, y: 148, width: 190, height: 190 });
      state.designEditor.selectedIds[activeSurface()] = id;
      render();
    };
    reader.readAsDataURL(file);
    return;
  }
  if (target.matches('[data-input="viewer-rotation"]')) { state.designEditor.viewerRotation = Number(target.value); render(); return; }

  const layer = selectedLayer();
  if (!layer) return;
  if (target.matches('[data-input="layer-content"]')) layer.content = target.value;
  if (target.matches('[data-input="layer-font"]')) layer.fontFamily = target.value;
  if (target.matches('[data-input="layer-font-size"]')) layer.fontSize = Number(target.value);
  if (target.matches('[data-input="layer-color"]')) layer.color = target.value;
  if (target.matches('[data-input="layer-x"]')) layer.x = Number(target.value);
  if (target.matches('[data-input="layer-y"]')) layer.y = Number(target.value);
  if (target.matches('[data-input="layer-width"]')) layer.width = Number(target.value);
  if (target.matches('[data-input="stroke-color"]')) state.designEditor.strokeColor = target.value;
  render();
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (form.matches('[data-form="login"]')) {
    event.preventDefault();
    try {
      const data = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      state.session = data.user;
      persistSession();
      navigate(data.user.email === POS_EMAIL ? '/creator-hub' : data.user.role === 'admin' ? '/dashboard' : '/');
    } catch (error) { alert(error.message); }
    return;
  }
  if (form.matches('[data-form="signup"]')) {
    event.preventDefault();
    try {
      const data = await api('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      state.session = data.user;
      persistSession();
      navigate('/');
    } catch (error) { alert(error.message); }
    return;
  }
  if (form.matches('[data-form="add-cart"]')) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const design = state.bootstrap.designs.find((item) => item.id === payload.designId);
    const quantity = Number(payload.quantity);
    const existing = state.cart.find((item) => item.designId === payload.designId && item.size === payload.size);
    if (existing) existing.quantity += quantity;
    else state.cart.push({ productId: payload.designId, designId: payload.designId, designTitle: design.title, imageUrl: design.imageUrl, size: payload.size, quantity, price: design.price });
    persistCart();
    render();
    alert('Added to cart.');
    return;
  }
  if (form.matches('[data-form="checkout"]')) {
    event.preventDefault();
    if (!state.cart.length) return alert('Your cart is empty.');
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, userId: state.session?.id || 'guest', items: state.cart }) });
      state.placedOrder = data.order;
      state.cart = [];
      persistCart();
      await loadBootstrap();
      render();
    } catch (error) { alert(error.message); }
    return;
  }
  if (form.matches('[data-form="dashboard-qr"]')) {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      state.generatedQr = data.record;
      render();
    } catch (error) { alert(error.message); }
  }
});

document.addEventListener('pointerdown', (event) => {
  const canvas = document.querySelector('[data-design-canvas]');
  if (!canvas) return;
  const canvasRect = canvas.getBoundingClientRect();
  if (state.designEditor.toolMode === 'draw' && canvas.contains(event.target)) {
    const x = Math.max(0, event.clientX - canvasRect.left);
    const y = Math.max(0, event.clientY - canvasRect.top);
    drawingState = { surface: activeSurface() };
    surfaceDrawings().push({ id: `drawing-${Date.now()}`, color: state.designEditor.strokeColor, points: [{ x, y }] });
    render();
    return;
  }
  const layerNode = event.target.closest('[data-layer-id]');
  if (!layerNode) return;
  const rect = layerNode.getBoundingClientRect();
  dragState = { id: layerNode.dataset.layerId, canvasRect, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
  state.designEditor.selectedIds[activeSurface()] = layerNode.dataset.layerId;
  render();
});

document.addEventListener('pointermove', (event) => {
  if (drawingState) {
    const canvas = document.querySelector('[data-design-canvas]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const drawings = surfaceDrawings(drawingState.surface);
    drawings[drawings.length - 1].points.push({ x: Math.max(0, event.clientX - rect.left), y: Math.max(0, event.clientY - rect.top) });
    render();
    return;
  }
  if (!dragState) return;
  const layer = surfaceElements().find((item) => item.id === dragState.id);
  if (!layer) return;
  layer.x = Math.max(0, Math.min(event.clientX - dragState.canvasRect.left - dragState.offsetX, dragState.canvasRect.width - 100));
  layer.y = Math.max(0, Math.min(event.clientY - dragState.canvasRect.top - dragState.offsetY, dragState.canvasRect.height - 40));
  render();
});

document.addEventListener('pointerup', () => { dragState = null; drawingState = null; });

function renderLayer(layer, isSelected) {
  if (layer.type === 'text') return `<div class="layer ${isSelected ? 'selected' : ''}" data-layer-id="${layer.id}" style="left:${layer.x}px;top:${layer.y}px;font-size:${layer.fontSize || 36}px;font-family:${layer.fontFamily || 'Inter'};color:${layer.color || currentTextColor()};font-weight:700;">${escapeHtml(layer.content)}</div>`;
  if (layer.type === 'image') return `<img class="layer ${isSelected ? 'selected' : ''}" data-layer-id="${layer.id}" src="${layer.content}" alt="Uploaded art" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width || 190}px;height:${layer.height || layer.width || 190}px;object-fit:cover;border-radius:16px;" />`;
  if (layer.type === 'shape') {
    const style = `left:${layer.x}px;top:${layer.y}px;width:${layer.width || 140}px;height:${layer.height || 110}px;background:${layer.shape === 'line' ? layer.color : layer.shape === 'rect' ? 'transparent' : layer.color};border:${layer.shape === 'rect' ? `4px solid ${layer.color}` : layer.shape === 'circle' ? `4px solid ${layer.color}` : 'none'};border-radius:${layer.shape === 'circle' ? '999px' : layer.shape === 'rect' ? '18px' : '999px'};`;
    return `<div class="layer shape-layer ${isSelected ? 'selected' : ''}" data-layer-id="${layer.id}" style="${style}"></div>`;
  }
  return '';
}
function renderDrawingOverlay(surfaceKey = activeSurface(), preview = false) {
  const drawings = surfaceDrawings(surfaceKey);
  if (!drawings.length) return '';
  return `<svg class="drawing-overlay ${preview ? 'preview-drawing' : ''}" viewBox="0 0 320 360" preserveAspectRatio="none">${drawings.map((stroke) => `<polyline fill="none" stroke="${stroke.color}" stroke-width="${preview ? 2 : 4}" stroke-linecap="round" stroke-linejoin="round" points="${stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}"></polyline>`).join('')}</svg>`;
}
function renderPreviewLayer(layer) {
  if (layer.type === 'text') return `<div class="preview-layer" style="left:${layer.x / 2}px;top:${layer.y / 2}px;font-size:${Math.max(12, (layer.fontSize || 36) * 0.45)}px;font-family:${layer.fontFamily || 'Inter'};color:${layer.color || currentTextColor()};font-weight:700;">${escapeHtml(layer.content)}</div>`;
  if (layer.type === 'image') return `<img class="preview-layer" src="${layer.content}" alt="Preview art" style="left:${layer.x / 2}px;top:${layer.y / 2}px;width:${(layer.width || 190) * 0.45}px;height:${(layer.height || layer.width || 190) * 0.45}px;object-fit:cover;border-radius:10px;" />`;
  if (layer.type === 'shape') return `<div class="preview-layer" style="left:${layer.x / 2}px;top:${layer.y / 2}px;width:${(layer.width || 140) * 0.45}px;height:${(layer.height || 110) * 0.45}px;background:${layer.shape === 'line' ? layer.color : layer.shape === 'rect' ? 'transparent' : layer.color};border:${layer.shape === 'rect' ? `2px solid ${layer.color}` : layer.shape === 'circle' ? `2px solid ${layer.color}` : 'none'};border-radius:${layer.shape === 'circle' ? '999px' : layer.shape === 'rect' ? '10px' : '999px'};"></div>`;
  return '';
}
function renderPreviewSurface(surfaceKey, surfaces, drawings) {
  return `${surfaces[surfaceKey].map(renderPreviewLayer).join('')}${drawings[surfaceKey].length ? `<svg class="drawing-overlay preview-drawing" viewBox="0 0 320 360" preserveAspectRatio="none">${drawings[surfaceKey].map((stroke) => `<polyline fill="none" stroke="${stroke.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}"></polyline>`).join('')}</svg>` : ''}`;
}
function renderPhotoStrip(gallery = []) { return gallery?.length ? `<div class="photo-strip">${gallery.map((photo, index) => `<img src="${photo}" alt="Gallery ${index + 1}" class="photo-thumb" />`).join('')}</div>` : ''; }
function renderShirtViewer({ shirtColor, surfaces, drawings, rotation, interactive = false }) {
  return `<div class="viewer-shell"><div class="shirt-rotator"><div class="shirt-rotator-track" style="--rotate-y:${rotation}deg;"><div class="shirt-3d ${shirtColor}"><div class="shirt-body"></div><div class="shirt-neck"></div><div class="shirt-sleeve left"></div><div class="shirt-sleeve right"></div><div class="preview-surface front ${shirtColor}">${renderPreviewSurface('front', surfaces, drawings)}</div><div class="preview-surface back ${shirtColor}">${renderPreviewSurface('back', surfaces, drawings)}</div><div class="preview-surface left-shoulder ${shirtColor}">${renderPreviewSurface('leftShoulder', surfaces, drawings)}</div><div class="preview-surface right-shoulder ${shirtColor}">${renderPreviewSurface('rightShoulder', surfaces, drawings)}</div></div></div></div>${interactive ? `<div class="viewer-controls"><button class="button-ghost" data-action="rotate-left">Rotate Left</button><input type="range" min="-45" max="45" value="${rotation}" data-input="viewer-rotation" /><button class="button-ghost" data-action="rotate-right">Rotate Right</button></div>` : ''}</div>`;
}

async function drawLayerToCanvas(ctx, layer) {
  if (layer.type === 'text') { ctx.fillStyle = layer.color || currentTextColor(); ctx.font = `700 ${layer.fontSize || 36}px ${layer.fontFamily || 'Inter'}`; ctx.fillText(layer.content, layer.x, layer.y + (layer.fontSize || 36)); return; }
  if (layer.type === 'shape') {
    ctx.strokeStyle = layer.color || '#0b0b0b'; ctx.fillStyle = layer.color || '#0b0b0b'; ctx.lineWidth = 6;
    if (layer.shape === 'rect') ctx.strokeRect(layer.x, layer.y, layer.width || 140, layer.height || 110);
    if (layer.shape === 'circle') { ctx.beginPath(); ctx.ellipse(layer.x + (layer.width || 140) / 2, layer.y + (layer.height || 110) / 2, (layer.width || 140) / 2, (layer.height || 110) / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (layer.shape === 'line') ctx.fillRect(layer.x, layer.y, layer.width || 140, layer.height || 8);
    return;
  }
  if (layer.type === 'image') {
    const image = new Image(); image.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = layer.content; }).catch(() => null);
    if (image.complete) ctx.drawImage(image, layer.x, layer.y, layer.width || 190, layer.height || layer.width || 190);
  }
}
async function exportDesignPngs() {
  const pngs = {};
  for (const surface of SURFACES) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = designBaseColor(); ctx.fillRect(0, 0, 1080, 1080);
    ctx.strokeStyle = state.designSetup.shirtColor === 'black' ? '#1f1f1f' : '#dddddd'; ctx.strokeRect(32, 32, 1016, 1016);
    ctx.save(); ctx.scale(3.2, 3);
    for (const layer of surfaceElements(surface.key)) await drawLayerToCanvas(ctx, layer);
    surfaceDrawings(surface.key).forEach((stroke) => { ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = 4; stroke.points.forEach((point, index) => { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); }); ctx.stroke(); });
    ctx.restore();
    pngs[surface.key] = canvas.toDataURL('image/png');
  }
  return pngs;
}

function shell(content) {
  return `<div class="shell"><header class="header"><div class="container header-inner"><a href="/" data-link class="brand">Wearables Studio</a><nav class="nav">${[['/', 'Home'], ['/design', 'Design Studio'], ['/creator-hub', 'Marketplace'], ['/checkout', 'Checkout'], ['/dashboard', 'Dashboard'], ['/about', 'About']].map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}</nav><div class="actions">${isPosMode() ? '<span class="tag">POS Mode</span>' : ''}<a href="/checkout" data-link class="button-ghost">Cart (${cartCount()})</a>${state.session ? `<button class="button">${escapeHtml(state.session.name.split(' ')[0])}</button><button class="button-ghost" data-action="logout">Logout</button>` : `<a href="/login" data-link class="button">Login</a>`}</div></div></header><main class="page container">${content}</main><footer class="footer"><div class="container footer-inner"><strong>Wearables Studio</strong><span class="muted">Premium custom apparel · In-store payment only</span></div></footer><nav class="mobile-nav">${[['/', 'Home'], ['/design', 'Studio'], ['/creator-hub', 'Market'], ['/checkout', 'Cart'], ['/dashboard', 'Admin']].map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}</nav></div>`;
}
function designCards(designs) {
  return designs.map((design) => `<article class="card hover stack"><div class="card-viewer">${renderShirtViewer({ shirtColor: shirtColorForDesign(design), surfaces: buildDesignPreviewSurfaces(design), drawings: defaultDrawings(), rotation: 18 })}</div>${renderPhotoStrip(design.gallery || [design.imageUrl])}<div class="row"><div><strong>${escapeHtml(design.title)}</strong><div class="muted">by ${escapeHtml(design.creatorName || creatorName(design.creatorId))}</div></div><span class="badge">${currency(design.price)}</span></div><p class="muted">${escapeHtml(design.description)}</p><div class="row"><span class="eyebrow">${design.salesCount} sales</span><a href="/product/${design.id}" data-link>View Product</a></div></article>`).join('');
}
function qrPanelCard(title, subtitle, payload) { return `<div class="qr-card"><div class="eyebrow">${escapeHtml(title)}</div><img class="qr-preview" src="${qrImage(payload)}" alt="${escapeHtml(title)}" /><p class="muted small">${escapeHtml(subtitle)}</p></div>`; }
function posPanel(context) {
  if (!isPosMode()) return '';
  const basePayload = { posHost: POS_EMAIL, customer: state.posGuest };
  const cards = { marketplace: [qrPanelCard('Customer Login QR', 'Scan to link a customer as a temporary sub-account on the in-store tablet.', { ...basePayload, intent: 'tablet-login', page: 'marketplace' }), qrPanelCard('Marketplace Session QR', 'Share the current marketplace browsing session and featured catalog.', { ...basePayload, intent: 'marketplace-share', designs: state.bootstrap.designs.map((item) => item.id) })], design: [qrPanelCard('Upload Art QR', 'Share the upload handoff so a customer can send artwork into the active design surface.', { ...basePayload, intent: 'upload-art', surface: activeSurface(), draft: getDraftPayload() }), qrPanelCard('Design Share QR', 'Share the full multi-surface draft from the in-store builder.', { ...basePayload, intent: 'design-share', draft: getDraftPayload() })], checkout: [qrPanelCard('Checkout QR', 'Share the pending cart and customer profile before in-store payment.', { ...basePayload, intent: 'checkout-share', cart: state.cart, total: totalCart() }), state.placedOrder ? qrPanelCard('Pickup QR', 'Use this QR when the customer comes back for pickup.', { ...basePayload, intent: 'pickup', orderId: state.placedOrder.id }) : ''] };
  return `<section class="card pos-shell stack"><div class="row pos-header-wrap"><div><div class="eyebrow">In-store tablet mode</div><h3 class="section-title">POS QR convenience</h3><p class="muted">Logged in as ${POS_EMAIL}. This mode exposes QR-first customer handoff tools only on marketplace, design studio, and checkout.</p></div>${hasTabletSessionData() ? '<button class="button-secondary" data-action="clear-tablet">Clear Tablet Data</button>' : ''}</div><div class="grid-3"><label>Customer Name<input class="input" data-pos-field="name" value="${escapeHtml(state.posGuest.name || '')}" /></label><label>Customer Email<input class="input" data-pos-field="email" value="${escapeHtml(state.posGuest.email || '')}" placeholder="customer@email.com" /></label><label>Customer Phone<input class="input" data-pos-field="phone" value="${escapeHtml(state.posGuest.phone || '')}" placeholder="+20 100 000 0000" /></label></div><div class="qr-grid">${cards[context].join('')}</div></section>`;
}

function homePage() {
  const { brand, designs } = state.bootstrap;
  return shell(`<section class="hero card soft"><div class="stack"><span class="badge">Luxury custom apparel</span><h1 class="title-xl">Design online, pay in store, and manage pickup with elegant QR workflows.</h1><p class="muted">Wearables Studio combines creator drops, a guided multi-surface builder, and cashier-managed production for a premium store-first experience.</p><div class="toolbar"><a href="/design" data-link class="button">Start Designing</a><a href="/creator-hub" data-link class="button-ghost">Open Marketplace</a></div><div class="grid-3"><div class="card"><div class="eyebrow">Shirt price</div><strong>${currency(brand.price)}</strong></div><div class="card"><div class="eyebrow">Creator commission</div><strong>${currency(brand.commission)}</strong></div><div class="card"><div class="eyebrow">Workflow</div><strong>Pending Payment → Paid → Pickup</strong></div></div></div><div class="card stack"><div class="eyebrow">Store journey</div>${['Choose a shirt color', 'Pick a suggested design or build custom', 'Share or upload via QR', 'Pay with cashier in store', 'Collect with pickup QR'].map((step, index) => `<div class="card row compact"><span>${escapeHtml(step)}</span><span class="tag">0${index + 1}</span></div>`).join('')}</div></section><section class="section"><div><div class="eyebrow">Featured designs</div><h2 class="title-lg">Premium monochrome essentials from the creator marketplace.</h2></div><div class="market-grid">${designCards(designs)}</div></section>`);
}
function creatorHubPage() { return shell(`<section class="section"><div class="eyebrow">Creator marketplace</div><h1 class="title-lg">A premium gallery where creators publish sale-ready apparel drops.</h1><p class="muted">Each design now includes a rotatable 3D shirt preview plus creator photo thumbnails under the viewer.</p></section>${posPanel('marketplace')}<section class="grid-2">${state.bootstrap.creators.map((creator) => `<div class="card stack"><div class="eyebrow">Creator profile</div><h3>${escapeHtml(creator.name)}</h3><p class="muted">${escapeHtml(creator.bio || 'Premium creator profile.')}</p><div class="row"><span class="badge">EGP ${creator.earnings}</span><a href="/creator/${creator.username}" data-link class="button-ghost">View Profile</a></div></div>`).join('')}</section><section class="market-grid">${designCards(state.bootstrap.designs)}</section>`); }
function creatorPage(username) {
  const creator = state.bootstrap.creators.find((item) => item.username === username);
  if (!creator) return notFoundPage();
  const creatorDesigns = state.bootstrap.designs.filter((design) => design.creatorId === creator.id);
  return shell(`<section class="section"><div class="eyebrow">Creator profile</div><h1 class="title-lg">${escapeHtml(creator.name)}</h1><p class="muted">${escapeHtml(creator.bio || '')}</p></section><section class="grid-2"><div class="card"><div class="eyebrow">Username</div><h3>@${escapeHtml(creator.username)}</h3></div><div class="card"><div class="eyebrow">Lifetime earnings</div><h3>EGP ${creator.earnings}</h3></div></section><section class="market-grid">${designCards(creatorDesigns)}</section>`);
}
function productPage(id) {
  const design = state.bootstrap.designs.find((item) => item.id === id);
  if (!design) return notFoundPage();
  return shell(`<section class="grid-2"><div class="card stack">${renderShirtViewer({ shirtColor: shirtColorForDesign(design), surfaces: buildDesignPreviewSurfaces(design), drawings: defaultDrawings(), rotation: 18, interactive: false })}${renderPhotoStrip(design.gallery || [design.imageUrl])}</div><div class="stack"><span class="badge">Premium custom apparel</span><h1 class="title-lg">${escapeHtml(design.title)}</h1><p class="muted">${escapeHtml(design.description)}</p><div class="card soft stack"><div class="row"><span class="muted">Price</span><strong>${currency(design.price)}</strong></div><div class="row"><span class="muted">Payment model</span><strong>Pay in store only</strong></div><div class="row"><span class="muted">Availability</span><strong>Made to order</strong></div></div><form data-form="add-cart" class="card stack"><input type="hidden" name="designId" value="${design.id}" /><label>Size<select name="size" class="select">${['S', 'M', 'L', 'XL'].map((size) => `<option value="${size}">${size}</option>`).join('')}</select></label><label>Quantity<input name="quantity" class="input" type="number" min="1" max="10" value="1" /></label><div class="toolbar"><button class="button">Add to Cart</button><button type="button" class="button-ghost" data-action="quick-checkout">Checkout</button></div></form></div></section>`);
}
function designerQuestionFlow() {
  if (state.designSetup.step === 1) return `<section class="designer-question card stack"><div class="eyebrow">Step 1</div><h1 class="title-lg">Which base T-shirt would you like to design?</h1><p class="muted">Choose the shirt color first. White tees now render on a fully white 3D shirt object and white editing background.</p><div class="grid-2"><button class="color-choice black" data-action="set-shirt-color" data-color="black">Black T-shirt</button><button class="color-choice white" data-action="set-shirt-color" data-color="white">White T-shirt</button></div></section>`;
  return `<section class="designer-question stack"><div class="card stack"><div class="eyebrow">Step 2</div><h1 class="title-lg">Start from a top creator suggestion or open the custom designer.</h1><p class="muted">Selected shirt color: <strong>${escapeHtml(state.designSetup.shirtColor)}</strong>.</p></div><div class="market-grid">${topSuggestions().map((design) => `<article class="card hover stack"><div class="card-viewer">${renderShirtViewer({ shirtColor: state.designSetup.shirtColor, surfaces: buildDesignPreviewSurfaces(design), drawings: defaultDrawings(), rotation: 16 })}</div>${renderPhotoStrip(design.gallery || [design.imageUrl])}<div><strong>${escapeHtml(design.title)}</strong><div class="muted">by ${escapeHtml(design.creatorName || creatorName(design.creatorId))}</div></div><button class="button" data-action="use-suggestion" data-design-id="${design.id}">Use This Suggestion</button></article>`).join('')}<article class="card stack centered-card"><span class="badge">Custom</span><h3>Open blank designer</h3><p class="muted">Go straight into the editor with a blank multi-surface layout.</p><button class="button-secondary" data-action="use-custom-designer">Open Designer</button></article></div></section>`;
}
function designPage() {
  if (state.designSetup.step < 3) return shell(`${designerQuestionFlow()}`);
  const layer = selectedLayer();
  return shell(`<section class="section"><div class="eyebrow">Design studio</div><h1 class="title-lg">Two-sided designer workspace with guided tools on the left and a realtime 3D rotator on the right.</h1><p class="muted">Build across front, back, left shoulder, and right shoulder. Draw freehand, add images, add text with a large font range, use friendly layer names, and preview everything on a rotatable black or white shirt model.</p></section>${posPanel('design')}<section class="designer-board"><div class="designer-left stack"><div class="card stack"><div class="row"><div><div class="eyebrow">Toolkit</div><h3 class="section-title">Editing panel</h3></div><div class="toolbar"><span class="tag">${escapeHtml(state.designSetup.shirtColor)} tee</span><button class="button-ghost" data-action="start-over-designer">Restart</button></div></div><div class="tabs">${SURFACES.map((surface) => `<button class="tab ${activeSurface() === surface.key ? 'active' : ''}" data-action="set-surface" data-surface="${surface.key}">${surface.label}</button>`).join('')}</div><div class="toolkit-grid"><button class="button" data-action="add-text">Add Text</button><label class="button-ghost">Add Picture<input data-upload="image" type="file" accept="image/*" hidden /></label>${SHAPES.map((shape) => `<button class="button-ghost" data-action="add-shape" data-shape="${shape.key}">${shape.label}</button>`).join('')}<button class="button-ghost ${state.designEditor.toolMode === 'draw' ? 'selected-chip' : ''}" data-action="set-tool" data-tool="draw">Draw</button><button class="button-ghost ${state.designEditor.toolMode === 'select' ? 'selected-chip' : ''}" data-action="set-tool" data-tool="select">Move</button></div><div class="grid-2"><label>Text / Label<input class="input" data-input="layer-content" value="${escapeHtml(layer?.content || '')}" ${layer?.type === 'text' ? '' : 'disabled'} /></label><label>Font<select class="select" data-input="layer-font" ${layer?.type === 'text' ? '' : 'disabled'}>${FONTS.map((font) => `<option value="${font}" ${layer?.fontFamily === font ? 'selected' : ''}>${font}</option>`).join('')}</select></label></div><div class="grid-3"><label>Font Size<input type="range" data-input="layer-font-size" min="14" max="120" value="${layer?.fontSize || 36}" ${layer?.type === 'text' ? '' : 'disabled'} /></label><label>Color<input class="input color-input" type="color" data-input="layer-color" value="${layer?.color || currentTextColor()}" /></label><label>Draw Color<input class="input color-input" type="color" data-input="stroke-color" value="${state.designEditor.strokeColor}" /></label></div><div class="grid-3"><label>X<input type="range" data-input="layer-x" min="0" max="260" value="${layer?.x || 0}" ${layer ? '' : 'disabled'} /></label><label>Y<input type="range" data-input="layer-y" min="0" max="320" value="${layer?.y || 0}" ${layer ? '' : 'disabled'} /></label><label>Width<input type="range" data-input="layer-width" min="40" max="260" value="${layer?.width || 140}" ${(layer && (layer.type === 'image' || layer.type === 'shape')) ? '' : 'disabled'} /></label></div><div class="card soft stack"><div class="eyebrow">Layers on ${SURFACES.find((surface) => surface.key === activeSurface()).label}</div>${surfaceElements().map((item) => `<button class="button-ghost ${state.designEditor.selectedIds[activeSurface()] === item.id ? 'selected-chip' : ''}" data-action="pick-layer" data-id="${item.id}">${escapeHtml(item.label || item.id)}</button>`).join('') || '<p class="muted">No layers yet.</p>'}<p class="muted small">Friendly labels replace internal kebab-case ids so creators see names like “Back Text A” or “LS Image B”.</p></div><div class="canvas-panel ${state.designSetup.shirtColor}" data-design-canvas>${renderDrawingOverlay(activeSurface())}${surfaceElements().map((item) => renderLayer(item, state.designEditor.selectedIds[activeSurface()] === item.id)).join('')}</div><div class="toolbar"><button class="button" data-action="save-design-private">Save 4 Private PNGs</button><span class="muted small">Saved exports are visible in the admin dashboard only.</span></div></div></div><div class="designer-right stack"><div class="card stack"><div class="row"><div><div class="eyebrow">Live preview</div><h3 class="section-title">Realtime 3D shirt rotator</h3></div><span class="tag">Live</span></div>${renderShirtViewer({ shirtColor: state.designSetup.shirtColor, surfaces: state.designEditor.surfaces, drawings: state.designEditor.drawings, rotation: state.designEditor.viewerRotation, interactive: true })}<div class="notice">White shirts now use a fully white model and white preview surfaces. Rotate the model in real time while editing on the left.</div></div></div></section>`);
}
function checkoutPage() { return shell(`<section class="section"><div class="eyebrow">Checkout</div><h1 class="title-lg">Create the order online and leave payment to the in-store cashier.</h1><p class="muted">Every order is created as Pending Payment. The cashier updates payment manually when the customer arrives.</p></section>${posPanel('checkout')}<section class="order-grid"><div class="card stack"><h2>Cart summary</h2>${state.cart.length ? state.cart.map((item) => `<div class="card row compact-start"><div class="inline-media"><img src="${item.imageUrl}" alt="${escapeHtml(item.designTitle)}" class="cart-thumb" /><div><strong>${escapeHtml(item.designTitle)}</strong><div class="muted">Size ${item.size} · Qty ${item.quantity}</div></div></div><div class="stack align-end"><strong>${currency(item.quantity * item.price)}</strong><button class="button-ghost" data-action="remove-cart" data-design-id="${item.designId}" data-size="${item.size}">Remove</button></div></div>`).join('') : '<p class="muted">Your cart is empty.</p>'}<div class="row"><span class="muted">Total</span><strong>${currency(totalCart())}</strong></div></div><div class="stack"><form data-form="checkout" class="card stack"><label>Name<input class="input" name="customerName" value="${escapeHtml(isPosMode() ? state.posGuest.name : state.session?.name || '')}" required /></label><label>Phone<input class="input" name="phone" value="${escapeHtml(isPosMode() ? state.posGuest.phone : '')}" placeholder="+20 100 000 0000" required /></label><label>Optional notes<textarea class="textarea" name="notes" rows="4" placeholder="Packaging or pickup notes"></textarea></label><div class="notice">No online payment is collected here. The cashier confirms payment manually in-store before production begins.</div><button class="button" ${state.cart.length ? '' : 'disabled'}>Place Order</button></form>${state.placedOrder ? `<div class="card stack"><div class="eyebrow">Order completed</div><h3 class="section-title">Order ${state.placedOrder.id} created as Pending Payment.</h3><div class="qr-grid">${qrPanelCard('Order QR', 'Use this order QR at the cashier desk.', state.placedOrder)}${qrPanelCard('Pickup QR', 'Use this pickup QR when the order is ready.', { orderId: state.placedOrder.id, purpose: 'pickup', customer: state.placedOrder.customerName })}</div></div>` : ''}</div></section>`); }
function loginPage() { return shell(`<section class="center-wrap"><div class="card stack auth-card"><div class="eyebrow">Login</div><h1 class="title-lg">Access Wearables Studio.</h1><p class="muted">Demo accounts: admin@wearables.studio / password123, ${POS_EMAIL} / password123, mariam@wearables.studio / password123.</p><div class="notice">The POS account is the shared in-store tablet host. Customers interact through QR-linked sub-sessions on marketplace, design studio, and checkout.</div><form data-form="login" class="stack"><input class="input" name="email" value="${POS_EMAIL}" required /><input class="input" type="password" name="password" value="password123" required /><button class="button">Login</button></form><p class="muted">Need a new account? <a href="/signup" data-link>Create one</a>.</p></div></section>`); }
function signupPage() { return shell(`<section class="center-wrap"><div class="card stack auth-card"><div class="eyebrow">Sign up</div><h1 class="title-lg">Create a customer or creator account.</h1><form data-form="signup" class="stack"><input class="input" name="name" placeholder="Name" required /><input class="input" name="email" placeholder="Email" required /><input class="input" type="password" name="password" placeholder="Password" required /><select class="select" name="role"><option value="customer">Customer</option><option value="creator">Creator</option></select><button class="button">Create Account</button></form><p class="muted">Already registered? <a href="/login" data-link>Login</a>.</p></div></section>`); }
function dashboardPage() {
  if (!canAccessAdmin()) return shell(`<section class="card stack"><div class="eyebrow">Restricted</div><h1 class="title-lg">Admin dashboard access required.</h1><p class="muted">Use the seeded admin account to update payment and production statuses.</p></section>`);
  return shell(`<section class="dashboard-layout"><aside class="card stack"><div class="eyebrow">Dashboard</div>${['Orders', 'Private Exports', 'QR Generator'].map((item) => `<div class="card compact-box">${item}</div>`).join('')}<div class="notice">Private design PNG exports are only surfaced here for admin review.</div></aside><div class="stack"><div class="card stack"><div><div class="eyebrow">Order management</div><h1 class="title-lg">Store control center</h1></div><div style="overflow:auto;"><table class="table"><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Payment</th><th>Created</th><th>Actions</th></tr></thead><tbody>${state.bootstrap.orders.map((order) => `<tr><td><strong>${order.id}</strong><div class="muted">${order.items.length} item(s)</div></td><td>${escapeHtml(order.customerName)}<div class="muted">${escapeHtml(order.phone)}</div></td><td><span class="tag">${escapeHtml(order.status)}</span></td><td><span class="tag">${escapeHtml(order.paymentStatus)}</span></td><td>${dateLabel(order.createdAt)}</td><td><div class="order-actions">${order.paymentStatus === 'Pending' ? `<button class="button" data-action="mark-status" data-order-id="${order.id}" data-status="Paid" data-payment="Paid">Mark as Paid</button>` : ''}${['Processing', 'Printed', 'Ready for Pickup', 'Completed'].map((status) => `<button class="button-ghost" data-action="mark-status" data-order-id="${order.id}" data-status="${status}">${status}</button>`).join('')}<button class="button-secondary" data-action="mark-status" data-order-id="${order.id}" data-status="Edits Requested">Request Edits</button><button class="button-ghost" data-action="mark-status" data-order-id="${order.id}" data-status="Cancelled">Cancel</button></div></td></tr>`).join('')}</tbody></table></div></div><div class="card stack"><div class="row"><div><div class="eyebrow">Private design exports</div><h3 class="section-title">Saved 4-surface PNG sets</h3></div><span class="tag">Admin only</span></div>${state.adminExports.length ? `<div class="export-grid">${state.adminExports.map((record) => `<article class="card stack"><div class="row"><strong>${record.id}</strong><span class="tag">${record.shirtColor}</span></div><div class="muted small">${dateLabel(record.createdAt)}</div><div class="export-thumb-grid">${SURFACES.map((surface) => `<img src="${record.pngs[surface.key]}" alt="${surface.label} export" class="export-thumb" />`).join('')}</div></article>`).join('')}</div>` : '<p class="muted">No private designer exports have been saved yet.</p>'}</div><div class="grid-2"><form data-form="dashboard-qr" class="card stack"><div class="eyebrow">QR Generator</div><select class="select" name="type"><option value="order">Order QR</option><option value="design">Design QR</option><option value="pickup">Pickup QR</option></select><input class="input" name="referenceId" value="ORD-1001" placeholder="Order ID or Design ID" /><button class="button">Generate QR</button></form><div class="card center-wrap stack"><div class="eyebrow">Generated QR</div>${state.generatedQr ? `<img class="qr-preview" src="${state.generatedQr.image}" alt="Generated QR" /><pre>${escapeHtml(state.generatedQr.data)}</pre>` : '<p class="muted">Generate a QR from an order or design reference.</p>'}</div></div></div></section>`);
}
function aboutPage() { return shell(`<section class="section"><div class="eyebrow">About</div><h1 class="title-lg">A luxury operating system for custom apparel retail.</h1><p class="muted">Wearables Studio is designed for store-first commerce: design online, pay physically, produce with cashier control, and retrieve with QR-based workflows.</p></section><section class="grid-2"><div class="card stack"><h3>Why in-store payment?</h3><p class="muted">It preserves a premium retail handoff, avoids online gateway complexity, and keeps fulfillment tightly controlled.</p></div><div class="card stack"><h3>Why QR everywhere?</h3><p class="muted">QR cards let the store move customers between browsing, uploads, checkout, and pickup with minimal friction on shared tablets and cashier terminals.</p></div></section>`); }
function notFoundPage() { return shell(`<section class="card stack center-wrap"><div class="eyebrow">404</div><h1 class="title-lg">Page not found.</h1><button class="button" data-action="go-home">Return Home</button></section>`); }
function route() {
  const path = state.currentPath;
  if (path === '/') return homePage();
  if (path === '/design') return designPage();
  if (path === '/creator-hub') return creatorHubPage();
  if (path === '/checkout') return checkoutPage();
  if (path === '/login') return loginPage();
  if (path === '/signup') return signupPage();
  if (path === '/dashboard') return dashboardPage();
  if (path === '/about') return aboutPage();
  if (path.startsWith('/product/')) return productPage(path.split('/')[2]);
  if (path.startsWith('/creator/')) return creatorPage(decodeURIComponent(path.split('/')[2]));
  return notFoundPage();
}
function render() { app.innerHTML = route(); }
(async function init() { await loadBootstrap(); if (state.currentPath === '/dashboard' && canAccessAdmin()) await ensureAdminExports(); render(); })();
