const POS_EMAIL = 'pos@wearables.studio';
const MODEL_VIEWS = [
  { key: 'front', label: 'Front View', imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80' },
  { key: 'back', label: 'Back View', imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1000&q=80' },
  { key: 'leftShoulder', label: 'Left Shoulder View', imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80' },
  { key: 'rightShoulder', label: 'Right Shoulder View', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80' }
];
const SURFACES = MODEL_VIEWS.map((view) => ({ key: view.key, label: view.label.replace(' View', ''), short: view.key === 'leftShoulder' ? 'LS' : view.key === 'rightShoulder' ? 'RS' : view.label[0] + view.label[1].toLowerCase() }));
const FONTS = ['Inter', 'Helvetica Neue', 'Arial', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Tahoma', 'Montserrat', 'Poppins', 'Playfair Display'];

const app = document.getElementById('app');
let dragOverlay = null;
let dragDesignLayer = null;
let drawState = null;
let scaleOverlay = null;

const state = {
  bootstrap: null,
  session: JSON.parse(localStorage.getItem('wearables-session') || 'null'),
  cart: JSON.parse(localStorage.getItem('wearables-cart') || '[]'),
  currentPath: window.location.pathname,
  adminExports: [],
  media: JSON.parse(localStorage.getItem('wearables-media') || '[]'),
  creatorMedia: JSON.parse(localStorage.getItem('wearables-creator-media') || '[]'),
  smartSystem: {
    mode: 'edit',
    activeView: 'front',
    overlaysVisible: true,
    modelImages: Object.fromEntries(MODEL_VIEWS.map((v) => [v.key, v.imageUrl])),
    mappings: {
      front: [],
      back: [],
      leftShoulder: [],
      rightShoulder: []
    }
  },
  designEditor: {
    activeSurface: 'front',
    shirtColor: 'black',
    toolMode: 'move',
    penColor: '#ff7a18',
    penSize: 4,
    penType: 'round',
    surfaces: {
      front: [{ id: 'front-text-1', label: 'Front Text A', type: 'text', content: 'Wearables', x: 50, y: 90, fontSize: 38, fontFamily: 'Inter', color: '#ffffff' }],
      back: [{ id: 'back-text-1', label: 'Back Text A', type: 'text', content: 'Studio', x: 50, y: 90, fontSize: 32, fontFamily: 'Inter', color: '#ffffff' }],
      leftShoulder: [{ id: 'ls-text-1', label: 'LS Text A', type: 'text', content: 'WS', x: 40, y: 50, fontSize: 24, fontFamily: 'Inter', color: '#ffffff' }],
      rightShoulder: [{ id: 'rs-text-1', label: 'RS Text A', type: 'text', content: '01', x: 40, y: 50, fontSize: 24, fontFamily: 'Inter', color: '#ffffff' }]
    },
    selectedIds: { front: 'front-text-1', back: 'back-text-1', leftShoulder: 'ls-text-1', rightShoulder: 'rs-text-1' }
  }
};

function persistSession() { localStorage.setItem('wearables-session', JSON.stringify(state.session)); }
function persistCart() { localStorage.setItem('wearables-cart', JSON.stringify(state.cart)); }
function persistMedia() { localStorage.setItem('wearables-media', JSON.stringify(state.media)); localStorage.setItem('wearables-creator-media', JSON.stringify(state.creatorMedia)); }
function api(url, options = {}) { return fetch(url, options).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Request failed'); return data; }); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function activeClass(path) { return state.currentPath === path ? 'active' : ''; }
function isPosMode() { return state.session?.email === POS_EMAIL; }
function canAccessAdmin() { return state.session?.role === 'admin' && state.session?.email !== POS_EMAIL; }
function canAccessSupport() { return state.session?.role === 'technical_support'; }
function currency(value) { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value); }

function roleLandingPath(user) {
  if (!user) return '/';
  if (user.role === 'technical_support') return '/support';
  if (user.role === 'admin' && user.email !== POS_EMAIL) return '/dashboard';
  return '/';
}
function canManageSmartSystem() { return canAccessSupport() && state.currentPath === '/support'; }
function selectedLayer() { const s = state.designEditor.activeSurface; return state.designEditor.surfaces[s].find((l) => l.id === state.designEditor.selectedIds[s]); }
function activeSurfaceLayers() { return state.designEditor.surfaces[state.designEditor.activeSurface]; }

function navigate(path) {
  history.pushState({}, '', path);
  state.currentPath = path;
  render();
}
window.addEventListener('popstate', () => { state.currentPath = window.location.pathname; render(); });

function surfaceImage(surfaceKey) {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 420, 420);
  const layers = state.designEditor.surfaces[surfaceKey];
  layers.forEach((layer) => {
    if (layer.type === 'text') {
      ctx.save();
      ctx.translate(layer.x || 0, layer.y || 0);
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
      ctx.fillStyle = layer.color || '#fff';
      ctx.font = `700 ${layer.fontSize || 32}px ${layer.fontFamily || 'Inter'}`;
      ctx.fillText(layer.content || '', 0, layer.fontSize || 32);
      ctx.restore();
    }
    if (layer.type === 'path') {
      ctx.beginPath();
      (layer.points || []).forEach((point, idx) => idx === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.strokeStyle = layer.color || '#fff';
      ctx.lineWidth = layer.size || 4;
      ctx.lineJoin = layer.penType || 'round';
      ctx.lineCap = layer.penType || 'round';
      ctx.stroke();
    }
  });
  return canvas.toDataURL('image/png');
}

async function loadBootstrap() { state.bootstrap = await api('/api/bootstrap'); }
async function ensureAdminExports() { if (!canAccessAdmin()) return; state.adminExports = (await api('/api/design-exports')).exports; }
async function loadPreviewConfig() {
  try {
    const configs = (await api('/api/preview-configs')).configs;
    const latest = configs[0];
    if (latest?.mappings) state.smartSystem = { ...state.smartSystem, ...latest, mode: state.smartSystem.mode, activeView: state.smartSystem.activeView, overlaysVisible: state.smartSystem.overlaysVisible };
  } catch { /* noop */ }
}

function addOverlay(region, image) {
  const list = state.smartSystem.mappings[region];
  const zone = list.find((item) => item.isZone);
  list.push({
    id: `${region}-${Date.now()}`,
    region,
    image,
    x: zone?.x ?? 22,
    y: zone?.y ?? 24,
    width: zone?.width ?? 32,
    height: zone?.height ?? 28,
    rotation: zone?.rotation ?? 0,
    isZone: false
  });
}

document.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-link]');
  if (link) { event.preventDefault(); navigate(link.getAttribute('href')); return; }
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'logout') { state.session = null; persistSession(); navigate('/'); return; }
  if (action === 'set-view') { state.smartSystem.activeView = btn.dataset.view; render(); return; }
  if (action === 'toggle-mode') { state.smartSystem.mode = state.smartSystem.mode === 'edit' ? 'preview' : 'edit'; render(); return; }
  if (action === 'toggle-overlays') { state.smartSystem.overlaysVisible = !state.smartSystem.overlaysVisible; render(); return; }
  if (action === 'add-text') {
    const k = state.designEditor.activeSurface;
    const suffix = state.designEditor.surfaces[k].length + 1;
    const id = `${k}-text-${Date.now()}`;
    state.designEditor.surfaces[k].push({ id, label: `${SURFACES.find((s) => s.key === k).short} Text ${String.fromCharCode(64 + suffix)}`, type: 'text', content: 'New Text', x: 48, y: 80, fontSize: 32, fontFamily: 'Inter', color: state.designEditor.shirtColor === 'black' ? '#ffffff' : '#111111' });
    state.designEditor.selectedIds[k] = id;
    render();
    return;
  }
  if (action === 'set-tool') { state.designEditor.toolMode = btn.dataset.tool; render(); return; }
  if (action === 'set-surface') { state.designEditor.activeSurface = btn.dataset.surface; render(); return; }
  if (action === 'pick-layer') { state.designEditor.selectedIds[state.designEditor.activeSurface] = btn.dataset.id; render(); return; }
  if (action === 'delete-layer') {
    const key = state.designEditor.activeSurface;
    state.designEditor.surfaces[key] = state.designEditor.surfaces[key].filter((layer) => layer.id !== btn.dataset.id);
    state.designEditor.selectedIds[key] = state.designEditor.surfaces[key][0]?.id || null;
    render();
    return;
  }
  if (action === 'layer-up' || action === 'layer-down') {
    const layers = activeSurfaceLayers();
    const idx = layers.findIndex((layer) => layer.id === btn.dataset.id);
    if (idx < 0) return;
    const delta = action === 'layer-up' ? -1 : 1;
    const next = idx + delta;
    if (next < 0 || next >= layers.length) return;
    [layers[idx], layers[next]] = [layers[next], layers[idx]];
    render();
    return;
  }
  if (action === 'preview-on-model') {
    addOverlay(state.smartSystem.activeView, surfaceImage(state.designEditor.activeSurface));
    render();
    return;
  }
  if (action === 'add-region') {
    const key = state.smartSystem.activeView;
    state.smartSystem.mappings[key].push({ id: `${key}-zone-${Date.now()}`, region: key, image: '', x: 20, y: 20, width: 35, height: 32, rotation: 0, isZone: true });
    render();
    return;
  }
  if (action === 'delete-overlay') {
    const list = state.smartSystem.mappings[state.smartSystem.activeView];
    state.smartSystem.mappings[state.smartSystem.activeView] = list.filter((m) => m.id !== btn.dataset.id);
    render();
    return;
  }
  if (action === 'save-mapping') {
    await api('/api/preview-configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId: 'active-design', modelImageId: state.smartSystem.activeView, mappings: state.smartSystem.mappings, modelImages: state.smartSystem.modelImages }) });
    alert('Preview mapping saved.');
    return;
  }
  if (action === 'save-site-config') {
    const payload = {
      price: Number(document.querySelector('[data-input="site-price"]')?.value || state.bootstrap.brand.price),
      commission: Number(document.querySelector('[data-input="site-commission"]')?.value || state.bootstrap.brand.commission),
      homepageSections: state.bootstrap.siteConfig.homepageSections,
      homepageImages: state.bootstrap.siteConfig.homepageImages
    };
    await api('/api/site-config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await loadBootstrap();
    render();
    return;
  }
  if (action === 'add-home-section') {
    state.bootstrap.siteConfig.homepageSections.push({ id: `sec-${Date.now()}`, title: 'New Section', body: 'Edit this text from technical support.' });
    render();
    return;
  }
  if (action === 'remove-media') { state.media = state.media.filter((item) => item.id !== btn.dataset.id); persistMedia(); render(); return; }
  if (action === 'remove-creator-media') { state.creatorMedia = state.creatorMedia.filter((item) => item.id !== btn.dataset.id); persistMedia(); render(); return; }
  if (action === 'add-cart-design') {
    const design = state.bootstrap.designs.find((item) => item.id === btn.dataset.id);
    if (!design) return;
    const existing = state.cart.find((item) => item.designId === design.id);
    if (existing) existing.quantity += 1;
    else state.cart.push({ designId: design.id, designTitle: design.title, creatorId: design.creatorId, creatorName: design.creatorName, quantity: 1, price: design.price });
    persistCart();
    navigate('/checkout');
    return;
  }
});

document.addEventListener('input', (event) => {
  const t = event.target;
  if (!(t instanceof HTMLElement)) return;
  const layer = selectedLayer();
  let changed = false;
  if (layer && t.matches('[data-input="layer-content"]')) { layer.content = t.value; changed = true; }
  if (layer && t.matches('[data-input="layer-font"]')) { layer.fontFamily = t.value; changed = true; }
  if (layer && t.matches('[data-input="layer-size"]')) { layer.fontSize = Number(t.value); changed = true; }
  if (layer && t.matches('[data-input="layer-width"]')) { layer.width = Number(t.value); changed = true; }
  if (layer && t.matches('[data-input="layer-height"]')) { layer.height = Number(t.value); changed = true; }
  if (layer && t.matches('[data-input="layer-rotation"]')) { layer.rotation = Number(t.value); changed = true; }
  if (layer && t.matches('[data-input="layer-color"]')) { layer.color = t.value; changed = true; }
  if (t.matches('[data-input="tool-pen-color"]')) { state.designEditor.penColor = t.value; changed = true; }
  if (t.matches('[data-input="tool-pen-size"]')) { state.designEditor.penSize = Number(t.value); changed = true; }
  if (t.matches('[data-input="tool-pen-type"]')) { state.designEditor.penType = t.value; changed = true; }
  if (t.matches('[data-input="home-section-title"]')) {
    const section = state.bootstrap.siteConfig.homepageSections.find((item) => item.id === t.dataset.id);
    if (section) { section.title = t.value; changed = true; }
  }
  if (t.matches('[data-input="home-section-body"]')) {
    const section = state.bootstrap.siteConfig.homepageSections.find((item) => item.id === t.dataset.id);
    if (section) { section.body = t.value; changed = true; }
  }

  if (t.matches('[data-input="overlay-x"]')) { updateOverlayField(t, 'x'); changed = true; }
  if (t.matches('[data-input="overlay-y"]')) { updateOverlayField(t, 'y'); changed = true; }
  if (t.matches('[data-input="overlay-width"]')) { updateOverlayField(t, 'width'); changed = true; }
  if (t.matches('[data-input="overlay-height"]')) { updateOverlayField(t, 'height'); changed = true; }
  if (t.matches('[data-input="overlay-rotation"]')) { updateOverlayField(t, 'rotation'); changed = true; }
  if (changed) render();
});

function updateOverlayField(input, key) {
  const target = state.smartSystem.mappings[state.smartSystem.activeView].find((m) => m.id === input.dataset.id);
  if (!target) return;
  target[key] = Number(input.value);
}

document.addEventListener('change', (event) => {
  const t = event.target;
  if (!(t instanceof HTMLElement)) return;

  if (t.matches('[data-upload="support-media"]')) return handleUpload(t, 'support');
  if (t.matches('[data-upload="home-image"]')) {
    const file = t.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.bootstrap.siteConfig.homepageImages.unshift(String(reader.result));
      render();
    };
    reader.readAsDataURL(file);
    return;
  }
  if (t.matches('[data-upload="creator-media"]')) return handleUpload(t, 'creator');
  if (t.matches('[data-upload="design-image"]')) {
    const file = t.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const key = state.designEditor.activeSurface;
      const id = `${key}-image-${Date.now()}`;
      state.designEditor.surfaces[key].push({ id, label: `${SURFACES.find((s) => s.key === key).short} Image ${String.fromCharCode(65 + state.designEditor.surfaces[key].length)}`, type: 'image', src: String(reader.result), x: 80, y: 90, width: 140, height: 140, rotation: 0 });
      state.designEditor.selectedIds[key] = id;
      render();
    };
    reader.readAsDataURL(file);
    return;
  }
  if (t.matches('[data-upload="model-image"]')) return handleModelUpload(t);
  if (t.matches('[data-upload="overlay-image"]')) {
    const file = t.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return alert('Only image files up to 5MB are allowed.');
    const reader = new FileReader();
    reader.onload = () => { addOverlay(state.smartSystem.activeView, String(reader.result)); render(); };
    reader.readAsDataURL(file);
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (form.matches('[data-form="login"]')) {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form));
      if (!payload.email || !String(payload.email).includes('@')) return alert('Enter a valid email.');
      const data = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      state.session = data.user;
      persistSession();
      navigate(roleLandingPath(data.user));
    } catch (error) { alert(error.message); }
    return;
  }

  if (form.matches('[data-form="signup"]')) {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      state.session = data.user;
      persistSession();
      navigate('/');
    } catch (error) { alert(error.message); }
  }
  if (form.matches('[data-form="checkout"]')) {
    event.preventDefault();
    if (!state.cart.length) return alert('Cart is empty.');
    try {
      const payload = Object.fromEntries(new FormData(form));
      const items = state.cart.map((item) => ({ ...item, quantity: Number(item.quantity || 1), price: Number(item.price || state.bootstrap.brand.price), unitPrice: Number(item.price || state.bootstrap.brand.price) }));
      const order = await api('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.session?.id || 'guest',
          customerName: payload.customerName || state.session?.name || 'Guest',
          phone: payload.phone || '',
          notes: `Shipping:${payload.shippingAddress || 'N/A'}`,
          items
        })
      });
      state.cart = [];
      persistCart();
      alert(`Order placed. Creator credits added: EGP ${order.order.creatorCredits || 0}.`);
      await loadBootstrap();
      render();
    } catch (error) { alert(error.message); }
    return;
  }
});


