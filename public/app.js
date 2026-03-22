const state = {
  bootstrap: null,
  cart: JSON.parse(localStorage.getItem('wearables-cart') || '[]'),
  session: JSON.parse(localStorage.getItem('wearables-session') || 'null'),
  currentPath: window.location.pathname,
  designEditor: {
    elements: [
      { id: 'headline', type: 'text', content: 'Wearables', x: 36, y: 48, fontSize: 34 },
      { id: 'subline', type: 'text', content: 'Studio Edition', x: 36, y: 112, fontSize: 20 }
    ],
    selectedId: 'headline'
  },
  qrRecord: null,
  placedOrder: null
};

const statuses = ['Pending Payment', 'Paid', 'Processing', 'Printed', 'Ready for Pickup', 'Completed', 'Cancelled', 'Edits Requested'];
const paymentStatuses = ['Pending', 'Paid'];

const app = document.getElementById('app');

function saveCart() { localStorage.setItem('wearables-cart', JSON.stringify(state.cart)); }
function saveSession() { localStorage.setItem('wearables-session', JSON.stringify(state.session)); }
function currency(value) { return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value); }
function dateLabel(value) { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
function creatorName(id) { return state.bootstrap.creators.find((item) => item.id === id)?.name || 'Wearables Creator'; }
function active(path) { return state.currentPath === path ? 'active' : ''; }
function cartCount() { return state.cart.reduce((sum, item) => sum + item.quantity, 0); }
function totalCart() { return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }
function selectedLayer() { return state.designEditor.elements.find((item) => item.id === state.designEditor.selectedId) || state.designEditor.elements[0]; }

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadBootstrap() {
  state.bootstrap = await api('/api/bootstrap');
}

function navigate(path) {
  history.pushState({}, '', path);
  state.currentPath = path;
  render();
}

window.addEventListener('popstate', () => {
  state.currentPath = window.location.pathname;
  render();
});

document.addEventListener('click', (event) => {
  const anchor = event.target.closest('[data-link]');
  if (anchor) {
    event.preventDefault();
    navigate(anchor.getAttribute('href'));
  }
  const action = event.target.closest('[data-action]');
  if (action) handleAction(action, event);
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('[data-input="layer-content"]')) {
    selectedLayer().content = target.value;
    render();
  }
  if (target.matches('[data-input="layer-font"]')) {
    selectedLayer().fontSize = Number(target.value);
    render();
  }
  if (target.matches('[data-input="layer-x"]')) {
    selectedLayer().x = Number(target.value);
    render();
  }
  if (target.matches('[data-input="layer-y"]')) {
    selectedLayer().y = Number(target.value);
    render();
  }
  if (target.matches('[data-upload="image"]')) {
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `image-${Date.now()}`;
      state.designEditor.elements.push({ id, type: 'image', content: String(reader.result), x: 70, y: 170, width: 140 });
      state.designEditor.selectedId = id;
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
      const data = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      state.session = data.user;
      saveSession();
      navigate(data.user.role === 'admin' ? '/dashboard' : '/');
    } catch (error) {
      alert(error.message);
    }
  }
  if (form.matches('[data-form="signup"]')) {
    event.preventDefault();
    try {
      const data = await api('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      state.session = data.user;
      saveSession();
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
  }
  if (form.matches('[data-form="checkout"]')) {
    event.preventDefault();
    if (!state.cart.length) return alert('Your cart is empty.');
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, userId: state.session?.id || 'guest', items: state.cart }) });
      state.placedOrder = data.order;
      state.cart = [];
      saveCart();
      await loadBootstrap();
      render();
    } catch (error) {
      alert(error.message);
    }
  }
  if (form.matches('[data-form="add-cart"]')) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form));
    const design = state.bootstrap.designs.find((item) => item.id === payload.designId);
    const quantity = Number(payload.quantity);
    const existing = state.cart.find((item) => item.designId === payload.designId && item.size === payload.size);
    if (existing) existing.quantity += quantity;
    else state.cart.push({ productId: payload.designId, designId: payload.designId, designTitle: design.title, imageUrl: design.imageUrl, size: payload.size, quantity, price: design.price });
    saveCart();
    alert('Added to cart.');
    render();
  }
  if (form.matches('[data-form="qr-generator"]')) {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(form));
      const data = await api('/api/qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      state.qrRecord = data.record;
      render();
    } catch (error) {
      alert(error.message);
    }
  }
});

