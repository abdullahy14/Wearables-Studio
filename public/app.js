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
function selectedLayer() { const s = state.designEditor.activeSurface; return state.designEditor.surfaces[s].find((l) => l.id === state.designEditor.selectedIds[s]); }

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
  state.designEditor.surfaces[surfaceKey].forEach((layer) => {
    if (layer.type === 'text') {
      ctx.fillStyle = layer.color;
      ctx.font = `700 ${layer.fontSize}px ${layer.fontFamily}`;
      ctx.fillText(layer.content, layer.x, layer.y + layer.fontSize);
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
  list.push({ id: `${region}-${Date.now()}`, region, image, x: 22, y: 24, width: 32, height: 28, rotation: 0, tag: region, scale: 1 });
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
  if (action === 'set-surface') { state.designEditor.activeSurface = btn.dataset.surface; render(); return; }
  if (action === 'pick-layer') { state.designEditor.selectedIds[state.designEditor.activeSurface] = btn.dataset.id; render(); return; }
  if (action === 'preview-on-model') {
    addOverlay(state.smartSystem.activeView, surfaceImage(state.designEditor.activeSurface));
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
  if (action === 'remove-media') { state.media = state.media.filter((item) => item.id !== btn.dataset.id); persistMedia(); render(); return; }
  if (action === 'remove-creator-media') { state.creatorMedia = state.creatorMedia.filter((item) => item.id !== btn.dataset.id); persistMedia(); render(); return; }
});

document.addEventListener('input', (event) => {
  const t = event.target;
  if (!(t instanceof HTMLElement)) return;
  const layer = selectedLayer();
  if (layer && t.matches('[data-input="layer-content"]')) layer.content = t.value;
  if (layer && t.matches('[data-input="layer-font"]')) layer.fontFamily = t.value;
  if (layer && t.matches('[data-input="layer-size"]')) layer.fontSize = Number(t.value);
  if (layer && t.matches('[data-input="layer-color"]')) layer.color = t.value;
  if (layer && t.matches('[data-input="layer-x"]')) layer.x = Number(t.value);
  if (layer && t.matches('[data-input="layer-y"]')) layer.y = Number(t.value);

  if (t.matches('[data-input="overlay-x"]')) updateOverlayField(t, 'x');
  if (t.matches('[data-input="overlay-y"]')) updateOverlayField(t, 'y');
  if (t.matches('[data-input="overlay-width"]')) updateOverlayField(t, 'width');
  if (t.matches('[data-input="overlay-height"]')) updateOverlayField(t, 'height');
  if (t.matches('[data-input="overlay-rotation"]')) updateOverlayField(t, 'rotation');
  render();
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
  if (t.matches('[data-upload="creator-media"]')) return handleUpload(t, 'creator');
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
  const node = event.target.closest('[data-overlay-id]');
  if (!node || state.smartSystem.mode !== 'edit') return;
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

document.addEventListener('pointerup', () => { dragOverlay = null; });

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

function renderSmartSystem(prefix = 'support') {
  const view = state.smartSystem.activeView;
  const overlays = state.smartSystem.mappings[view];
  return `<section class="card stack"><div class="row"><div><div class="eyebrow">Image Preview Smart System</div><h3 class="section-title">2D Model Alignment Engine</h3></div><span class="tag">${state.smartSystem.mode.toUpperCase()}</span></div>
  <div class="toolbar">${MODEL_VIEWS.map((v) => `<button class="tab ${view === v.key ? 'active' : ''}" data-action="set-view" data-view="${v.key}">${v.label}</button>`).join('')}</div>
  <div class="toolbar"><button class="button-ghost" data-action="toggle-mode">${state.smartSystem.mode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}</button><button class="button-ghost" data-action="toggle-overlays">${state.smartSystem.overlaysVisible ? 'Hide Overlays' : 'Show Overlays'}</button><label class="button-ghost">Upload Model Image<input type="file" hidden accept="image/*" data-upload="model-image" /></label><label class="button">Upload Design PNG<input type="file" hidden accept="image/png,image/*" data-upload="overlay-image" /></label><button class="button-secondary" data-action="save-mapping">Save Mapping</button></div>
  <div class="smart-grid"><div class="smart-stage-wrap"><div class="smart-stage" data-smart-stage><img class="smart-model-image" src="${state.smartSystem.modelImages[view]}" alt="${view} model" />${state.smartSystem.overlaysVisible ? overlays.map((m) => `<div class="overlay-box ${state.smartSystem.mode === 'preview' ? 'locked' : ''}" data-overlay-id="${m.id}" style="left:${m.x}%;top:${m.y}%;width:${m.width}%;height:${m.height}%;transform:rotate(${m.rotation}deg);"><img src="${m.image}" alt="${m.region}" /><span class="overlay-label">${m.region}</span></div>`).join('') : ''}</div></div>
  <div class="stack">${overlays.length ? overlays.map((m) => `<article class="support-item stack"><div class="row"><strong>${m.region}</strong><button class="button-ghost" data-action="delete-overlay" data-id="${m.id}">Delete</button></div><div class="grid-2"><label>X<input type="range" min="0" max="100" value="${m.x}" data-input="overlay-x" data-id="${m.id}" /></label><label>Y<input type="range" min="0" max="100" value="${m.y}" data-input="overlay-y" data-id="${m.id}" /></label><label>Width<input type="range" min="5" max="100" value="${m.width}" data-input="overlay-width" data-id="${m.id}" /></label><label>Height<input type="range" min="5" max="100" value="${m.height}" data-input="overlay-height" data-id="${m.id}" /></label></div><label>Rotate<input type="range" min="-180" max="180" value="${m.rotation}" data-input="overlay-rotation" data-id="${m.id}" /></label></article>`).join('') : '<p class="muted">Upload or preview a design to place overlays on this model image.</p>'}</div></div></section>`;
}

function shell(content) {
  const navLinks = [['/', 'Home'], ['/design', 'Design Studio'], ['/creator-hub', 'Creator Hub'], ['/checkout', 'Checkout'], ['/about', 'About']];
  return `<div class="shell"><header class="header"><div class="container header-inner"><a href="/" data-link class="brand">Wearables Studio</a><nav class="nav">${navLinks.map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}</nav><div class="actions"><a href="/checkout" data-link class="button-ghost">Cart (${state.cart.length})</a>${state.session ? `<button class="button">${escapeHtml(state.session.name.split(' ')[0])}</button><button class="button-ghost" data-action="logout">Logout</button>` : '<a href="/login" data-link class="button">Login</a>'}</div></div></header><main class="page container">${content}</main><footer class="footer"><div class="container footer-inner"><strong>Wearables Studio</strong><span class="muted">Premium custom apparel</span></div></footer><nav class="mobile-nav">${navLinks.map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}</nav></div>`;
}

function homePage() {
  return shell(`<section class="hero card soft"><div class="stack"><span class="badge">Luxury custom apparel</span><h1 class="title-xl">Design online and preview instantly on real model photos.</h1><p class="muted">2D Smart Preview maps your design to front, back, and shoulder regions with precise transform controls.</p><div class="toolbar"><a href="/design" data-link class="button">Start Designing</a><a href="/creator-hub" data-link class="button-ghost">Creator Hub</a></div></div></section>`);
}

function designPage() {
  const layer = selectedLayer();
  return shell(`<section class="section"><div class="eyebrow">Design Studio</div><h1 class="title-lg">2D model preview with smart placement mapping.</h1><p class="muted">3D mockups have been fully removed. Use Preview on Model to place your current surface design.</p></section><section class="designer-board"><div class="card stack"><div class="tabs">${SURFACES.map((s) => `<button class="tab ${state.designEditor.activeSurface === s.key ? 'active' : ''}" data-action="set-surface" data-surface="${s.key}">${s.label}</button>`).join('')}</div><div class="toolbar"><button class="button" data-action="add-text">Add Text</button><button class="button-secondary" data-action="preview-on-model">Preview on Model</button></div><label>Text<input class="input" data-input="layer-content" value="${escapeHtml(layer?.content || '')}" /></label><div class="grid-2"><label>Font<select class="select" data-input="layer-font">${FONTS.map((f) => `<option ${layer?.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label><label>Font Size<input type="range" min="12" max="120" value="${layer?.fontSize || 32}" data-input="layer-size" /></label></div><div class="grid-3"><label>Color<input class="input color-input" type="color" data-input="layer-color" value="${layer?.color || '#ffffff'}" /></label><label>X<input type="range" min="0" max="300" value="${layer?.x || 0}" data-input="layer-x" /></label><label>Y<input type="range" min="0" max="300" value="${layer?.y || 0}" data-input="layer-y" /></label></div><div class="canvas-panel ${state.designEditor.shirtColor}">${state.designEditor.surfaces[state.designEditor.activeSurface].map((item) => `<button class="button-ghost ${item.id === state.designEditor.selectedIds[state.designEditor.activeSurface] ? 'selected-chip' : ''}" data-action="pick-layer" data-id="${item.id}">${item.label}</button>`).join('')}</div></div><div class="stack">${renderSmartSystem('designer')}</div></section>`);
}

function creatorHubPage() {
  return shell(`<section class="section"><div class="eyebrow">Creator Hub</div><h1 class="title-lg">Creator asset upload & management.</h1><p class="muted">Drag/drop or select multiple images, preview, remove, and replace uploads.</p></section><section class="card stack"><div class="toolbar"><label class="button">Upload Creator Images<input hidden type="file" accept="image/*" multiple data-upload="creator-media" /></label><span class="muted">PNG/JPG up to 5MB each.</span></div><div class="dropzone" data-dropzone="creator">Drag & drop creator assets here or use upload button.</div><div class="media-grid">${state.creatorMedia.length ? state.creatorMedia.map((item) => `<article class="support-item stack"><img src="${item.url}" alt="${escapeHtml(item.name)}" class="media-thumb" /><div><strong>${escapeHtml(item.name)}</strong><div class="muted small">${Math.round(item.size / 1024)} KB</div></div><button class="button-ghost" data-action="remove-creator-media" data-id="${item.id}">Remove</button></article>`).join('') : '<p class="muted">No creator images uploaded yet.</p>'}</div></section>`);
}

function checkoutPage() { return shell('<section class="card"><h1 class="title-lg">Checkout</h1><p class="muted">Checkout workflow unchanged.</p></section>'); }

function loginPage() {
  return shell(`<section class="center-wrap"><div class="card stack auth-card"><div class="eyebrow">Login</div><h1 class="title-lg">Access Wearables Studio.</h1><p class="muted">Any registered email can log in. No default email is forced.</p><form data-form="login" class="stack"><input class="input" name="email" type="email" placeholder="Email" autocomplete="email" required /><input class="input" name="password" type="password" placeholder="Password" autocomplete="current-password" required /><button class="button">Login</button></form></div></section>`);
}

function signupPage() {
  return shell(`<section class="center-wrap"><div class="card stack auth-card"><h1 class="title-lg">Create account</h1><form data-form="signup" class="stack"><input class="input" name="name" placeholder="Name" required /><input class="input" type="email" name="email" placeholder="Email" required /><input class="input" type="password" name="password" placeholder="Password" required /><select class="select" name="role"><option value="customer">Customer</option><option value="creator">Creator</option></select><button class="button">Sign up</button></form></div></section>`);
}

function dashboardPage() {
  if (!canAccessAdmin()) return shell('<section class="card"><h1 class="title-lg">Admin access required</h1></section>');
  return shell(`<section class="section"><div class="eyebrow">Admin Dashboard</div><h1 class="title-lg">Store control center</h1></section><section class="card stack">${state.adminExports.length ? state.adminExports.map((x) => `<article class="support-item"><strong>${x.id}</strong></article>`).join('') : '<p class="muted">No exports yet.</p>'}</section>`);
}

function supportPage() {
  if (!canAccessSupport()) return shell('<section class="card"><h1 class="title-lg">Technical Support access required</h1></section>');
  return shell(`<section class="section"><div class="eyebrow">Technical Support Dashboard</div><h1 class="title-lg">Media Management + Smart Mapping</h1></section><section class="card stack"><div class="toolbar"><label class="button">Upload Support Images<input hidden type="file" accept="image/*" multiple data-upload="support-media" /></label><span class="muted">Image validation: type image/*, max 5MB.</span></div><div class="dropzone" data-dropzone="support">Drag & drop support images here or use upload button.</div><div class="media-grid">${state.media.length ? state.media.map((item) => `<article class="support-item stack"><img src="${item.url}" alt="${escapeHtml(item.name)}" class="media-thumb" /><div><strong>${escapeHtml(item.name)}</strong><div class="muted small">Tag: ${item.tag}</div></div><button class="button-ghost" data-action="remove-media" data-id="${item.id}">Delete</button></article>`).join('') : '<p class="muted">No support media uploaded yet.</p>'}</div></section>${renderSmartSystem('support')}`);
}

function aboutPage() { return shell('<section class="card"><h1 class="title-lg">About</h1></section>'); }
function notFoundPage() { return shell('<section class="card"><h1 class="title-lg">404</h1></section>'); }

function route() {
  const p = state.currentPath;
  if (p === '/') return homePage();
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