document.addEventListener('dragover', (event) => {
  const zone = event.target.closest('[data-dropzone]');
  if (!zone) return;
  event.preventDefault();
  zone.classList.add('dragging');
});
document.addEventListener('dragleave', (event) => {
  const zone = event.target.closest('[data-dropzone]');
  if (!zone) return;
  zone.classList.remove('dragging');
});
document.addEventListener('drop', (event) => {
  const zone = event.target.closest('[data-dropzone]');
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove('dragging');
  const files = [...(event.dataTransfer?.files || [])];
  if (zone.dataset.dropzone === 'support') {
    const fakeInput = { files };
    handleUpload(fakeInput, 'support');
  }
  if (zone.dataset.dropzone === 'creator') {
    const fakeInput = { files };
    handleUpload(fakeInput, 'creator');
  }
});

document.addEventListener('pointerdown', (event) => {
  const scaleNode = event.target.closest('[data-scale-id]');
  if (scaleNode && canManageSmartSystem()) {
    const stage = scaleNode.closest('[data-smart-stage]');
    scaleOverlay = { id: scaleNode.dataset.scaleId, rect: stage.getBoundingClientRect() };
    return;
  }
  const canvas = event.target.closest('[data-design-canvas]');
  const layerNode = event.target.closest('[data-design-layer]');
  if (canvas) {
    const canvasRect = canvas.getBoundingClientRect();
    if (state.designEditor.toolMode === 'draw') {
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;
      const key = state.designEditor.activeSurface;
      const id = `${key}-path-${Date.now()}`;
      const path = { id, label: `${SURFACES.find((s) => s.key === key).short} Draw ${String.fromCharCode(65 + state.designEditor.surfaces[key].length)}`, type: 'path', points: [{ x, y }], color: state.designEditor.penColor, size: state.designEditor.penSize, penType: state.designEditor.penType };
      state.designEditor.surfaces[key].push(path);
      state.designEditor.selectedIds[key] = id;
      drawState = { id, rect: canvasRect };
      render();
      return;
    }
    if (layerNode) {
      const id = layerNode.dataset.designLayer;
      const layer = activeSurfaceLayers().find((entry) => entry.id === id);
      if (!layer) return;
      state.designEditor.selectedIds[state.designEditor.activeSurface] = id;
      dragDesignLayer = {
        id,
        rect: canvasRect,
        offsetX: event.clientX - canvasRect.left - (layer.x || 0),
        offsetY: event.clientY - canvasRect.top - (layer.y || 0)
      };
      render();
      return;
    }
  }

  const node = event.target.closest('[data-overlay-id]');
  if (!node || state.smartSystem.mode !== 'edit' || !canManageSmartSystem()) return;
  const stage = node.closest('[data-smart-stage]');
  const rect = stage.getBoundingClientRect();
  dragOverlay = {
    id: node.dataset.overlayId,
    rect,
    offsetX: event.clientX - node.getBoundingClientRect().left,
    offsetY: event.clientY - node.getBoundingClientRect().top
  };
});