let dragState = null;
document.addEventListener('pointerdown', (event) => {
  const layer = event.target.closest('[data-layer-id]');
  if (!layer) return;
  const canvas = document.querySelector('[data-design-canvas]');
  const rect = layer.getBoundingClientRect();
  dragState = { id: layer.dataset.layerId, canvasRect: canvas.getBoundingClientRect(), offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
  state.designEditor.selectedId = layer.dataset.layerId;
  render();
});
document.addEventListener('pointermove', (event) => {
  if (!dragState) return;
  const element = state.designEditor.elements.find((item) => item.id === dragState.id);
  if (!element) return;
  element.x = Math.max(0, Math.min(event.clientX - dragState.canvasRect.left - dragState.offsetX, dragState.canvasRect.width - 70));
  element.y = Math.max(0, Math.min(event.clientY - dragState.canvasRect.top - dragState.offsetY, dragState.canvasRect.height - 40));
  render();
});
document.addEventListener('pointerup', () => { dragState = null; });

async function handleAction(target) {
  const action = target.dataset.action;
  if (action === 'logout') {
    state.session = null;
    saveSession();
    render();
  }
  if (action === 'go-home') navigate('/');
  if (action === 'add-text') {
    const id = `text-${Date.now()}`;
    state.designEditor.elements.push({ id, type: 'text', content: 'New Layer', x: 40, y: 60, fontSize: 24 });
    state.designEditor.selectedId = id;
    render();
  }
  if (action === 'remove-cart') {
    state.cart = state.cart.filter((item) => !(item.designId === target.dataset.designId && item.size === target.dataset.size));
    saveCart();
    render();
  }
  if (action === 'quick-checkout') navigate('/checkout');
  if (action === 'mark-status') {
    try {
      await api(`/api/orders/${target.dataset.orderId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: target.dataset.status, paymentStatus: target.dataset.payment || undefined }) });
      await loadBootstrap();
      render();
    } catch (error) { alert(error.message); }
  }
  if (action === 'pick-layer') {
    state.designEditor.selectedId = target.dataset.id;
    render();
  }
}

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
              ['/creator-hub', 'Creator Hub'],
              ['/checkout', 'Checkout'],
              ['/dashboard', 'Dashboard'],
              ['/about', 'About']
            ].map(([href, label]) => `<a href="${href}" data-link class="${active(href)}">${label}</a>`).join('')}
          </nav>
          <div class="actions">
            <a href="/checkout" data-link class="button-ghost">Cart (${cartCount()})</a>
            ${state.session ? `<button class="button" data-action="logout">${state.session.name.split(' ')[0]} · Logout</button>` : `<a href="/login" data-link class="button">Login</a>`}
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
        ${[['/', 'Home'], ['/design', 'Studio'], ['/creator-hub', 'Creators'], ['/checkout', 'Cart'], ['/dashboard', 'Admin']].map(([href, label]) => `<a href="${href}" data-link class="${active(href)}">${label}</a>`).join('')}
      </nav>
    </div>
  `;
}

function homePage() {
  const { brand, designs } = state.bootstrap;
  return shell(`
    <section class="hero card soft">
      <div class="stack">
        <span class="badge">Luxury custom apparel</span>
        <h1 class="title-xl">Design online, pay in store, pick up with QR precision.</h1>
        <p class="muted">Wearables Studio combines a premium monochrome design language with a creator marketplace, cashier-managed payments, and QR-powered store operations.</p>
        <div class="toolbar">
          <a href="/design" data-link class="button">Start Designing</a>
          <a href="/creator-hub" data-link class="button-ghost">Browse Marketplace</a>
        </div>
        <div class="grid-4">
          <div class="card"><div class="eyebrow">Shirt price</div><strong>${currency(brand.price)}</strong></div>
          <div class="card"><div class="eyebrow">Estimated cost</div><strong>${currency(brand.cost)}</strong></div>
          <div class="card"><div class="eyebrow">Creator commission</div><strong>${currency(brand.commission)}</strong></div>
          <div class="card"><div class="eyebrow">Payment flow</div><strong>Pending Payment → Store Paid</strong></div>
        </div>
      </div>
      <div class="card stack">
        <div class="eyebrow">Operational workflow</div>
        ${['Place order online', 'Receive order QR', 'Pay cashier in store', 'Track print status', 'Pickup with QR'].map((step, index) => `<div class="row card"><span>${step}</span><span class="tag">0${index + 1}</span></div>`).join('')}
      </div>
    </section>
    <section class="section">
      <div>
        <div class="eyebrow">Featured designs</div>
        <h2 class="title-lg">Editorial essentials shaped by premium creators.</h2>
      </div>
      <div class="market-grid">${designCards(designs)}</div>
    </section>
    <section class="grid-2">
      <div class="card stack"><div class="eyebrow">Creator hub</div><h3 class="title-lg">Launch drops and earn 50 EGP per sale.</h3><p class="muted">Creators publish premium concepts, build followings, and earn a fixed commission with every shirt sold.</p><a href="/creator-hub" data-link class="button">Join creator hub</a></div>
      <div class="card stack"><div class="eyebrow">Admin dashboard</div><h3 class="title-lg">Cashier-first operations with manual payment control.</h3><p class="muted">Confirm payment, request edits, move garments into production, and complete pickup in one place.</p><a href="/dashboard" data-link class="button-ghost">Open dashboard</a></div>
    </section>
  `);
}

function designCards(designs) {
  return designs.map((design) => `
    <article class="card hover stack">
      <img class="product-image" src="${design.imageUrl}" alt="${design.title}" loading="lazy" />
      <div class="row"><div><strong>${design.title}</strong><div class="muted">by ${design.creatorName || creatorName(design.creatorId)}</div></div><span class="badge">${currency(design.price)}</span></div>
      <p class="muted">${design.description}</p>
      <div class="row"><span class="eyebrow">${design.salesCount} sales</span><a href="/product/${design.id}" data-link>View Product</a></div>
    </article>
  `).join('');
}

function designPage() {
  const layer = selectedLayer();
  return shell(`
    <section class="section">
      <div class="eyebrow">Design studio</div>
      <h1 class="title-lg">Layer imagery and typography on a premium tee mockup.</h1>
      <p class="muted">Upload artwork, add new text, drag every layer into position, and create a design payload that can be shared through QR.</p>
    </section>
    <section class="grid-2">
      <div class="card stack">
        <div class="toolbar">
          <button class="button" data-action="add-text">Add Text</button>
          <label class="button-ghost">Upload Image<input data-upload="image" type="file" accept="image/*" hidden /></label>
        </div>
        <label>Layer Content<input class="input" data-input="layer-content" value="${layer?.content || ''}" /></label>
        <div class="grid-2">
          <label>X Position<input data-input="layer-x" type="range" min="0" max="260" value="${layer?.x || 0}" /></label>
          <label>Y Position<input data-input="layer-y" type="range" min="0" max="320" value="${layer?.y || 0}" /></label>
        </div>
        ${layer?.type === 'text' ? `<label>Font Size<input data-input="layer-font" type="range" min="14" max="48" value="${layer.fontSize || 24}" /></label>` : ''}
        <div class="card soft stack"><div class="eyebrow">Active layers</div>${state.designEditor.elements.map((item) => `<button class="button-ghost" data-action="pick-layer" data-id="${item.id}">${item.type} · ${item.id}</button>`).join('')}</div>
        <div class="notice"><strong>Design payload:</strong><br /><pre>${escapeHtml(JSON.stringify({ id: 'CUSTOM-DRAFT', elements: state.designEditor.elements }, null, 2))}</pre></div>
      </div>
      <div class="stack">
        <div class="design-mockup">
          <div class="shirt"></div>
          <div class="canvas" data-design-canvas>
            ${state.designEditor.elements.map((item) => item.type === 'text'
              ? `<div class="layer ${state.designEditor.selectedId === item.id ? 'selected' : ''}" data-layer-id="${item.id}" style="left:${item.x}px;top:${item.y}px;font-size:${item.fontSize || 24}px;font-weight:600;">${escapeHtml(item.content)}</div>`
              : `<img class="layer ${state.designEditor.selectedId === item.id ? 'selected' : ''}" data-layer-id="${item.id}" src="${item.content}" alt="Uploaded artwork" style="left:${item.x}px;top:${item.y}px;width:${item.width || 140}px;border-radius:16px;" />`).join('')}
          </div>
        </div>
        <div class="card center stack"><div class="eyebrow">Design QR preview</div><img class="qr-preview" src="${state.qrRecord?.image || ''}" ${state.qrRecord ? '' : 'style="display:none"'} /><form data-form="qr-generator" class="stack"><input type="hidden" name="type" value="design" /><input type="hidden" name="data" value='${escapeHtml(JSON.stringify({ id: 'CUSTOM-DRAFT', elements: state.designEditor.elements }))}' /><button class="button">Generate Design QR</button></form></div>
      </div>
    </section>
  `);
}

function creatorHubPage() {
  return shell(`
    <section class="section"><div class="eyebrow">Creator hub</div><h1 class="title-lg">A luxury marketplace for monochrome, editorial, and collectible apparel drops.</h1><p class="muted">Creators publish premium work, customers order without online payment, and commissions are settled at 50 EGP per shirt sold.</p></section>
    <section class="grid-2">${state.bootstrap.creators.map((creator) => `<div class="card stack"><div class="eyebrow">Creator profile</div><h3>${creator.name}</h3><p class="muted">${creator.bio || 'Premium creator.'}</p><div class="row"><span class="badge">EGP ${creator.earnings}</span><a href="/creator/${creator.username}" data-link class="button-ghost">View Profile</a></div></div>`).join('')}</section>
    <section class="market-grid">${designCards(state.bootstrap.designs)}</section>
  `);
}

function creatorPage(username) {
  const creator = state.bootstrap.creators.find((item) => item.username === username);
  if (!creator) return notFoundPage();
  const designs = state.bootstrap.designs.filter((item) => item.creatorId === creator.id);
  return shell(`
    <section class="section"><div class="eyebrow">Creator profile</div><h1 class="title-lg">${creator.name}</h1><p class="muted">${creator.bio || ''}</p></section>
    <section class="grid-2"><div class="card"><div class="eyebrow">Username</div><h3>@${creator.username}</h3></div><div class="card"><div class="eyebrow">Lifetime earnings</div><h3>EGP ${creator.earnings}</h3></div></section>
    <section class="market-grid">${designCards(designs)}</section>
  `);
}

function productPage(id) {
  const design = state.bootstrap.designs.find((item) => item.id === id);
  if (!design) return notFoundPage();
  return shell(`
    <section class="grid-2">
      <div class="card"><img class="product-image" src="${design.imageUrl}" alt="${design.title}" /></div>
      <div class="stack">
        <span class="badge">Premium custom apparel</span>
        <h1 class="title-lg">${design.title}</h1>
        <p class="muted">${design.description}</p>
        <div class="card soft stack">
          <div class="row"><span class="muted">Price</span><strong>${currency(design.price)}</strong></div>
          <div class="row"><span class="muted">Payment model</span><strong>Pay in store only</strong></div>
          <div class="row"><span class="muted">Availability</span><strong>Made to order</strong></div>
        </div>
        <form data-form="add-cart" class="card stack">
          <input type="hidden" name="designId" value="${design.id}" />
          <label>Size<select name="size" class="select">${['S','M','L','XL'].map((size) => `<option value="${size}">${size}</option>`).join('')}</select></label>
          <label>Quantity<input name="quantity" type="number" class="input" min="1" max="10" value="1" /></label>
          <div class="toolbar"><button class="button">Add to Cart</button><button type="button" class="button-ghost" data-action="quick-checkout">Checkout</button></div>
        </form>
      </div>
    </section>
  `);
}

function checkoutPage() {
  return shell(`
    <section class="section"><div class="eyebrow">Checkout</div><h1 class="title-lg">Submit the order online, then pay at the physical store.</h1><p class="muted">Orders are always created as Pending Payment. A cashier must manually confirm the transaction before production begins.</p></section>
    <section class="order-grid">
      <div class="card stack">
        <h2>Cart summary</h2>
        ${state.cart.length ? state.cart.map((item) => `<div class="card row"><div class="row" style="justify-content:flex-start; gap:1rem;"><img src="${item.imageUrl}" alt="${item.designTitle}" style="width:90px;height:90px;object-fit:cover;border-radius:18px;" /><div><strong>${item.designTitle}</strong><div class="muted">Size ${item.size} · Qty ${item.quantity}</div></div></div><div class="stack" style="justify-items:end;"><strong>${currency(item.price * item.quantity)}</strong><button class="button-ghost" data-action="remove-cart" data-design-id="${item.designId}" data-size="${item.size}">Remove</button></div></div>`).join('') : '<p class="muted">Your cart is empty.</p>'}
        <div class="row"><span class="muted">Total</span><strong>${currency(totalCart())}</strong></div>
      </div>
      <div class="stack">
        <form data-form="checkout" class="card stack">
          <label>Name<input class="input" name="customerName" value="${state.session?.name || ''}" required /></label>
          <label>Phone<input class="input" name="phone" placeholder="+20 100 000 0000" required /></label>
          <label>Optional notes<textarea class="textarea" name="notes" rows="4" placeholder="Packaging or pickup details"></textarea></label>
          <div class="notice">No online payment is collected here. The order stays <strong>Pending Payment</strong> until an admin cashier marks it as paid in the store.</div>
          <button class="button" ${state.cart.length ? '' : 'disabled'}>Place Order</button>
        </form>
        ${state.placedOrder ? qrCard('Order QR', state.placedOrder) + qrCard('Pickup QR', { orderId: state.placedOrder.id, customer: state.placedOrder.customerName, purpose: 'pickup' }) : ''}
      </div>
    </section>
  `);
}

function qrCard(title, payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  return `<div class="card center stack"><div class="eyebrow">${title}</div><img class="qr-preview" src="/api/qr-preview?data=${encoded}" onerror="this.style.display='none'" /><form data-form="qr-generator" class="stack"><input type="hidden" name="type" value="order" /><input type="hidden" name="data" value='${escapeHtml(JSON.stringify(payload))}' /><button class="button-ghost">Refresh QR</button></form></div>`;
}

function loginPage() {
  return shell(`
    <section class="center"><div class="card stack" style="max-width:560px;margin:0 auto; text-align:left;"><div class="eyebrow">Login</div><h1 class="title-lg">Access your Wearables Studio account.</h1><p class="muted">Demo accounts: admin@wearables.studio / password123 and mariam@wearables.studio / password123.</p><form data-form="login" class="stack"><input class="input" name="email" value="admin@wearables.studio" required /><input class="input" type="password" name="password" value="password123" required /><button class="button">Login</button></form><p class="muted">No account yet? <a href="/signup" data-link>Create one</a>.</p></div></section>
  `);
}

function signupPage() {
  return shell(`
    <section class="center"><div class="card stack" style="max-width:560px;margin:0 auto; text-align:left;"><div class="eyebrow">Sign up</div><h1 class="title-lg">Create a customer or creator account.</h1><form data-form="signup" class="stack"><input class="input" name="name" placeholder="Name" required /><input class="input" name="email" placeholder="Email" required /><input class="input" type="password" name="password" placeholder="Password" required /><select class="select" name="role"><option value="customer">Customer</option><option value="creator">Creator</option></select><button class="button">Create Account</button></form><p class="muted">Already registered? <a href="/login" data-link>Login</a>.</p></div></section>
  `);
}

function dashboardPage() {
  if (state.session?.role !== 'admin') {
    return shell(`<section class="card stack"><div class="eyebrow">Restricted</div><h1 class="title-lg">Admin dashboard access required.</h1><p class="muted">Login with the seeded admin account to confirm in-store payments and manage production statuses.</p></section>`);
  }
  return shell(`
    <section class="dashboard-layout">
      <aside class="card stack"><div class="eyebrow">Dashboard</div>${['Orders', 'Designs', 'Users', 'QR Generator'].map((item) => `<div class="card">${item}</div>`).join('')}<div class="notice">Cashiers can mark an order as Paid, cancel it, request design edits, or move it step-by-step through production.</div></aside>
      <div class="stack">
        <div class="card stack">
          <div class="row"><div><div class="eyebrow">Order management</div><h1 class="title-lg">Store control center</h1></div></div>
          <div style="overflow:auto;"><table class="table"><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Payment</th><th>Created</th><th>Actions</th></tr></thead><tbody>${state.bootstrap.orders.map((order) => `<tr><td><strong>${order.id}</strong><div class="muted">${order.items.length} item(s)</div></td><td>${order.customerName}<div class="muted">${order.phone}</div></td><td><span class="tag">${order.status}</span></td><td><span class="tag">${order.paymentStatus}</span></td><td>${dateLabel(order.createdAt)}</td><td><div class="order-actions">${order.paymentStatus === 'Pending' ? `<button class="button" data-action="mark-status" data-order-id="${order.id}" data-status="Paid" data-payment="Paid">Mark as Paid</button>` : ''}${['Processing','Printed','Ready for Pickup','Completed'].map((status) => `<button class="button-ghost" data-action="mark-status" data-order-id="${order.id}" data-status="${status}">${status}</button>`).join('')}<button class="button-secondary" data-action="mark-status" data-order-id="${order.id}" data-status="Edits Requested">Request Edits</button><button class="button-ghost" data-action="mark-status" data-order-id="${order.id}" data-status="Cancelled">Cancel</button></div></td></tr>`).join('')}</tbody></table></div>
        </div>
        <div class="grid-2">
          <form data-form="qr-generator" class="card stack"><div class="eyebrow">QR Generator</div><select class="select" name="type"><option value="order">Order QR</option><option value="design">Design QR</option><option value="pickup">Pickup QR</option></select><input class="input" name="referenceId" value="ORD-1001" placeholder="Order ID or Design ID" /><button class="button">Generate QR</button><p class="muted">Use the generated code to retrieve design, order, or pickup records instantly.</p></form>
          <div class="card center stack"><div class="eyebrow">Generated QR</div>${state.qrRecord ? `<img class="qr-preview" src="${state.qrRecord.image}" alt="QR preview" /><pre>${escapeHtml(state.qrRecord.data)}</pre>` : '<p class="muted">Generate a QR code to preview it here.</p>'}</div>
        </div>
      </div>
    </section>
  `);
}

function aboutPage() {
  return shell(`
    <section class="section"><div class="eyebrow">About Wearables Studio</div><h1 class="title-lg">A luxury operating system for custom apparel retail.</h1><p class="muted">This platform was designed around a store-first payment journey: customers place orders online, receive QR-linked records, and complete payment with a cashier before production starts.</p></section>
    <section class="grid-2"><div class="card stack"><h3>Why no online payments?</h3><p class="muted">The brand keeps payment confirmation inside the store to preserve service quality, reduce chargeback complexity, and maintain a luxury handoff.</p></div><div class="card stack"><h3>How QR supports operations</h3><p class="muted">Design, order, and pickup QR records help staff retrieve jobs instantly and move customers through payment and collection with less friction.</p></div></section>
  `);
}

function notFoundPage() {
  return shell(`<section class="card stack center"><div class="eyebrow">404</div><h1 class="title-lg">Page not found.</h1><button class="button" data-action="go-home">Return Home</button></section>`);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function render() {
  app.innerHTML = route();
}

(async function init() {
  await loadBootstrap();
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.url.includes('/api/qr') && response.ok) {
      const clone = response.clone();
      clone.json().then((data) => { state.qrRecord = data.record; render(); }).catch(() => {});
    }
    return response;
  };
  render();
})();
