const POS_EMAIL = 'pos@wearables.studio';
const SURFACES = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'leftShoulder', label: 'Left Shoulder' },
  { key: 'rightShoulder', label: 'Right Shoulder' }
];

const state = {
  bootstrap: null,
  cart: JSON.parse(localStorage.getItem('wearables-cart') || '[]'),
  session: JSON.parse(localStorage.getItem('wearables-session') || 'null'),
  currentPath: window.location.pathname,
  generatedQr: null,
  placedOrder: null,
  posGuest: JSON.parse(localStorage.getItem('wearables-pos-guest') || '{"name":"Walk-in Customer","email":"","phone":""}'),
  designEditor: {
    activeSurface: 'front',
    selectedIds: { front: 'headline-front', back: 'headline-back', leftShoulder: 'shoulder-left', rightShoulder: 'shoulder-right' },
    surfaces: {
      front: [
        { id: 'headline-front', type: 'text', content: 'Wearables', x: 42, y: 52, fontSize: 34 },
        { id: 'subline-front', type: 'text', content: 'Studio Edition', x: 42, y: 114, fontSize: 20 }
      ],
      back: [
        { id: 'headline-back', type: 'text', content: 'Crafted Offline', x: 36, y: 72, fontSize: 28 }
      ],
      leftShoulder: [
        { id: 'shoulder-left', type: 'text', content: 'WS', x: 24, y: 24, fontSize: 18 }
      ],
      rightShoulder: [
        { id: 'shoulder-right', type: 'text', content: 'No. 01', x: 24, y: 24, fontSize: 16 }
      ]
    }
  }
};

const app = document.getElementById('app');
let dragState = null;

function persistCart() {
  localStorage.setItem('wearables-cart', JSON.stringify(state.cart));
}
function persistSession() {
  localStorage.setItem('wearables-session', JSON.stringify(state.session));
}
function persistPosGuest() {
  localStorage.setItem('wearables-pos-guest', JSON.stringify(state.posGuest));
}
function currency(value) {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value);
}
function dateLabel(value) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
function api(url, options = {}) {
  return fetch(url, options).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}
function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}
function totalCart() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
function isPosMode() {
  return state.session?.email === POS_EMAIL;
}
function activeSurface() {
  return state.designEditor.activeSurface;
}
function surfaceElements(surfaceKey = activeSurface()) {
  return state.designEditor.surfaces[surfaceKey];
}
function selectedLayer(surfaceKey = activeSurface()) {
  const elements = surfaceElements(surfaceKey);
  return elements.find((item) => item.id === state.designEditor.selectedIds[surfaceKey]) || elements[0] || null;
}
function creatorName(creatorId) {
  return state.bootstrap.creators.find((creator) => creator.id === creatorId)?.name || 'Wearables Creator';
}
function qrImage(payload) {
  return `/api/qr-preview?data=${encodeURIComponent(JSON.stringify(payload))}`;
}
function getDraftPayload() {
  return {
    designId: 'CUSTOM-DRAFT',
    surfaces: state.designEditor.surfaces,
    activeSurface: state.designEditor.activeSurface,
    customer: isPosMode() ? state.posGuest : state.session || null
  };
}
function navigate(path) {
  history.pushState({}, '', path);
  state.currentPath = path;
  render();
}
function activeClass(path) {
  return state.currentPath === path ? 'active' : '';
}
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function resetTablet() {
  state.cart = [];
  state.generatedQr = null;
  state.placedOrder = null;
  state.posGuest = { name: 'Walk-in Customer', email: '', phone: '' };
  state.designEditor = {
    activeSurface: 'front',
    selectedIds: { front: 'headline-front', back: 'headline-back', leftShoulder: 'shoulder-left', rightShoulder: 'shoulder-right' },
    surfaces: {
      front: [
        { id: 'headline-front', type: 'text', content: 'Wearables', x: 42, y: 52, fontSize: 34 },
        { id: 'subline-front', type: 'text', content: 'Studio Edition', x: 42, y: 114, fontSize: 20 }
      ],
      back: [{ id: 'headline-back', type: 'text', content: 'Crafted Offline', x: 36, y: 72, fontSize: 28 }],
      leftShoulder: [{ id: 'shoulder-left', type: 'text', content: 'WS', x: 24, y: 24, fontSize: 18 }],
      rightShoulder: [{ id: 'shoulder-right', type: 'text', content: 'No. 01', x: 24, y: 24, fontSize: 16 }]
    }
  };
  persistCart();
  persistPosGuest();
}