document.addEventListener('pointermove', (event) => {
  if (scaleOverlay) {
    const list = state.smartSystem.mappings[state.smartSystem.activeView];
    const item = list.find((entry) => entry.id === scaleOverlay.id);
    if (!item) return;
    const x = ((event.clientX - scaleOverlay.rect.left) / scaleOverlay.rect.width) * 100;
    const y = ((event.clientY - scaleOverlay.rect.top) / scaleOverlay.rect.height) * 100;
    item.width = Math.max(5, Math.min(95, x - item.x));
    item.height = Math.max(5, Math.min(95, y - item.y));
    render();
    return;
  }
  if (drawState) {
    const path = activeSurfaceLayers().find((layer) => layer.id === drawState.id);
    if (!path) return;
    path.points.push({ x: event.clientX - drawState.rect.left, y: event.clientY - drawState.rect.top });
    render();
    return;
  }
  if (dragDesignLayer) {
    const layer = activeSurfaceLayers().find((entry) => entry.id === dragDesignLayer.id);
    if (!layer) return;
    layer.x = Math.max(0, event.clientX - dragDesignLayer.rect.left - dragDesignLayer.offsetX);
    layer.y = Math.max(0, event.clientY - dragDesignLayer.rect.top - dragDesignLayer.offsetY);
    render();
    return;
  }
  if (!dragOverlay) return;
  const list = state.smartSystem.mappings[state.smartSystem.activeView];
  const item = list.find((x) => x.id === dragOverlay.id);
  if (!item) return;
  const px = event.clientX - dragOverlay.rect.left - dragOverlay.offsetX;
  const py = event.clientY - dragOverlay.rect.top - dragOverlay.offsetY;
  item.x = Math.max(0, Math.min(100 - item.width, (px / dragOverlay.rect.width) * 100));
  item.y = Math.max(0, Math.min(100 - item.height, (py / dragOverlay.rect.height) * 100));
  render();
});

