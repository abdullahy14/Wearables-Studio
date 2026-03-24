const { CREATOR_COMMISSION, ORDER_FLOW, SHIRT_PRICE } = require('./store');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currency(value) {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value);
}

function dateTime(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function nav(user) {
  const auth = user
    ? `<span class="muted">${escapeHtml(user.name)}</span><form method="post" action="/logout"><button class="button-ghost" type="submit">Logout</button></form>`
    : `<a href="/login">Login</a><a href="/signup" class="button">Sign up</a>`;
  return `
    <header class="site-header">
      <div class="container header-inner">
        <a href="/" class="brand"><strong>Wearables Studio</strong><span>Luxury custom apparel, paid in store.</span></a>
        <nav class="desktop-nav">
          <a href="/">Home</a>
          <a href="/design">Design Studio</a>
          <a href="/creator-hub">Creator Hub</a>
          <a href="/checkout">Checkout</a>
          <a href="/about">About</a>
          ${user && user.role === 'admin' ? '<a href="/dashboard">Dashboard</a>' : ''}
        </nav>
        <div class="utility-nav">${auth}</div>
      </div>
    </header>
    <nav class="mobile-nav">
      <a href="/">Home</a>
      <a href="/design">Design</a>
      <a href="/creator-hub">Creators</a>
      <a href="/checkout">Checkout</a>
    </nav>
  `;
}

function footer() {
  return `<footer><div class="container footer-inner"><div><strong>Wearables Studio</strong><p class="muted">Designed online. Paid in store. Finished with luxury-level execution.</p></div><div class="muted">Open daily · 10:00 to 22:00 · Cairo showroom</div></div></footer>`;
}

function renderPage({ title, body, user, script = '' }) {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} · Wearables Studio</title>
    <meta name="description" content="Premium custom apparel platform with in-store payment workflows and QR-powered pickup." />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="page-shell">
      ${nav(user)}
      <main>${body}</main>
      ${footer()}
    </div>
    <script src="/app.js"></script>
    ${script ? `<script>${script}</script>` : ''}
  </body>
  </html>`;
}

function productCard(design, creator) {
  return `<article class="card">
    <div class="card-media"><img src="${escapeHtml(design.imageUrl)}" alt="${escapeHtml(design.title)}" loading="lazy" /></div>
    <div class="card-body grid compact">
      <div class="between"><div><h3>${escapeHtml(design.title)}</h3><div class="muted">by ${escapeHtml((creator && creator.name) || 'Wearables Studio')}</div></div><span class="label">${currency(design.price)}</span></div>
      <p class="muted">${escapeHtml(design.description)}</p>
      <div class="between"><span class="muted">${design.salesCount} sales</span><a class="button-ghost" href="/product/${encodeURIComponent(design.id)}">View product</a></div>
    </div>
  </article>`;
}

function homePage({ designs, creators, user }) {
  const cards = designs.map((design) => productCard(design, creators[design.creatorId])).join('');
  return renderPage({
    title: 'Home',
    user,
    body: `
      <section class="hero"><div class="container split hero-grid"><div class="grid spacious"><span class="eyebrow">Premium custom apparel · In-store payment workflow</span><h1>Luxury merch experiences for discerning brands and creators.</h1><p class="muted lead">Wearables Studio blends a refined design editor, curated creator marketplace, QR-powered pickup, and cashier-first operations—without online payments.</p><div class="actions"><a href="/design" class="button">Start designing</a><a href="/creator-hub" class="button-secondary">Explore creators</a></div></div><div class="panel surface"><div class="grid cols-2">${[
        ['Price per shirt', '500 EGP'],
        ['Creator commission', '50 EGP'],
        ['Production cost', '275 EGP'],
        ['Payment flow', 'In-store only']
      ].map(([label, value]) => `<div class="metric"><div class="muted">${label}</div><div class="kpi">${value}</div></div>`).join('')}</div></div></div></section>
      <section class="section surface"><div class="container grid spacious"><div class="between end"><div><span class="eyebrow">Curated drops</span><h2>Signature creator-led releases.</h2></div><a href="/creator-hub" class="button-ghost">Visit marketplace</a></div><div class="grid cols-3">${cards}</div></div></section>
      <section class="section"><div class="container grid cols-3">${[
        ['Design editor', 'Upload artwork, position typography, and preview composition directly on a tee mockup.'],
        ['No online payments', 'All orders remain pending until a cashier confirms payment in the physical store.'],
        ['QR-powered operations', 'Generate design, order, and pickup QR flows for lightning-fast in-store retrieval.']
      ].map(([title, text]) => `<div class="panel"><h3>${title}</h3><p class="muted">${text}</p></div>`).join('')}</div></section>
    `
  });
}

function designPage({ user }) {
  return renderPage({
    title: 'Design Studio',
    user,
    body: `
      <section class="section"><div class="container"><div class="section-head"><span class="eyebrow">Premium composition lab</span><h1 class="compact-title">Build a polished apparel design in minutes.</h1></div><div class="split"><div class="panel"><div class="mockup"><div class="mockup-shirt"></div><div class="design-canvas" id="design-canvas"><div class="canvas-item canvas-text" id="canvas-text">Wearables Studio</div><img class="canvas-item canvas-image hidden" id="canvas-image" alt="Artwork preview" /></div></div></div><form class="panel form-grid" id="design-form"><div><h2>Design Studio</h2><p class="muted">Compose text and artwork, then publish directly to the creator marketplace.</p></div><label class="field"><span>Design title</span><input name="title" value="Untitled Luxury Tee" required /></label><label class="field"><span>Description</span><textarea name="description">Minimal luxury composition, ready for print.</textarea></label><label class="field"><span>Text content</span><input id="text-content" value="Wearables Studio" /></label><div class="grid cols-2"><label class="field"><span>Text X</span><input id="text-x" type="range" min="10" max="90" value="50" /></label><label class="field"><span>Text Y</span><input id="text-y" type="range" min="10" max="90" value="25" /></label><label class="field"><span>Font size</span><input id="text-size" type="range" min="16" max="56" value="28" /></label><label class="field"><span>Artwork upload</span><input id="artwork-upload" type="file" accept="image/*" /></label><label class="field"><span>Artwork X</span><input id="image-x" type="range" min="10" max="90" value="50" /></label><label class="field"><span>Artwork Y</span><input id="image-y" type="range" min="10" max="90" value="58" /></label></div><div class="notice">Designs are priced at 500 EGP. Published creator sales credit 50 EGP commission after completion.</div><input type="hidden" name="elements" id="design-elements" /><input type="hidden" name="imageUrl" id="design-image-url" value="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80" /><button class="button" type="submit">${user ? 'Save & publish design' : 'Login required to save'}</button><div id="design-message"></div></form></div></div></section>
    `,
    script: `window.WearablesStudio.initDesignStudio(${JSON.stringify({ signedIn: Boolean(user) })});`
  });
}

function creatorHubPage({ designs, creators, user }) {
  return renderPage({
    title: 'Creator Hub',
    user,
    body: `<section class="section"><div class="container grid spacious"><div><span class="eyebrow">Creator marketplace</span><h1 class="compact-title">Discover luxury-ready creator drops.</h1><p class="muted lead">Every approved design sells for 500 EGP. Creators earn ${currency(CREATOR_COMMISSION)} commission per completed order.</p></div><div class="grid cols-3">${designs.map((design) => productCard(design, creators[design.creatorId])).join('')}</div></div></section>`
  });
}

function productPage({ design, creator, user }) {
  return renderPage({
    title: design.title,
    user,
    body: `<section class="section"><div class="container split"><div class="panel card-media tall"><img src="${escapeHtml(design.imageUrl)}" alt="${escapeHtml(design.title)}" /></div><div class="panel form-grid"><span class="eyebrow">Ready-to-order apparel</span><div><h1 class="compact-title">${escapeHtml(design.title)}</h1><p class="muted">${escapeHtml(design.description)}</p></div><div class="grid cols-2"><div class="metric"><div class="muted">Price</div><div class="kpi">${currency(design.price)}</div></div><div class="metric"><div class="muted">Sales</div><div class="kpi">${design.salesCount}</div></div></div><div class="notice">Payment is collected only in store. Your order is reserved online and confirmed by a cashier.</div><div><strong>Creator</strong><p class="muted">${escapeHtml((creator && creator.name) || 'Wearables Studio')} · Published ${dateTime(design.createdAt)}</p></div><label class="field"><span>Size options</span><select>${['XS','S','M','L','XL'].map((size) => `<option>${size}</option>`).join('')}</select></label><div class="actions"><a href="/checkout?design=${encodeURIComponent(design.id)}" class="button">Add to cart / checkout</a>${creator ? `<a class="button-ghost" href="/creator/${encodeURIComponent(creator.name.toLowerCase().replace(/\s+/g, '-'))}">Visit creator</a>` : ''}</div></div></div></section>`
  });
}

function creatorProfilePage({ creator, designs, user }) {
  return renderPage({
    title: creator.name,
    user,
    body: `<section class="section"><div class="container grid spacious"><div class="panel surface split"><div><span class="eyebrow">Creator profile</span><h1 class="compact-title">${escapeHtml(creator.name)}</h1><p class="muted">Curating luxury-focused graphics for premium black and white apparel capsules.</p></div><div class="grid cols-2"><div class="metric"><div class="muted">Commission earned</div><div class="kpi">${currency(creator.earnings)}</div></div><div class="metric"><div class="muted">Published designs</div><div class="kpi">${designs.length}</div></div></div></div><div class="grid cols-3">${designs.map((design) => productCard(design, creator)).join('')}</div></div></section>`
  });
}

function checkoutPage({ designs, user, selectedDesignId }) {
  return renderPage({
    title: 'Checkout',
    user,
    body: `<section class="section"><div class="container"><div class="section-head"><span class="eyebrow">Reserve your order</span><h1 class="compact-title">Checkout designed for in-store payment.</h1></div><div class="split"><form class="panel form-grid" id="checkout-form"><div><h2>Checkout without online payment</h2><p class="muted">Orders are reserved online and paid manually at the store cashier desk.</p></div><label class="field"><span>Design</span><select name="designId" id="checkout-design">${designs.map((design) => `<option value="${escapeHtml(design.id)}" ${selectedDesignId === design.id ? 'selected' : ''}>${escapeHtml(design.title)}</option>`).join('')}</select></label><label class="field"><span>Size</span><select name="size">${['XS','S','M','L','XL'].map((size) => `<option>${size}</option>`).join('')}</select></label><label class="field"><span>Name</span><input name="customerName" value="${escapeHtml((user && user.name) || '')}" required /></label><label class="field"><span>Phone</span><input name="phone" value="${escapeHtml((user && user.phone) || '')}" required /></label><label class="field"><span>Notes</span><textarea name="notes" placeholder="Optional production or pickup notes"></textarea></label><div class="notice">No online payments are collected. The order remains <strong>Pending Payment</strong> until an admin marks it as paid in store.</div><button class="button" type="submit">Place order · ${currency(SHIRT_PRICE)}</button><div id="checkout-message"></div></form><div class="grid spacious"><div class="panel" id="checkout-preview"></div><div class="panel hidden" id="checkout-qr-panel"></div></div></div></div></section>`,
    script: `window.WearablesStudio.initCheckout(${JSON.stringify({ designs })});`
  });
}

function loginPage({ user, error }) {
  return renderPage({
    title: 'Login',
    user,
    body: `<section class="section surface"><div class="container split center"><div class="grid"><span class="eyebrow">Secure sign-in</span><h1 class="compact-title">Access your customer, creator, or cashier workspace.</h1><p class="muted">Demo accounts: admin@wearables.studio, creator@wearables.studio, customer@wearables.studio — password <strong>Studio@123</strong>.</p></div><form class="panel form-grid" method="post" action="/login"><label class="field"><span>Email</span><input name="email" type="email" required /></label><label class="field"><span>Password</span><input name="password" type="password" required /></label>${error ? `<div class="notice">${escapeHtml(error)}</div>` : ''}<button class="button" type="submit">Login</button></form></div></section>`
  });
}

function signupPage({ user, error }) {
  return renderPage({
    title: 'Signup',
    user,
    body: `<section class="section surface"><div class="container split center"><div class="grid"><span class="eyebrow">Create your account</span><h1 class="compact-title">Join as a customer or creator.</h1><p class="muted">Register to save designs, place in-store-payment orders, and track commissions.</p></div><form class="panel form-grid" method="post" action="/signup"><label class="field"><span>Name</span><input name="name" required /></label><label class="field"><span>Phone</span><input name="phone" required /></label><label class="field"><span>Role</span><select name="role"><option value="customer">Customer</option><option value="creator">Creator</option></select></label><label class="field"><span>Email</span><input name="email" type="email" required /></label><label class="field"><span>Password</span><input name="password" type="password" minlength="8" required /></label>${error ? `<div class="notice">${escapeHtml(error)}</div>` : ''}<button class="button" type="submit">Create account</button></form></div></section>`
  });
}

function aboutPage({ user }) {
  return renderPage({
    title: 'About',
    user,
    body: `<section class="section"><div class="container grid spacious"><div><span class="eyebrow">About Wearables Studio</span><h1 class="compact-title">Built for premium apparel retail operations.</h1></div><div class="grid cols-2"><div class="panel"><h3>Why no online payments?</h3><p class="muted">The experience is optimized around in-store payment confirmation, cashier control, and premium pickup service.</p></div><div class="panel"><h3>Operational model</h3><p class="muted">Orders progress from Pending Payment to Completed with manual oversight at every stage of production and pickup.</p></div></div></div></section>`
  });
}

function dashboardPage({ store, user, filter = 'All', qrImage = '', qrPayload = '', message = '' }) {
  const publicUsers = store.users.map(({ password, ...rest }) => rest);
  const filteredOrders = filter === 'All' ? store.orders : store.orders.filter((order) => order.status === filter);
  return renderPage({
    title: 'Dashboard',
    user,
    body: `<section class="section dashboard"><div class="container split start"><aside class="panel sidebar"><h3>Dashboard</h3><a href="#orders">Orders</a><a href="#designs">Designs</a><a href="#users">Users</a><a href="#qr">QR Generator</a><div class="notice">Manual cashier flow: mark payments in-store, then move production status forward.</div></aside><div class="grid spacious"><section class="grid cols-3">${[
      ['Orders', store.orders.length],
      ['Published designs', store.designs.length],
      ['Registered users', publicUsers.length]
    ].map(([label, value]) => `<div class="metric"><div class="muted">${label}</div><div class="kpi">${value}</div></div>`).join('')}</section><section id="orders" class="panel grid compact"><div class="between wrap"><div><h2>Order management</h2><p class="muted">Filter by lifecycle, confirm payment, request edits, or advance production.</p></div><form method="get" action="/dashboard" class="field inline-field"><span>Status filter</span><select name="status">${['All', ...ORDER_FLOW, 'Needs Edits', 'Cancelled'].map((status) => `<option ${filter === status ? 'selected' : ''}>${status}</option>`).join('')}</select><button class="button-ghost" type="submit">Apply</button></form></div>${message ? `<div class="notice">${escapeHtml(message)}</div>` : ''}<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th>Items</th><th>Actions</th></tr></thead><tbody>${filteredOrders.map((order) => `<tr><td><strong>${escapeHtml(order.id)}</strong><div class="muted">${dateTime(order.createdAt)}</div></td><td>${escapeHtml(order.customerName)}<div class="muted">${escapeHtml(order.phone)}</div></td><td>${escapeHtml(order.status)}</td><td>${escapeHtml(order.paymentStatus)}</td><td>${order.items.map((item) => `<div>${escapeHtml(item.title)} · ${escapeHtml(item.size)}</div>`).join('')}</td><td><div class="grid compact">${order.paymentStatus === 'Pending' ? `<form method="post" action="/dashboard/orders/${encodeURIComponent(order.id)}/mark-paid"><button class="button-ghost" type="submit">Mark as Paid</button></form>` : ''}<form method="post" action="/dashboard/orders/${encodeURIComponent(order.id)}/request-edits"><input type="hidden" name="message" value="Please adjust artwork alignment before print." /><button class="button-ghost" type="submit">Request Edits</button></form><form method="post" action="/dashboard/orders/${encodeURIComponent(order.id)}/status"><select name="status">${ORDER_FLOW.map((status) => `<option ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select><button class="button-ghost" type="submit">Update</button></form><form method="post" action="/dashboard/orders/${encodeURIComponent(order.id)}/cancel"><button class="button-ghost" type="submit">Cancel order</button></form></div></td></tr>`).join('')}</tbody></table></div></section><section id="designs" class="panel"><h2>Designs</h2><div class="grid cols-3 top-gap">${store.designs.map((design) => `<div class="metric"><strong>${escapeHtml(design.title)}</strong><div class="muted">${design.salesCount} sales · ${currency(design.price)}</div></div>`).join('')}</div></section><section id="users" class="panel"><h2>Users</h2><div class="grid cols-3 top-gap">${publicUsers.map((entry) => `<div class="metric"><strong>${escapeHtml(entry.name)}</strong><div class="muted">${escapeHtml(entry.role)}</div><div class="muted">${escapeHtml(entry.email)}</div></div>`).join('')}</div></section><section id="qr" class="panel grid cols-2"><form class="form-grid" method="get" action="/dashboard#qr"><div><h2>QR generator</h2><p class="muted">Generate design, order, or pickup QR codes on demand.</p></div><label class="field"><span>QR type</span><select name="qrType"><option value="order">Order</option><option value="pickup">Pickup</option><option value="design">Design</option></select></label><label class="field"><span>Order ID</span><input name="orderId" placeholder="order-1001" /></label><label class="field"><span>Design ID</span><input name="designId" placeholder="design-1" /></label><button class="button" type="submit">Generate QR image</button></form><div class="panel surface">${qrImage ? `<h3>Generated QR preview</h3><img src="${qrImage}" alt="Generated QR" class="qr-image" /><textarea class="qr-payload">${escapeHtml(qrPayload)}</textarea>` : '<h3>Generated QR preview</h3><p class="muted">Generate a QR code to preview and download it here.</p>'}<div class="top-gap"><h3>QR scan simulation</h3><form id="scan-form" class="form-grid"><label class="field"><span>Paste raw QR JSON</span><textarea id="scan-input" placeholder='{"orderId":"order-1001"}'></textarea></label><button class="button-ghost" type="submit">Retrieve order from QR</button><div id="scan-result"></div></form></div></div></section></div></div></section>`,
    script: `window.WearablesStudio.initDashboardScanner();`
  });
}

function notFoundPage({ user }) {
  return renderPage({
    title: 'Not Found',
    user,
    body: `<section class="section"><div class="container panel"><h1 class="compact-title">Page not found.</h1><p class="muted">The page you requested doesn’t exist.</p><a href="/" class="button">Return home</a></div></section>`
  });
}

module.exports = {
  aboutPage,
  checkoutPage,
  creatorHubPage,
  creatorProfilePage,
  dashboardPage,
  designPage,
  homePage,
  loginPage,
  notFoundPage,
  productPage,
  signupPage,
  currency,
  escapeHtml
};