async function loadBootstrap() {
  state.bootstrap = await api('/api/bootstrap');
}

window.addEventListener('popstate', () => {
  state.currentPath = window.location.pathname;
  render();
});

document.addEventListener('click', async (event) => {
  const link = event.target.closest('[data-link]');
  if (link) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
    return;
  }

  const action = event.target.closest('[data-action]');
  if (!action) return;

  if (action.dataset.action === 'logout') {
    state.session = null;
    persistSession();
    render();
  }
  if (action.dataset.action === 'go-home') navigate('/');
  if (action.dataset.action === 'add-text') {
    const id = `${activeSurface()}-text-${Date.now()}`;
    surfaceElements().push({ id, type: 'text', content: 'New Layer', x: 40, y: 56, fontSize: 24 });
    state.designEditor.selectedIds[activeSurface()] = id;
    render();
  }
  if (action.dataset.action === 'set-surface') {
    state.designEditor.activeSurface = action.dataset.surface;
    render();
  }
  if (action.dataset.action === 'pick-layer') {
    state.designEditor.selectedIds[activeSurface()] = action.dataset.id;
    render();
  }
  if (action.dataset.action === 'remove-cart') {
    state.cart = state.cart.filter((item) => !(item.designId === action.dataset.designId && item.size === action.dataset.size));
    persistCart();
    render();
  }
  if (action.dataset.action === 'quick-checkout') navigate('/checkout');
  if (action.dataset.action === 'clear-tablet') {
    resetTablet();
    render();
  }
  if (action.dataset.action === 'mark-status') {
    try {
      await api(`/api/orders/${action.dataset.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.dataset.status, paymentStatus: action.dataset.payment || undefined })
      });
      await loadBootstrap();
      render();
    } catch (error) {
      alert(error.message);
    }
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches('[data-pos-field]')) {
    state.posGuest[target.dataset.posField] = target.value;
    persistPosGuest();
    render();
    return;
  }
  if (target.matches('[data-input="layer-content"]')) {
    const layer = selectedLayer();
    if (layer) layer.content = target.value;
    render();
    return;
  }
  if (target.matches('[data-input="layer-font"]')) {
    const layer = selectedLayer();
    if (layer) layer.fontSize = Number(target.value);
    render();
    return;
  }
  if (target.matches('[data-input="layer-x"]')) {
    const layer = selectedLayer();
    if (layer) layer.x = Number(target.value);
    render();
    return;
  }
  if (target.matches('[data-input="layer-y"]')) {
    const layer = selectedLayer();
    if (layer) layer.y = Number(target.value);
    render();
    return;
  }
  if (target.matches('[data-upload="image"]')) {
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `${activeSurface()}-image-${Date.now()}`;
      surfaceElements().push({ id, type: 'image', content: String(reader.result), x: 72, y: 148, width: 140 });
      state.designEditor.selectedIds[activeSurface()] = id;
      render();
    };
    reader.readAsDataURL(file);
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (form.matches('[data-form="login"]')) {
    event.preventDefault();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      state.session = data.user;
      persistSession();
      navigate(data.user.email === POS_EMAIL ? '/creator-hub' : data.user.role === 'admin' ? '/dashboard' : '/');
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (form.matches('[data-form="signup"]')) {
    event.preventDefault();
    try {
      const data = await api('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      state.session = data.user;
      persistSession();
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
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
    if (!state.cart.length) {
      alert('Your cart is empty.');
      return;
    }
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: state.session?.id || 'guest', items: state.cart })
      });
      state.placedOrder = data.order;
      state.cart = [];
      persistCart();
      await loadBootstrap();
      render();
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  if (form.matches('[data-form="dashboard-qr"]')) {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.generatedQr = data.record;
      render();
    } catch (error) {
      alert(error.message);
    }
  }
});

document.addEventListener('pointerdown', (event) => {
  const layerNode = event.target.closest('[data-layer-id]');
  if (!layerNode) return;
  const canvas = document.querySelector('[data-design-canvas]');
  if (!canvas) return;
  const rect = layerNode.getBoundingClientRect();
  dragState = {
    id: layerNode.dataset.layerId,
    canvasRect: canvas.getBoundingClientRect(),
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  state.designEditor.selectedIds[activeSurface()] = layerNode.dataset.layerId;
  render();
});

document.addEventListener('pointermove', (event) => {
  if (!dragState) return;
  const layer = surfaceElements().find((item) => item.id === dragState.id);
  if (!layer) return;
  layer.x = Math.max(0, Math.min(event.clientX - dragState.canvasRect.left - dragState.offsetX, dragState.canvasRect.width - 80));
  layer.y = Math.max(0, Math.min(event.clientY - dragState.canvasRect.top - dragState.offsetY, dragState.canvasRect.height - 40));
  render();
});

document.addEventListener('pointerup', () => {
  dragState = null;
});

function shell(content) {
  return `
    <div class="shell">
      <header class="header">
        <div class="container header-inner">
          <a href="/" data-link class="brand">Wearables Studio</a>
          <nav class="nav">
            ${[
              ['/', 'Home'],
              ['/design', 'Design Studio'],
              ['/creator-hub', 'Marketplace'],
              ['/checkout', 'Checkout'],
              ['/dashboard', 'Dashboard'],
              ['/about', 'About']
            ].map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}
          </nav>
          <div class="actions">
            <a href="/checkout" data-link class="button-ghost">Cart (${cartCount()})</a>
            ${state.session ? `<button class="button">${escapeHtml(state.session.name.split(' ')[0])}</button><button class="button-ghost" data-action="logout">Logout</button>` : `<a href="/login" data-link class="button">Login</a>`}
          </div>
        </div>
      </header>
      <main class="page container">${content}</main>
      <footer class="footer">
        <div class="container footer-inner">
          <strong>Wearables Studio</strong>
          <span class="muted">Premium custom apparel · In-store payment only</span>
        </div>
      </footer>
      <nav class="mobile-nav">
        ${[['/', 'Home'], ['/design', 'Studio'], ['/creator-hub', 'Market'], ['/checkout', 'Cart'], ['/dashboard', 'Admin']].map(([href, label]) => `<a href="${href}" data-link class="${activeClass(href)}">${label}</a>`).join('')}
      </nav>
    </div>
  `;
}

function designCards(designs) {
  return designs.map((design) => `
    <article class="card hover stack">
      <img class="product-image" src="${design.imageUrl}" alt="${escapeHtml(design.title)}" loading="lazy" />
      <div class="row gap-top"><div><strong>${escapeHtml(design.title)}</strong><div class="muted">by ${escapeHtml(design.creatorName || creatorName(design.creatorId))}</div></div><span class="badge">${currency(design.price)}</span></div>
      <p class="muted">${escapeHtml(design.description)}</p>
      <div class="row"><span class="eyebrow">${design.salesCount} sales</span><a href="/product/${design.id}" data-link>View Product</a></div>
    </article>
  `).join('');
}

function qrPanelCard(title, subtitle, payload) {
  return `
    <div class="qr-card">
      <div class="eyebrow">${escapeHtml(title)}</div>
      <img class="qr-preview" src="${qrImage(payload)}" alt="${escapeHtml(title)}" />
      <p class="muted small">${escapeHtml(subtitle)}</p>
    </div>
  `;
}

function posPanel(context) {
  if (!isPosMode()) return '';
  const basePayload = { posHost: POS_EMAIL, customer: state.posGuest };
  const cards = {
    marketplace: [
      qrPanelCard('Customer Login QR', 'Scan to link a customer as a temporary sub-account on the in-store tablet.', { ...basePayload, intent: 'tablet-login', page: 'marketplace' }),
      qrPanelCard('Marketplace Session QR', 'Share the current marketplace browsing session and featured catalog.', { ...basePayload, intent: 'marketplace-share', designs: state.bootstrap.designs.map((item) => item.id) })
    ],
    design: [
      qrPanelCard('Upload Art QR', 'Share the upload handoff so a customer can send artwork into the active design surface.', { ...basePayload, intent: 'upload-art', surface: activeSurface(), draft: getDraftPayload() }),
      qrPanelCard('Design Share QR', 'Share the full multi-surface draft from the in-store builder.', { ...basePayload, intent: 'design-share', draft: getDraftPayload() })
    ],
    checkout: [
      qrPanelCard('Checkout QR', 'Share the pending cart and customer profile before in-store payment.', { ...basePayload, intent: 'checkout-share', cart: state.cart, total: totalCart() }),
      state.placedOrder ? qrPanelCard('Pickup QR', 'Use this QR when the customer comes back for pickup.', { ...basePayload, intent: 'pickup', orderId: state.placedOrder.id }) : ''
    ]
  };

  return `
    <section class="card pos-shell stack">
      <div class="row pos-header-wrap">
        <div>
          <div class="eyebrow">In-store tablet mode</div>
          <h3 class="section-title">POS QR convenience</h3>
          <p class="muted">Logged in as ${POS_EMAIL}. This mode exposes QR-first customer handoff tools only on marketplace, design studio, and checkout.</p>
        </div>
        <button class="button-secondary" data-action="clear-tablet">Clear Tablet Data</button>
      </div>
      <div class="grid-3">
        <label>Customer Name<input class="input" data-pos-field="name" value="${escapeHtml(state.posGuest.name || '')}" /></label>
        <label>Customer Email<input class="input" data-pos-field="email" value="${escapeHtml(state.posGuest.email || '')}" placeholder="customer@email.com" /></label>
        <label>Customer Phone<input class="input" data-pos-field="phone" value="${escapeHtml(state.posGuest.phone || '')}" placeholder="+20 100 000 0000" /></label>
      </div>
      <div class="qr-grid">${cards[context].join('')}</div>
    </section>
  `;
}

function renderEditorLayer(layer, isSelected) {
  if (layer.type === 'text') {
    return `<div class="layer ${isSelected ? 'selected' : ''}" data-layer-id="${layer.id}" style="left:${layer.x}px;top:${layer.y}px;font-size:${layer.fontSize || 24}px;font-weight:600;">${escapeHtml(layer.content)}</div>`;
  }
  return `<img class="layer ${isSelected ? 'selected' : ''}" data-layer-id="${layer.id}" src="${layer.content}" alt="Uploaded art" style="left:${layer.x}px;top:${layer.y}px;width:${layer.width || 140}px;border-radius:16px;" />`;
}

function renderPreviewSurface(surfaceKey) {
  return surfaceElements(surfaceKey)
    .map((layer) => {
      const style = layer.type === 'text'
        ? `left:${layer.x / 2}px;top:${layer.y / 2}px;font-size:${Math.max(10, (layer.fontSize || 24) * 0.45)}px;font-weight:700;`
        : `left:${layer.x / 2}px;top:${layer.y / 2}px;width:${(layer.width || 140) * 0.45}px;border-radius:10px;`;
      return layer.type === 'text'
        ? `<div class="preview-layer" style="${style}">${escapeHtml(layer.content)}</div>`
        : `<img class="preview-layer" style="${style}" src="${layer.content}" alt="Preview art" />`;
    }).join('');
}

function homePage() {
  const { brand, designs } = state.bootstrap;
  return shell(`
    <section class="hero card soft">
      <div class="stack">
        <span class="badge">Luxury custom apparel</span>
        <h1 class="title-xl">Design online, pay in store, and manage pickup with elegant QR workflows.</h1>
        <p class="muted">Wearables Studio combines creator drops, a custom design builder, and cashier-managed production for a premium store-first experience.</p>
        <div class="toolbar">
          <a href="/design" data-link class="button">Start Designing</a>
          <a href="/creator-hub" data-link class="button-ghost">Open Marketplace</a>
        </div>
        <div class="grid-4">
          <div class="card"><div class="eyebrow">Shirt price</div><strong>${currency(brand.price)}</strong></div>
          <div class="card"><div class="eyebrow">Estimated cost</div><strong>${currency(brand.cost)}</strong></div>
          <div class="card"><div class="eyebrow">Creator commission</div><strong>${currency(brand.commission)}</strong></div>
          <div class="card"><div class="eyebrow">Workflow</div><strong>Pending Payment → Paid → Pickup</strong></div>
        </div>
      </div>
      <div class="card stack">
        <div class="eyebrow">Store journey</div>
        ${['Create or browse a design', 'Generate QR handoff', 'Pay with cashier in store', 'Track print production', 'Collect with pickup QR'].map((step, index) => `<div class="card row compact"><span>${escapeHtml(step)}</span><span class="tag">0${index + 1}</span></div>`).join('')}
      </div>
    </section>
    <section class="section">
      <div><div class="eyebrow">Featured designs</div><h2 class="title-lg">Premium monochrome essentials from the creator marketplace.</h2></div>
      <div class="market-grid">${designCards(designs)}</div>
    </section>
  `);
}

function creatorHubPage() {
  return shell(`
    <section class="section"><div class="eyebrow">Creator marketplace</div><h1 class="title-lg">A premium gallery where creators publish sale-ready apparel drops.</h1><p class="muted">Customers can browse designs, add them to cart, and complete payment only when they arrive at the store.</p></section>
    ${posPanel('marketplace')}
    <section class="grid-2">${state.bootstrap.creators.map((creator) => `<div class="card stack"><div class="eyebrow">Creator profile</div><h3>${escapeHtml(creator.name)}</h3><p class="muted">${escapeHtml(creator.bio || 'Premium creator profile.')}</p><div class="row"><span class="badge">EGP ${creator.earnings}</span><a href="/creator/${creator.username}" data-link class="button-ghost">View Profile</a></div></div>`).join('')}</section>
    <section class="market-grid">${designCards(state.bootstrap.designs)}</section>
  `);
}

function creatorPage(username) {
  const creator = state.bootstrap.creators.find((item) => item.username === username);
  if (!creator) return notFoundPage();
  const creatorDesigns = state.bootstrap.designs.filter((design) => design.creatorId === creator.id);
  return shell(`
    <section class="section"><div class="eyebrow">Creator profile</div><h1 class="title-lg">${escapeHtml(creator.name)}</h1><p class="muted">${escapeHtml(creator.bio || '')}</p></section>
    <section class="grid-2"><div class="card"><div class="eyebrow">Username</div><h3>@${escapeHtml(creator.username)}</h3></div><div class="card"><div class="eyebrow">Lifetime earnings</div><h3>EGP ${creator.earnings}</h3></div></section>
    <section class="market-grid">${designCards(creatorDesigns)}</section>
  `);
}

function productPage(id) {
  const design = state.bootstrap.designs.find((item) => item.id === id);
  if (!design) return notFoundPage();
  return shell(`
    <section class="grid-2">
      <div class="card"><img class="product-image" src="${design.imageUrl}" alt="${escapeHtml(design.title)}" /></div>
      <div class="stack">
        <span class="badge">Premium custom apparel</span>
        <h1 class="title-lg">${escapeHtml(design.title)}</h1>
        <p class="muted">${escapeHtml(design.description)}</p>
        <div class="card soft stack">
          <div class="row"><span class="muted">Price</span><strong>${currency(design.price)}</strong></div>
          <div class="row"><span class="muted">Payment model</span><strong>Pay in store only</strong></div>
          <div class="row"><span class="muted">Availability</span><strong>Made to order</strong></div>
        </div>
        <form data-form="add-cart" class="card stack">
          <input type="hidden" name="designId" value="${design.id}" />
          <label>Size<select name="size" class="select">${['S', 'M', 'L', 'XL'].map((size) => `<option value="${size}">${size}</option>`).join('')}</select></label>
          <label>Quantity<input name="quantity" class="input" type="number" min="1" max="10" value="1" /></label>
          <div class="toolbar"><button class="button">Add to Cart</button><button type="button" class="button-ghost" data-action="quick-checkout">Checkout</button></div>
        </form>
      </div>
    </section>
  `);
}

function designPage() {
  const currentLayer = selectedLayer();
  return shell(`
    <section class="section"><div class="eyebrow">Design studio</div><h1 class="title-lg">Edit every printable area with tabs, drag-and-drop layers, and a black T-shirt previewer.</h1><p class="muted">Use the tabs to switch between front, back, left shoulder, and right shoulder. Drag elements directly on canvas or use the numeric sliders for fine positioning.</p></section>
    ${posPanel('design')}
    <section class="tabs">${SURFACES.map((surface) => `<button class="tab ${activeSurface() === surface.key ? 'active' : ''}" data-action="set-surface" data-surface="${surface.key}">${surface.label}</button>`).join('')}</section>
    <section class="editor-layout">
      <div class="card stack">
        <div class="toolbar">
          <button class="button" data-action="add-text">Add Text</button>
          <label class="button-ghost">Upload Art<input data-upload="image" type="file" accept="image/*" hidden /></label>
        </div>
        <div class="notice">Tip: drag directly on the canvas for placement, then use the sliders for precise adjustments.</div>
        <label>Layer Content<input class="input" data-input="layer-content" value="${escapeHtml(currentLayer?.content || '')}" ${currentLayer ? '' : 'disabled'} /></label>
        <div class="grid-2">
          <label>X Position<input data-input="layer-x" type="range" min="0" max="260" value="${currentLayer?.x || 0}" ${currentLayer ? '' : 'disabled'} /></label>
          <label>Y Position<input data-input="layer-y" type="range" min="0" max="320" value="${currentLayer?.y || 0}" ${currentLayer ? '' : 'disabled'} /></label>
        </div>
        ${currentLayer?.type === 'text' ? `<label>Font Size<input data-input="layer-font" type="range" min="14" max="48" value="${currentLayer.fontSize || 24}" /></label>` : ''}
        <div class="card soft stack">
          <div class="eyebrow">Layers on ${SURFACES.find((surface) => surface.key === activeSurface()).label}</div>
          ${surfaceElements().map((layer) => `<button class="button-ghost ${state.designEditor.selectedIds[activeSurface()] === layer.id ? 'selected-chip' : ''}" data-action="pick-layer" data-id="${layer.id}">${escapeHtml(layer.type)} · ${escapeHtml(layer.id)}</button>`).join('') || '<p class="muted">No layers yet on this side.</p>'}
        </div>
      </div>
      <div class="stack">
        <div class="design-mockup">
          <div class="shirt"></div>
          <div class="canvas" data-design-canvas>
            ${surfaceElements().map((layer) => renderEditorLayer(layer, state.designEditor.selectedIds[activeSurface()] === layer.id)).join('')}
          </div>
        </div>
        <div class="card stack">
          <div class="row"><div><div class="eyebrow">3D preview</div><h3 class="section-title">Black T-shirt render</h3></div><span class="tag">Live</span></div>
          <div class="shirt-3d">
            <div class="shirt-body"></div>
            <div class="shirt-neck"></div>
            <div class="shirt-sleeve left"></div>
            <div class="shirt-sleeve right"></div>
            <div class="preview-surface front">${renderPreviewSurface('front')}</div>
            <div class="preview-surface back">${renderPreviewSurface('back')}</div>
            <div class="preview-surface left-shoulder">${renderPreviewSurface('leftShoulder')}</div>
            <div class="preview-surface right-shoulder">${renderPreviewSurface('rightShoulder')}</div>
          </div>
          <div class="notice"><strong>Draft payload:</strong><pre>${escapeHtml(JSON.stringify(getDraftPayload(), null, 2))}</pre></div>
        </div>
      </div>
    </section>
  `);
}

function checkoutPage() {
  return shell(`
    <section class="section"><div class="eyebrow">Checkout</div><h1 class="title-lg">Create the order online and leave payment to the in-store cashier.</h1><p class="muted">Every order is created as Pending Payment. The cashier updates payment manually when the customer arrives.</p></section>
    ${posPanel('checkout')}
    <section class="order-grid">
      <div class="card stack">
        <h2>Cart summary</h2>
        ${state.cart.length ? state.cart.map((item) => `<div class="card row compact-start"><div class="inline-media"><img src="${item.imageUrl}" alt="${escapeHtml(item.designTitle)}" class="cart-thumb" /><div><strong>${escapeHtml(item.designTitle)}</strong><div class="muted">Size ${item.size} · Qty ${item.quantity}</div></div></div><div class="stack align-end"><strong>${currency(item.quantity * item.price)}</strong><button class="button-ghost" data-action="remove-cart" data-design-id="${item.designId}" data-size="${item.size}">Remove</button></div></div>`).join('') : '<p class="muted">Your cart is empty.</p>'}
        <div class="row"><span class="muted">Total</span><strong>${currency(totalCart())}</strong></div>
      </div>
      <div class="stack">
        <form data-form="checkout" class="card stack">
          <label>Name<input class="input" name="customerName" value="${escapeHtml(isPosMode() ? state.posGuest.name : state.session?.name || '')}" required /></label>
          <label>Phone<input class="input" name="phone" value="${escapeHtml(isPosMode() ? state.posGuest.phone : '')}" placeholder="+20 100 000 0000" required /></label>
          <label>Optional notes<textarea class="textarea" name="notes" rows="4" placeholder="Packaging or pickup notes"></textarea></label>
          <div class="notice">No online payment is collected here. The cashier confirms payment manually in-store before production begins.</div>
          <button class="button" ${state.cart.length ? '' : 'disabled'}>Place Order</button>
        </form>
        ${state.placedOrder ? `<div class="card stack"><div class="eyebrow">Order completed</div><h3 class="section-title">Order ${state.placedOrder.id} created as Pending Payment.</h3><div class="qr-grid">${qrPanelCard('Order QR', 'Use this order QR at the cashier desk.', state.placedOrder)}${qrPanelCard('Pickup QR', 'Use this pickup QR when the order is ready.', { orderId: state.placedOrder.id, purpose: 'pickup', customer: state.placedOrder.customerName })}</div></div>` : ''}
      </div>
    </section>
  `);
}

function loginPage() {
  return shell(`
    <section class="center-wrap"><div class="card stack auth-card"><div class="eyebrow">Login</div><h1 class="title-lg">Access Wearables Studio.</h1><p class="muted">Demo accounts: admin@wearables.studio / password123, ${POS_EMAIL} / password123, mariam@wearables.studio / password123.</p><form data-form="login" class="stack"><input class="input" name="email" value="${POS_EMAIL}" required /><input class="input" type="password" name="password" value="password123" required /><button class="button">Login</button></form><p class="muted">Need a new account? <a href="/signup" data-link>Create one</a>.</p></div></section>
  `);
}

function signupPage() {
  return shell(`
    <section class="center-wrap"><div class="card stack auth-card"><div class="eyebrow">Sign up</div><h1 class="title-lg">Create a customer or creator account.</h1><form data-form="signup" class="stack"><input class="input" name="name" placeholder="Name" required /><input class="input" name="email" placeholder="Email" required /><input class="input" type="password" name="password" placeholder="Password" required /><select class="select" name="role"><option value="customer">Customer</option><option value="creator">Creator</option></select><button class="button">Create Account</button></form><p class="muted">Already registered? <a href="/login" data-link>Login</a>.</p></div></section>
  `);
}

function dashboardPage() {
  if (state.session?.role !== 'admin' || state.session?.email === POS_EMAIL) {
    return shell(`<section class="card stack"><div class="eyebrow">Restricted</div><h1 class="title-lg">Admin dashboard access required.</h1><p class="muted">Use the seeded admin account to update payment and production statuses.</p></section>`);
  }
  return shell(`
    <section class="dashboard-layout">
      <aside class="card stack"><div class="eyebrow">Dashboard</div>${['Orders', 'Designs', 'Users', 'QR Generator'].map((item) => `<div class="card compact-box">${item}</div>`).join('')}<div class="notice">Cashiers can mark orders paid, request edits, cancel jobs, or advance them to pickup completion.</div></aside>
      <div class="stack">
        <div class="card stack"><div><div class="eyebrow">Order management</div><h1 class="title-lg">Store control center</h1></div><div style="overflow:auto;"><table class="table"><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Payment</th><th>Created</th><th>Actions</th></tr></thead><tbody>${state.bootstrap.orders.map((order) => `<tr><td><strong>${order.id}</strong><div class="muted">${order.items.length} item(s)</div></td><td>${escapeHtml(order.customerName)}<div class="muted">${escapeHtml(order.phone)}</div></td><td><span class="tag">${escapeHtml(order.status)}</span></td><td><span class="tag">${escapeHtml(order.paymentStatus)}</span></td><td>${dateLabel(order.createdAt)}</td><td><div class="order-actions">${order.paymentStatus === 'Pending' ? `<button class="button" data-action="mark-status" data-order-id="${order.id}" data-status="Paid" data-payment="Paid">Mark as Paid</button>` : ''}${['Processing', 'Printed', 'Ready for Pickup', 'Completed'].map((status) => `<button class="button-ghost" data-action="mark-status" data-order-id="${order.id}" data-status="${status}">${status}</button>`).join('')}<button class="button-secondary" data-action="mark-status" data-order-id="${order.id}" data-status="Edits Requested">Request Edits</button><button class="button-ghost" data-action="mark-status" data-order-id="${order.id}" data-status="Cancelled">Cancel</button></div></td></tr>`).join('')}</tbody></table></div></div>
        <div class="grid-2"><form data-form="dashboard-qr" class="card stack"><div class="eyebrow">QR Generator</div><select class="select" name="type"><option value="order">Order QR</option><option value="design">Design QR</option><option value="pickup">Pickup QR</option></select><input class="input" name="referenceId" value="ORD-1001" placeholder="Order ID or Design ID" /><button class="button">Generate QR</button></form><div class="card center-wrap stack"><div class="eyebrow">Generated QR</div>${state.generatedQr ? `<img class="qr-preview" src="${state.generatedQr.image}" alt="Generated QR" /><pre>${escapeHtml(state.generatedQr.data)}</pre>` : '<p class="muted">Generate a QR from an order or design reference.</p>'}</div></div>
      </div>
    </section>
  `);
}

function aboutPage() {
  return shell(`
    <section class="section"><div class="eyebrow">About</div><h1 class="title-lg">A luxury operating system for custom apparel retail.</h1><p class="muted">Wearables Studio is designed for store-first commerce: design online, pay physically, produce with cashier control, and retrieve with QR-based workflows.</p></section>
    <section class="grid-2"><div class="card stack"><h3>Why in-store payment?</h3><p class="muted">It preserves a premium retail handoff, avoids online gateway complexity, and keeps fulfillment tightly controlled.</p></div><div class="card stack"><h3>Why QR everywhere?</h3><p class="muted">QR cards let the store move customers between browsing, uploads, checkout, and pickup with minimal friction on shared tablets and cashier terminals.</p></div></section>
  `);
}

function notFoundPage() {
  return shell(`<section class="card stack center-wrap"><div class="eyebrow">404</div><h1 class="title-lg">Page not found.</h1><button class="button" data-action="go-home">Return Home</button></section>`);
}

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

function render() {
  app.innerHTML = route();
}

(async function init() {
  await loadBootstrap();
  render();
})();