document.addEventListener('pointerup', () => { dragOverlay = null; dragDesignLayer = null; drawState = null; scaleOverlay = null; });

function handleUpload(input, type) {
  const files = [...(input.files || [])];
  files.forEach((file) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const item = { id: `${type}-${Date.now()}-${Math.random()}`, name: file.name, size: file.size, type: file.type, tag: type === 'support' ? 'ops' : 'creator', url: String(reader.result), uploadedAt: new Date().toISOString() };
      if (type === 'support') state.media.unshift(item);
      else state.creatorMedia.unshift(item);
      persistMedia();
      render();
    };
    reader.readAsDataURL(file);
  });
}

function handleModelUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return alert('Model image must be an image under 8MB.');
  const reader = new FileReader();
  reader.onload = () => {
    state.smartSystem.modelImages[state.smartSystem.activeView] = String(reader.result);
    render();
  };
  reader.readAsDataURL(file);
}

function renderDesignLayer(layer, selected) {
  if (layer.type === 'text') {
    return `<div class="design-layer ${selected ? 'selected' : ''}" data-design-layer="${layer.id}" style="left:${layer.x || 0}px;top:${layer.y || 0}px;color:${layer.color || '#fff'};font-size:${layer.fontSize || 32}px;font-family:${layer.fontFamily || 'Inter'};transform:rotate(${layer.rotation || 0}deg);">${escapeHtml(layer.content || '')}</div>`;
  }
  if (layer.type === 'image') {
    return `<img class="design-layer ${selected ? 'selected' : ''}" data-design-layer="${layer.id}" src="${layer.src}" alt="${escapeHtml(layer.label)}" style="left:${layer.x || 0}px;top:${layer.y || 0}px;width:${layer.width || 140}px;height:${layer.height || 140}px;transform:rotate(${layer.rotation || 0}deg);" />`;
  }
  if (layer.type === 'path') {
    return `<svg class="design-path-layer ${selected ? 'selected' : ''}" data-design-layer="${layer.id}" style="left:0;top:0;"><polyline points="${(layer.points || []).map((pt) => `${pt.x},${pt.y}`).join(' ')}" fill="none" stroke="${layer.color || '#fff'}" stroke-width="${layer.size || 4}" stroke-linecap="${layer.penType || 'round'}" stroke-linejoin="${layer.penType || 'round'}"></polyline></svg>`;
  }
  return '';
}

