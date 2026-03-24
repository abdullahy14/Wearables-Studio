const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const { clearSessionCookie, hashPassword, parseCookies, sessionCookie, verifyPassword, verifySession } = require('./lib/auth');
const { renderQrDataUrl } = require('./lib/qr');
const {
  createDesign,
  createOrder,
  createQrRecord,
  createUser,
  getCreatorByUsername,
  getDesignById,
  getFullUserById,
  getOrderById,
  getPublishedDesigns,
  getStore,
  getUserByEmail,
  getUserById,
  publicUser,
  updateOrderStatus
} = require('./lib/store');
const {
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
  signupPage
} = require('./lib/templates');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(process.cwd(), 'public');

function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return { raw };
}

async function serveStatic(res, pathname) {
  const file = path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));
  const ext = path.extname(file);
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };
  try {
    const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function currentUser(req) {
  const cookies = parseCookies(req);
  const session = verifySession(cookies.wearables_session);
  if (!session || !session.userId) return null;
  return getUserById(session.userId);
}

function requireAdmin(res, user) {
  if (!user || user.role !== 'admin') {
    redirect(res, '/login');
    return false;
  }
  return true;
}

function creatorMap(users) {
  return Object.fromEntries(users.map((user) => [user.id, publicUser(user)]));
}

function buildOrderPayload(order) {
  return {
    orderId: order.id,
    customerName: order.customerName,
    phone: order.phone,
    totalPrice: order.totalPrice,
    status: order.status,
    items: order.items
  };
}

function buildPickupPayload(order) {
  return {
    orderId: order.id,
    pickupCode: `${order.id}-pickup`,
    status: order.status,
    phone: order.phone
  };
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;
  const user = await currentUser(req);

  if (pathname === '/styles.css' || pathname === '/app.js') {
    const ok = await serveStatic(res, pathname);
    if (!ok) json(res, 404, { error: 'Asset not found.' });
    return;
  }

  if (req.method === 'GET' && pathname === '/') {
    const store = await getStore();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(homePage({ designs: store.designs.filter((d) => d.isPublished).slice(0, 3), creators: creatorMap(store.users), user }));
    return;
  }

  if (req.method === 'GET' && pathname === '/design') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(designPage({ user }));
    return;
  }

  if (req.method === 'GET' && pathname === '/creator-hub') {
    const store = await getStore();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(creatorHubPage({ designs: store.designs.filter((d) => d.isPublished), creators: creatorMap(store.users), user }));
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/product/')) {
    const id = decodeURIComponent(pathname.split('/')[2] || '');
    const design = await getDesignById(id);
    if (!design) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(notFoundPage({ user }));
      return;
    }
    const creator = await getFullUserById(design.creatorId);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(productPage({ design, creator: creator ? publicUser(creator) : null, user }));
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/creator/')) {
    const username = decodeURIComponent(pathname.split('/')[2] || '');
    const entry = await getCreatorByUsername(username);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(notFoundPage({ user }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(creatorProfilePage({ creator: entry.creator, designs: entry.designs, user }));
    return;
  }

  if (req.method === 'GET' && pathname === '/checkout') {
    const designs = await getPublishedDesigns();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(checkoutPage({ designs, user, selectedDesignId: requestUrl.searchParams.get('design') || designs[0]?.id }));
    return;
  }

  if (req.method === 'GET' && pathname === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(loginPage({ user, error: requestUrl.searchParams.get('error') }));
    return;
  }

  if (req.method === 'POST' && pathname === '/login') {
    const body = await readBody(req);
    const account = await getUserByEmail(body.email || '');
    if (!account || !verifyPassword(body.password || '', account.password)) {
      redirect(res, '/login?error=Invalid%20email%20or%20password');
      return;
    }
    redirect(res, account.role === 'admin' ? '/dashboard' : '/', { 'Set-Cookie': sessionCookie({ userId: account.id, role: account.role }) });
    return;
  }

  if (req.method === 'GET' && pathname === '/signup') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(signupPage({ user, error: requestUrl.searchParams.get('error') }));
    return;
  }

  if (req.method === 'POST' && pathname === '/signup') {
    const body = await readBody(req);
    if (!body.name || !body.phone || !body.email || !body.password) {
      redirect(res, '/signup?error=All%20fields%20are%20required');
      return;
    }
    const existing = await getUserByEmail(body.email);
    if (existing) {
      redirect(res, '/signup?error=Email%20is%20already%20registered');
      return;
    }
    const account = await createUser({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: hashPassword(body.password),
      role: body.role === 'creator' ? 'creator' : 'customer'
    });
    redirect(res, '/', { 'Set-Cookie': sessionCookie({ userId: account.id, role: account.role }) });
    return;
  }

  if (req.method === 'POST' && pathname === '/logout') {
    redirect(res, '/', { 'Set-Cookie': clearSessionCookie() });
    return;
  }

  if (req.method === 'GET' && pathname === '/about') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(aboutPage({ user }));
    return;
  }

  if (req.method === 'GET' && pathname === '/dashboard') {
    if (!requireAdmin(res, user)) return;
    const store = await getStore();
    const qrType = requestUrl.searchParams.get('qrType');
    const orderId = requestUrl.searchParams.get('orderId');
    const designId = requestUrl.searchParams.get('designId');
    let qrImage = '';
    let qrPayload = '';
    if (qrType === 'design' && designId) {
      const design = await getDesignById(designId);
      if (design) {
        const payload = { designId: design.id, route: `/product/${design.id}`, title: design.title };
        qrPayload = JSON.stringify(payload, null, 2);
        qrImage = renderQrDataUrl(JSON.stringify(payload));
        await createQrRecord('design', payload);
      }
    }
    if ((qrType === 'order' || qrType === 'pickup') && orderId) {
      const order = await getOrderById(orderId);
      if (order) {
        const payload = qrType === 'order' ? buildOrderPayload(order) : buildPickupPayload(order);
        qrPayload = JSON.stringify(payload, null, 2);
        qrImage = renderQrDataUrl(JSON.stringify(payload));
        await createQrRecord(qrType, payload);
      }
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(dashboardPage({ store, user, filter: requestUrl.searchParams.get('status') || 'All', qrImage, qrPayload, message: requestUrl.searchParams.get('message') || '' }));
    return;
  }

  if (req.method === 'POST' && pathname.match(/^\/dashboard\/orders\/[^/]+\/mark-paid$/)) {
    if (!requireAdmin(res, user)) return;
    const id = decodeURIComponent(pathname.split('/')[3]);
    await updateOrderStatus(id, 'Paid', 'Cashier confirmed in-store payment.');
    redirect(res, '/dashboard?message=Order%20marked%20as%20paid#orders');
    return;
  }

  if (req.method === 'POST' && pathname.match(/^\/dashboard\/orders\/[^/]+\/cancel$/)) {
    if (!requireAdmin(res, user)) return;
    const id = decodeURIComponent(pathname.split('/')[3]);
    await updateOrderStatus(id, 'Cancelled', 'Order cancelled by store team.');
    redirect(res, '/dashboard?message=Order%20cancelled#orders');
    return;
  }

  if (req.method === 'POST' && pathname.match(/^\/dashboard\/orders\/[^/]+\/request-edits$/)) {
    if (!requireAdmin(res, user)) return;
    const id = decodeURIComponent(pathname.split('/')[3]);
    const body = await readBody(req);
    await updateOrderStatus(id, 'Needs Edits', body.message || 'Production requested design edits.');
    redirect(res, '/dashboard?message=Edit%20request%20sent#orders');
    return;
  }

  if (req.method === 'POST' && pathname.match(/^\/dashboard\/orders\/[^/]+\/status$/)) {
    if (!requireAdmin(res, user)) return;
    const id = decodeURIComponent(pathname.split('/')[3]);
    const body = await readBody(req);
    await updateOrderStatus(id, body.status, `Status updated to ${body.status}.`);
    redirect(res, '/dashboard?message=Order%20status%20updated#orders');
    return;
  }

  if (req.method === 'POST' && pathname === '/api/designs') {
    if (!user) {
      json(res, 401, { error: 'Authentication required.' });
      return;
    }
    const body = await readBody(req);
    if (!body.title || !body.imageUrl) {
      json(res, 400, { error: 'Title and artwork are required.' });
      return;
    }
    const design = await createDesign({
      creatorId: user.id,
      title: body.title,
      description: body.description || '',
      imageUrl: body.imageUrl,
      elements: body.elements || [],
      isPublished: true
    });
    json(res, 200, { design });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    const body = await readBody(req);
    if (!body.designId || !body.size || !body.customerName || !body.phone) {
      json(res, 400, { error: 'Design, size, name, and phone are required.' });
      return;
    }
    const order = await createOrder({
      userId: user ? user.id : 'guest-user',
      customerName: body.customerName,
      phone: body.phone,
      notes: body.notes,
      designId: body.designId,
      size: body.size
    });
    if (!order) {
      json(res, 404, { error: 'Selected design was not found.' });
      return;
    }
    const orderPayload = buildOrderPayload(order);
    const pickupPayload = buildPickupPayload(order);
    await createQrRecord('order', orderPayload);
    await createQrRecord('pickup', pickupPayload);
    json(res, 200, {
      order,
      orderQr: renderQrDataUrl(JSON.stringify(orderPayload)),
      pickupQr: renderQrDataUrl(JSON.stringify(pickupPayload))
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/qr') {
    const type = requestUrl.searchParams.get('type');
    const id = requestUrl.searchParams.get('id');
    if (!type || !id) {
      json(res, 400, { error: 'type and id are required.' });
      return;
    }
    let payload = null;
    if (type === 'design') {
      const design = await getDesignById(id);
      if (design) payload = { designId: design.id, route: `/product/${design.id}`, title: design.title };
    }
    if (type === 'order' || type === 'pickup') {
      const order = await getOrderById(id);
      if (order) payload = type === 'order' ? buildOrderPayload(order) : buildPickupPayload(order);
    }
    if (!payload) {
      json(res, 404, { error: 'Resource not found.' });
      return;
    }
    await createQrRecord(type, payload);
    json(res, 200, { qr: renderQrDataUrl(JSON.stringify(payload)), payload });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(notFoundPage({ user }));
});

server.listen(PORT, () => {
  console.log(`Wearables Studio running at http://localhost:${PORT}`);
});
