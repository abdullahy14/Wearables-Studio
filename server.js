import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CREATOR_COMMISSION,
  SHIRT_PRICE,
  createDesign,
  saveDesignExport,
  createOrder,
  createQrRecord,
  createUser,
  db,
  getSiteConfig,
  listPreviewConfigs,
  savePreviewConfig,
  updateSiteConfig,
  findCreator,
  findDesign,
  findOrder,
  findUserByCredentials,
  sanitizeUser,
  updateOrder
} from './src/data.js';
import { generateQrDataUrl } from './src/qr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const styles = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getCreatorName(creatorId) {
  return db.users.find((user) => user.id === creatorId)?.name || 'Wearables Creator';
}

function buildBootstrap() {
  const siteConfig = getSiteConfig();
  return {
    brand: { price: siteConfig.price ?? SHIRT_PRICE, commission: siteConfig.commission ?? CREATOR_COMMISSION },
    siteConfig,
    designs: db.designs.map((design) => ({ ...design, creatorName: getCreatorName(design.creatorId) })),
    creators: db.users.filter((user) => user.role === 'creator').map(sanitizeUser),
    orders: db.orders,
    supportTickets: db.supportTickets,
    users: db.users.map(sanitizeUser)
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/styles.css') return sendText(res, 200, styles, 'text/css; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/app.js') return sendText(res, 200, appJs, 'application/javascript; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/api/qr-preview') {
    const data = url.searchParams.get('data') || '{}';
    const image = generateQrDataUrl(data);
    const [, base64] = image.split(',');
    return sendText(res, 200, Buffer.from(base64, 'base64'), 'image/svg+xml');
  }
  if (req.method === 'GET' && url.pathname === '/api/bootstrap') return sendJson(res, 200, buildBootstrap());
  if (req.method === 'GET' && url.pathname === '/api/orders') return sendJson(res, 200, { orders: db.orders });
  if (req.method === 'GET' && url.pathname.startsWith('/api/orders/')) {
    const id = url.pathname.split('/')[3];
    const order = findOrder(id);
    return order ? sendJson(res, 200, { order }) : sendJson(res, 404, { error: 'Order not found' });
  }
  if (req.method === 'GET' && url.pathname === '/api/designs') return sendJson(res, 200, { designs: db.designs });
  if (req.method === 'GET' && url.pathname === '/api/design-exports') return sendJson(res, 200, { exports: db.designExports });
  if (req.method === 'GET' && url.pathname === '/api/preview-configs') return sendJson(res, 200, { configs: listPreviewConfigs() });
  if (req.method === 'GET' && url.pathname === '/api/site-config') return sendJson(res, 200, { siteConfig: getSiteConfig() });
  if (req.method === 'GET' && url.pathname.startsWith('/api/designs/')) {
    const id = url.pathname.split('/')[3];
    const design = findDesign(id);
    return design ? sendJson(res, 200, { design }) : sendJson(res, 404, { error: 'Design not found' });
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/creator/')) {
    const username = decodeURIComponent(url.pathname.split('/')[3] || '');
    const creator = findCreator(username);
    if (!creator) return sendJson(res, 404, { error: 'Creator not found' });
    return sendJson(res, 200, { creator: sanitizeUser(creator), designs: db.designs.filter((design) => design.creatorId === creator.id) });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const { email, password } = await parseBody(req).catch(() => ({}));
    const user = findUserByCredentials(email, password);
    return user ? sendJson(res, 200, { user: sanitizeUser(user) }) : sendJson(res, 401, { error: 'Invalid credentials' });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const body = await parseBody(req).catch(() => ({}));
    if (!body.name || !body.email || !body.password || !body.role) return sendJson(res, 400, { error: 'Missing required fields' });
    return sendJson(res, 201, { user: createUser(body) });
  }

  if (req.method === 'POST' && url.pathname === '/api/designs') {
    const body = await parseBody(req).catch(() => ({}));
    return sendJson(res, 201, { design: createDesign(body) });
  }

  if (req.method === 'POST' && url.pathname === '/api/design-exports') {
    const body = await parseBody(req).catch(() => ({}));
    if (!body.pngs || !body.surfaces) return sendJson(res, 400, { error: 'Missing export payload' });
    return sendJson(res, 201, { exportRecord: saveDesignExport(body) });
  }

  if (req.method === 'POST' && url.pathname === '/api/preview-configs') {
    const body = await parseBody(req).catch(() => ({}));
    if (!body.mappings) return sendJson(res, 400, { error: 'Missing preview mapping payload' });
    return sendJson(res, 201, { config: savePreviewConfig(body) });
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const body = await parseBody(req).catch(() => ({}));
    if (!body.customerName || !body.phone || !Array.isArray(body.items) || body.items.length === 0) return sendJson(res, 400, { error: 'Invalid order payload' });
    return sendJson(res, 201, { order: createOrder(body) });
  }

  if (req.method === 'PATCH' && url.pathname === '/api/site-config') {
    const body = await parseBody(req).catch(() => ({}));
    return sendJson(res, 200, { siteConfig: updateSiteConfig(body) });
  }

  if (req.method === 'PATCH' && /\/api\/orders\/[^/]+\/status/.test(url.pathname)) {
    const id = url.pathname.split('/')[3];
    const body = await parseBody(req).catch(() => ({}));
    const order = updateOrder(id, body);
    return order ? sendJson(res, 200, { order }) : sendJson(res, 404, { error: 'Order not found' });
  }

  if (req.method === 'POST' && url.pathname === '/api/qr') {
    const { type, referenceId, data } = await parseBody(req).catch(() => ({}));
    let payload = data;
    if (!payload && type === 'order') payload = findOrder(referenceId);
    if (!payload && type === 'design') payload = findDesign(referenceId);
    if (!payload && type === 'pickup') payload = { pickupFor: referenceId, order: findOrder(referenceId) };
    const record = createQrRecord(type || 'order', payload || { referenceId });
    return sendJson(res, 201, { record: { ...record, image: generateQrDataUrl(record.data) } });
  }

  if (req.method === 'GET') {
    return sendText(res, 200, html, 'text/html; charset=utf-8');
  }

  return sendJson(res, 404, { error: 'Not found' });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Wearables Studio running on http://localhost:${port}`);
});