function renderSmartSystem(prefix = 'support') {
  const view = state.smartSystem.activeView;
  const overlays = state.smartSystem.mappings[view];
  const supportMode = prefix === 'support' && canManageSmartSystem();
  const editable = supportMode && state.smartSystem.mode === 'edit';
  if (!supportMode) {
    return `<section class="card stack"><div class="row"><div><div class="eyebrow">2D Model Alignment Engine</div><h3 class="section-title">Live mapped preview</h3></div><span class="tag">Live</span></div><div class="toolbar">${MODEL_VIEWS.map((v) => `<button class="tab ${view === v.key ? 'active' : ''}" data-action="set-view" data-view="${v.key}">${v.label}</button>`).join('')}</div><div class="smart-stage-wrap"><div class="smart-stage" data-smart-stage><img class="smart-model-image" src="${state.smartSystem.modelImages[view]}" alt="${view} model" />${state.smartSystem.overlaysVisible ? overlays.map((m) => `<div class="overlay-box locked ${m.isZone ? 'zone-box' : ''}" data-overlay-id="${m.id}" style="left:${m.x}%;top:${m.y}%;width:${m.width}%;height:${m.height}%;transform:rotate(${m.rotation}deg);">${m.image ? `<img src="${m.image}" alt="${m.region}" />` : ''}</div>`).join('') : ''}</div></div></section>`;
  }
  return `<section class="card stack"><div class="row"><div><div class="eyebrow">Image Preview Smart System</div><h3 class="section-title">2D Model Alignment Engine</h3></div><span class="tag">${supportMode ? state.smartSystem.mode.toUpperCase() : 'LIVE PREVIEW'}</span></div>
  <div class="toolbar">${MODEL_VIEWS.map((v) => `<button class="tab ${view === v.key ? 'active' : ''}" data-action="set-view" data-view="${v.key}">${v.label}</button>`).join('')}</div>
  <div class="toolbar"><button class="button-ghost" data-action="toggle-mode">${state.smartSystem.mode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}</button><button class="button-ghost" data-action="toggle-overlays">${state.smartSystem.overlaysVisible ? 'Hide Overlays' : 'Show Overlays'}</button><button class="button-ghost" data-action="add-region">Add Region Zone</button><label class="button-ghost">Upload Model Image<input type="file" hidden accept="image/*" data-upload="model-image" /></label><label class="button">Upload Design PNG<input type="file" hidden accept="image/png,image/*" data-upload="overlay-image" /></label><button class="button-secondary" data-action="save-mapping">Save Mapping</button></div>
  <div class="smart-grid"><div class="smart-stage-wrap"><div class="smart-stage" data-smart-stage><img class="smart-model-image" src="${state.smartSystem.modelImages[view]}" alt="${view} model" />${state.smartSystem.overlaysVisible ? overlays.map((m) => `<div class="overlay-box ${editable ? '' : 'locked'} ${m.isZone ? 'zone-box' : ''}" data-overlay-id="${m.id}" style="left:${m.x}%;top:${m.y}%;width:${m.width}%;height:${m.height}%;transform:rotate(${m.rotation}deg);">${m.image ? `<img src="${m.image}" alt="${m.region}" />` : ''}<span class="overlay-label">${m.isZone ? 'Zone' : m.region}</span>${editable ? `<span class="scale-handle" data-scale-id="${m.id}"></span>` : ''}</div>`).join('') : ''}</div></div>
  <div class="stack">${overlays.length ? overlays.map((m) => supportMode ? `<article class="support-item stack"><div class="row"><strong>${m.isZone ? 'Zone' : m.region}</strong><button class="button-ghost" data-action="delete-overlay" data-id="${m.id}">Delete</button></div><div class="grid-2"><label>X<input type="range" min="0" max="100" value="${m.x}" data-input="overlay-x" data-id="${m.id}" /></label><label>Y<input type="range" min="0" max="100" value="${m.y}" data-input="overlay-y" data-id="${m.id}" /></label><label>Width<input type="range" min="5" max="100" value="${m.width}" data-input="overlay-width" data-id="${m.id}" /></label><label>Height<input type="range" min="5" max="100" value="${m.height}" data-input="overlay-height" data-id="${m.id}" /></label></div><label>Rotate<input type="range" min="-180" max="180" value="${m.rotation}" data-input="overlay-rotation" data-id="${m.id}" /></label></article>` : `<article class="support-item"><strong>${m.isZone ? 'Mapped zone' : 'Design placement'}</strong><div class="muted small">x:${Math.round(m.x)} y:${Math.round(m.y)} w:${Math.round(m.width)} h:${Math.round(m.height)} rot:${Math.round(m.rotation)}°</div></article>`).join('') : '<p class="muted">No mappings yet for this view.</p>'}</div></div></section>`;
}

function shell(content) {
  const navLinks = [['/', 'Home'], ['/discover', 'Discover'], ['/design', 'Design Studio'], ['/creator-hub', 'Creator Hub'], ['/checkout', 'Checkout'], ['/about', 'About']];
  if (canAccessSupport()) navLinks.push(['/support', 'Technical Support']);
  if (canAccessAdmin()) navLinks.push(['/dashboard', 'Admin Dashboard']);
  return `<div class="shell"><header class="header"><div class="container header-inner"><a href="/" data-link class="brand">Wearables Studio</a><nav class="nav">${navLinks.map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}</nav><div class="actions"><a href="/checkout" data-link class="button-ghost">Cart (${state.cart.length})</a>${state.session ? `<button class="button">${escapeHtml(state.session.name.split(' ')[0])}</button><button class="button-ghost" data-action="logout">Logout</button>` : '<a href="/login" data-link class="button">Login</a>'}</div></div></header><main class="page container">${content}</main><footer class="footer"><div class="container footer-inner"><strong>Wearables Studio</strong><span class="muted">Premium custom apparel</span></div></footer><nav class="mobile-nav">${navLinks.map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}</nav></div>`;
}

function homePage() {
  const recommendations = [
    ['Monochrome Signature', 'Minimal black/white compositions with bold typography.'],
    ['Editorial Beige', 'Neutral tones with premium serif headlines.'],
    ['Street Utility', 'Strong shoulder marks with compact chest logos.']
  ];
  const cfg = state.bootstrap.siteConfig || { homepageImages: [], homepageSections: [] };
  return shell(`<section class="hero card soft"><div class="stack"><span class="badge">Wearables Studio · Premium Identity</span><h1 class="title-xl">Your premium custom-wear platform with creator-led brand storytelling.</h1><p class="muted">Live price: ${currency(state.bootstrap.brand.price)} · Creator credit: ${currency(state.bootstrap.brand.commission)} per creator-linked shirt.</p><div class="toolbar"><a href="/discover" data-link class="button">Discover Designs</a><a href="/design" data-link class="button-ghost">Open Studio</a></div><div class="media-grid">${cfg.homepageImages.map((src, i) => `<img class="media-thumb" src="${src}" alt="Homepage ${i + 1}" />`).join('')}</div><div class="grid-3">${recommendations.map(([title, desc]) => `<article class="support-item"><strong>${title}</strong><p class="muted small">${desc}</p></article>`).join('')}</div></div></section><section class="grid-2">${cfg.homepageSections.map((section) => `<article class="card"><div class="eyebrow">Site Section</div><h3 class="section-title">${escapeHtml(section.title)}</h3><p class="muted">${escapeHtml(section.body)}</p></article>`).join('')}</section>`);
}

function discoverPage() {
  const frontMappings = state.smartSystem.mappings.front || [];
  const mappedZone = frontMappings.find((entry) => entry.isZone) || { x: 22, y: 24, width: 32, height: 28, rotation: 0 };
  const model = state.smartSystem.modelImages.front || MODEL_VIEWS[0].imageUrl;
  return shell(`<section class="section"><div class="eyebrow">Discover</div><h1 class="title-lg">Creator marketplace with mapped model previews.</h1><p class="muted">Support-defined map zones are used to preview creator assets on the model image.</p></section><section class="media-grid">${state.bootstrap.designs.map((design) => `<article class="card stack"><div class="smart-stage"><img class="smart-model-image" src="${model}" alt="Mapped model" /><div class="overlay-box locked" style="left:${mappedZone.x}%;top:${mappedZone.y}%;width:${mappedZone.width}%;height:${mappedZone.height}%;transform:rotate(${mappedZone.rotation}deg);"><img src="${design.pngs?.front || design.imageUrl}" alt="${escapeHtml(design.title)}" /></div></div><div><strong>${escapeHtml(design.title)}</strong><div class="muted small">by ${escapeHtml(design.creatorName || 'Creator')}</div></div><div class="row"><span class="tag">${currency(design.price || state.bootstrap.brand.price)}</span><button class="button" data-action="add-cart-design" data-id="${design.id}">Order</button></div></article>`).join('')}</section>`);
}

function designPage() {
  const layer = selectedLayer();
  const layers = activeSurfaceLayers();
  return shell(`<section class="section"><div class="eyebrow">Design Studio</div><h1 class="title-lg">Canvas editor with drag, rotate, scale, and layered structure.</h1><p class="muted">Use the canvas to drag-drop layers with pointer gestures. X/Y controls are removed in favor of direct manipulation.</p></section><section class="designer-board"><div class="card stack"><div class="tabs">${SURFACES.map((s) => `<button class="tab ${state.designEditor.activeSurface === s.key ? 'active' : ''}" data-action="set-surface" data-surface="${s.key}">${s.label}</button>`).join('')}</div><div class="toolbar"><button class="button" data-action="add-text">Add Text</button><label class="button-ghost">Add Photo<input type="file" accept="image/*" hidden data-upload="design-image" /></label><button class="button-ghost ${state.designEditor.toolMode === 'move' ? 'selected-chip' : ''}" data-action="set-tool" data-tool="move">Move</button><button class="button-ghost ${state.designEditor.toolMode === 'draw' ? 'selected-chip' : ''}" data-action="set-tool" data-tool="draw">Freehand</button><button class="button-secondary" data-action="preview-on-model">Preview on Model</button></div><div class="canvas-panel ${state.designEditor.shirtColor}" data-design-canvas>${layers.map((item) => renderDesignLayer(item, item.id === state.designEditor.selectedIds[state.designEditor.activeSurface])).join('')}</div><div class="card stack"><div class="row"><strong>Layer Structure</strong><span class="muted small">${layers.length} layer(s)</span></div>${layers.map((item) => `<div class="row layer-row"><button class="button-ghost ${item.id === state.designEditor.selectedIds[state.designEditor.activeSurface] ? 'selected-chip' : ''}" data-action="pick-layer" data-id="${item.id}">${escapeHtml(item.label)}</button><div class="toolbar"><button class="button-ghost" data-action="layer-up" data-id="${item.id}">↑</button><button class="button-ghost" data-action="layer-down" data-id="${item.id}">↓</button><button class="button-ghost" data-action="delete-layer" data-id="${item.id}">Delete</button></div></div>`).join('') || '<p class="muted">No layers yet.</p>'}</div>${layer ? `<div class="grid-2"><label>Text<input class="input" data-input="layer-content" value="${escapeHtml(layer.content || '')}" ${layer.type === 'text' ? '' : 'disabled'} /></label><label>Font<select class="select" data-input="layer-font" ${layer.type === 'text' ? '' : 'disabled'}>${FONTS.map((f) => `<option ${layer.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label><label>Font Size<input class="input" type="number" min="8" max="200" data-input="layer-size" value="${layer.fontSize || 32}" ${layer.type === 'text' ? '' : 'disabled'} /></label><label>Width<input class="input" type="number" min="20" max="500" data-input="layer-width" value="${layer.width || 140}" ${(layer.type === 'image') ? '' : 'disabled'} /></label><label>Height<input class="input" type="number" min="20" max="500" data-input="layer-height" value="${layer.height || 140}" ${(layer.type === 'image') ? '' : 'disabled'} /></label><label>Rotation °<input class="input" type="number" min="-180" max="180" data-input="layer-rotation" value="${layer.rotation || 0}" ${layer.type === 'path' ? 'disabled' : ''} /></label><label>Color<input class="input color-input" type="color" data-input="layer-color" value="${layer.color || '#ffffff'}" ${layer.type === 'path' || layer.type === 'text' ? '' : 'disabled'} /></label></div>` : ''}<div class="grid-3"><label>Pen Color<input class="input color-input" type="color" data-input="tool-pen-color" value="${state.designEditor.penColor}" /></label><label>Pen Size<input class="input" type="number" min="1" max="32" data-input="tool-pen-size" value="${state.designEditor.penSize}" /></label><label>Pen Type<select class="select" data-input="tool-pen-type"><option value="round" ${state.designEditor.penType === 'round' ? 'selected' : ''}>Round</option><option value="square" ${state.designEditor.penType === 'square' ? 'selected' : ''}>Square</option></select></label></div></div></div><div class="stack">${renderSmartSystem('designer')}</div></section>`);
}

function creatorHubPage() {
  if (!state.session || state.session.role !== 'creator') {
    return shell(`<section class="section"><div class="eyebrow">Creator Program</div><h1 class="title-lg">Become a creator partner.</h1><p class="muted">Join Wearables Studio and earn EGP ${state.bootstrap.brand.commission} for every shirt sold from your published designs.</p></section><section class="grid-2"><article class="card"><h3 class="section-title">Why join?</h3><p class="muted">Get your own dashboard, performance analytics, and premium storefront exposure.</p></article><article class="card"><h3 class="section-title">How it works</h3><p class="muted">Create designs, publish to discover, and automatically earn per order without referral codes.</p><a class="button" href="/signup" data-link>Create Creator Account</a></article></section>`);
  }
  const myDesigns = state.bootstrap.designs.filter((design) => design.creatorId === state.session.id);
  const totals = myDesigns.reduce((acc, design) => {
    acc.sales += design.salesCount || 0;
    acc.likes += design.likes || 0;
    acc.comments += design.comments || 0;
    return acc;
  }, { sales: 0, likes: 0, comments: 0 });
  return shell(`<section class="section"><div class="eyebrow">Creator Hub</div><h1 class="title-lg">Creator dashboard and performance overview.</h1><p class="muted">Track your designs and engagement in one place.</p></section><section class="grid-3"><article class="card"><div class="eyebrow">Sales</div><h3>${totals.sales}</h3></article><article class="card"><div class="eyebrow">Likes</div><h3>${totals.likes}</h3></article><article class="card"><div class="eyebrow">Comments</div><h3>${totals.comments}</h3></article></section><section class="card stack"><h3 class="section-title">My Designs</h3>${myDesigns.length ? myDesigns.map((design) => `<article class="support-item row"><div><strong>${escapeHtml(design.title)}</strong><div class="muted small">${design.salesCount || 0} sales · ${design.likes || 0} likes · ${design.comments || 0} comments</div></div><span class="tag">${currency(design.price || state.bootstrap.brand.price)}</span></article>`).join('') : '<p class="muted">No designs yet.</p>'}</section>`);
}

function checkoutPage() {
  const total = state.cart.reduce((sum, item) => sum + Number(item.price || state.bootstrap.brand.price) * Number(item.quantity || 1), 0);
  return shell(`<section class="section"><div class="eyebrow">Checkout</div><h1 class="title-lg">Secure Checkout (EGP)</h1><p class="muted">Creator linkage is automatic from the selected discover design.</p></section><section class="grid-2"><div class="card stack"><h3 class="section-title">Cart</h3>${state.cart.length ? state.cart.map((item) => `<div class="support-item row"><div><span>${escapeHtml(item.designTitle || item.designId || 'Custom Design')} x${item.quantity || 1}</span><div class="muted small">Creator: ${(item.creatorName || 'In-house').split(' ')[0]}</div></div><strong>${currency(Number(item.price || state.bootstrap.brand.price) * Number(item.quantity || 1))}</strong></div>`).join('') : '<p class="muted">Your cart is empty.</p>'}<div class="row"><strong>Total</strong><strong>${currency(total)}</strong></div></div><form class="card stack" data-form="checkout"><label>Name<input class="input" name="customerName" value="${escapeHtml(state.session?.name || '')}" required /></label><label>Phone<input class="input" name="phone" placeholder="+20 ..." required /></label><label>Shipping Address<textarea class="input" name="shippingAddress" rows="4" placeholder="Building, street, city, governorate" required></textarea></label><div class="notice">For creator-linked designs, EGP ${state.bootstrap.brand.commission} credit is added automatically to the design creator.</div><button class="button" ${state.cart.length ? '' : 'disabled'}>Place Order</button></form></section>`);
}

function loginPage() {
  return shell(`<section class="center-wrap"><div class="card stack auth-card"><div class="eyebrow">Login</div><h1 class="title-lg">Access Wearables Studio.</h1><p class="muted">Any registered email can log in. No default email is forced.</p><form data-form="login" class="stack"><input class="input" name="email" type="email" placeholder="Email" autocomplete="email" required /><input class="input" name="password" type="password" placeholder="Password" autocomplete="current-password" required /><button class="button">Login</button></form></div></section>`);
}

function signupPage() {
  return shell(`<section class="center-wrap"><div class="card stack auth-card"><h1 class="title-lg">Create account</h1><form data-form="signup" class="stack"><input class="input" name="name" placeholder="Name" required /><input class="input" type="email" name="email" placeholder="Email" required /><input class="input" type="password" name="password" placeholder="Password" required /><select class="select" name="role"><option value="customer">Customer</option><option value="creator">Creator</option></select><button class="button">Sign up</button></form></div></section>`);
}

function dashboardPage() {
  if (!canAccessAdmin()) return shell('<section class="card"><h1 class="title-lg">Admin access required</h1></section>');
  const orders = state.bootstrap.orders || [];
  const revenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  const cost = orders.reduce((sum, order) => sum + (order.items || []).reduce((acc, item) => acc + Number(item.quantity || 1) * 275, 0), 0);
  const refunds = orders.filter((order) => order.status === 'Refunded').length;
  const tickets = state.bootstrap.siteConfig?.supportTickets || [];
  return shell(`<section class="section"><div class="eyebrow">Admin Dashboard</div><h1 class="title-lg">Operations, finance, and support governance.</h1></section><section class="grid-3"><article class="card"><div class="eyebrow">Revenue</div><h3>${currency(revenue)}</h3></article><article class="card"><div class="eyebrow">Estimated Cost</div><h3>${currency(cost)}</h3></article><article class="card"><div class="eyebrow">Net Profit</div><h3>${currency(revenue - cost)}</h3></article></section><section class="card stack"><h3 class="section-title">Order Control</h3>${orders.map((order) => `<div class="support-item row"><div><strong>${order.id}</strong><div class="muted small">${order.customerName} · ${order.status}</div></div><strong>${currency(order.totalPrice || 0)}</strong></div>`).join('') || '<p class="muted">No orders yet.</p>'}<div class="muted small">Refunded orders: ${refunds}</div></section><section class="card stack"><h3 class="section-title">Support Complaints</h3>${(state.bootstrap.supportTickets || []).map((ticket) => `<div class="support-item row"><span>${ticket.subject}</span><span class="tag">${ticket.status}</span></div>`).join('') || '<p class="muted">No complaints in queue.</p>'}</section>`);
}

function supportPage() {
  if (!canAccessSupport()) return shell('<section class="card"><h1 class="title-lg">Technical Support access required</h1></section>');
  const cfg = state.bootstrap.siteConfig || { homepageSections: [], homepageImages: [] };
  return shell(`<section class="section"><div class="eyebrow">Technical Support Dashboard</div><h1 class="title-lg">Operations, site controls, and Smart Mapping</h1><p class="muted">Mappings configured here are used directly by the Discover page model previews and creator design showcases.</p></section><section class="card stack"><div class="row"><h3 class="section-title">Site Controls</h3><button class="button-secondary" data-action="save-site-config">Save Website Settings</button></div><div class="grid-2"><label>Item Price (EGP)<input class="input" type="number" data-input="site-price" value="${state.bootstrap.brand.price}" /></label><label>Creator Commission (EGP)<input class="input" type="number" data-input="site-commission" value="${state.bootstrap.brand.commission}" /></label></div><div class="toolbar"><label class="button">Upload Homepage Image<input hidden type="file" accept="image/*" data-upload="home-image" /></label><button class="button-ghost" data-action="add-home-section">Add Homepage Section</button></div><div class="media-grid">${cfg.homepageImages.map((src) => `<img class="media-thumb" src="${src}" alt="Home media" />`).join('')}</div>${cfg.homepageSections.map((section) => `<article class="support-item stack"><input class="input" data-input="home-section-title" data-id="${section.id}" value="${escapeHtml(section.title)}" /><textarea class="input" data-input="home-section-body" data-id="${section.id}" rows="3">${escapeHtml(section.body)}</textarea></article>`).join('')}</section><section class="card stack"><div class="toolbar"><label class="button">Upload Support Images<input hidden type="file" accept="image/*" multiple data-upload="support-media" /></label><span class="muted">Image validation: type image/*, max 5MB.</span></div><div class="dropzone" data-dropzone="support">Drag & drop support images here or use upload button.</div><div class="media-grid">${state.media.length ? state.media.map((item) => `<article class="support-item stack"><img src="${item.url}" alt="${escapeHtml(item.name)}" class="media-thumb" /><div><strong>${escapeHtml(item.name)}</strong><div class="muted small">Tag: ${item.tag}</div></div><button class="button-ghost" data-action="remove-media" data-id="${item.id}">Delete</button></article>`).join('') : '<p class="muted">No support media uploaded yet.</p>'}</div></section>${renderSmartSystem('support')}`);
}

function aboutPage() { return shell('<section class="section"><div class="eyebrow">About Wearables Studio</div><h1 class="title-lg">A tech-driven personalization company modernizing the apparel industry.</h1><p class="muted">We combine design technology, creator economy workflows, and mapped visual previews so customers can personalize garments confidently. Our mission is to make premium custom fashion scalable, fast, and creator-first while preserving quality and operational control.</p></section><section class="grid-3"><article class="card"><h3 class="section-title">Personalization Engine</h3><p class="muted">Real-time editing, layered assets, and mapped model previews.</p></article><article class="card"><h3 class="section-title">Creator Economy</h3><p class="muted">Transparent earnings and automated creator credit per sold shirt.</p></article><article class="card"><h3 class="section-title">Operational Control</h3><p class="muted">Admin and support dashboards to manage production, site visuals, and customer issues.</p></article></section>'); }
function notFoundPage() { return shell('<section class="card"><h1 class="title-lg">404</h1></section>'); }

function route() {
  const p = state.currentPath;
  if (p === '/') return homePage();
  if (p === '/discover') return discoverPage();
  if (p === '/design') return designPage();
  if (p === '/creator-hub') return creatorHubPage();
  if (p === '/checkout') return checkoutPage();
  if (p === '/login') return loginPage();
  if (p === '/signup') return signupPage();
  if (p === '/dashboard') return dashboardPage();
  if (p === '/support') return supportPage();
  if (p === '/about') return aboutPage();
  return notFoundPage();
}

function render() { app.innerHTML = route(); }

(async function init() {
  await loadBootstrap();
  await ensureAdminExports();
  await loadPreviewConfig();
  if (state.currentPath === '/dashboard' && !canAccessAdmin()) state.currentPath = '/';
  if (state.currentPath === '/support' && !canAccessSupport()) state.currentPath = '/';
  if (state.currentPath === '/' && state.session) state.currentPath = roleLandingPath(state.session);
  render();
})();
