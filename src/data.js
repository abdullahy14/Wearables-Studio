export const SHIRT_PRICE = 500;
export const SHIRT_COST = 275;
export const CREATOR_COMMISSION = 50;

export const db = {
  users: [
    { id: 'user-1', name: 'Lina Hassan', email: 'lina@wearables.studio', password: 'password123', role: 'customer', earnings: 0, username: 'linah' },
    { id: 'creator-1', name: 'Mariam Nader', email: 'mariam@wearables.studio', password: 'password123', role: 'creator', earnings: 1250, username: 'mariam-nader', bio: 'Minimal monochrome designer crafting premium drops inspired by editorial fashion.' },
    { id: 'pos-1', name: 'In-Store POS', email: 'pos@wearables.studio', password: 'password123', role: 'admin', earnings: 0, username: 'pos-tablet', bio: 'Shared in-store tablet account for assisted customer sessions and QR handoff.' },
    { id: 'admin-1', name: 'Store Manager', email: 'admin@wearables.studio', password: 'password123', role: 'admin', earnings: 0, username: 'admin', bio: 'Cashier and store operations lead.' },
    { id: 'support-1', name: 'Tech Support', email: 'support@wearables.studio', password: 'password123', role: 'technical_support', earnings: 0, username: 'support', bio: 'Technical support operations dashboard user.' }
  ],
  designs: [
    { id: 'design-1', creatorId: 'creator-1', title: 'Atelier Noir', imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', gallery: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80'], price: SHIRT_PRICE, isPublished: true, salesCount: 32, likes: 142, comments: 19, description: 'A premium monochrome composition tailored for elevated streetwear.', tags: ['black', 'minimal', 'premium'] },
    { id: 'design-2', creatorId: 'creator-1', title: 'Gallery Type', imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80', gallery: ['https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80'], price: SHIRT_PRICE, isPublished: true, salesCount: 18, likes: 86, comments: 7, description: 'Editorial typography with understated beige accents for a gallery-inspired drop.', tags: ['editorial', 'beige', 'type'] },
    { id: 'design-3', creatorId: 'creator-1', title: 'Studio Lines', imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', gallery: ['https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80'], price: SHIRT_PRICE, isPublished: true, salesCount: 12, likes: 51, comments: 5, description: 'Architectural line work engineered for clean luxury basics.', tags: ['lines', 'luxury', 'architecture'] }
  ],
  orders: [
    { id: 'ORD-1001', userId: 'user-1', customerName: 'Lina Hassan', phone: '+20 100 123 4567', notes: 'Please keep the packaging minimal.', status: 'Pending Payment', totalPrice: 500, paymentStatus: 'Pending', items: [{ productId: 'design-1', designId: 'design-1', size: 'M', quantity: 1, unitPrice: 500 }], createdAt: new Date().toISOString() },
    { id: 'ORD-1002', userId: 'user-1', customerName: 'Lina Hassan', phone: '+20 100 123 4567', status: 'Ready for Pickup', totalPrice: 1000, paymentStatus: 'Paid', items: [{ productId: 'design-2', designId: 'design-2', size: 'L', quantity: 2, unitPrice: 500 }], createdAt: new Date(Date.now() - 86400000).toISOString() }
  ],
  qrCodes: [],
  designExports: [],
  previewConfigs: [],
  siteConfig: {
    price: SHIRT_PRICE,
    commission: CREATOR_COMMISSION,
    homepageImages: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1200&q=80'
    ],
    homepageSections: [
      { id: 'sec-1', title: 'Premium Monochrome', body: 'Clean black-and-white drops for high-end streetwear.' },
      { id: 'sec-2', title: 'Creator Spotlights', body: 'Highlight independent creators and limited capsule launches.' }
    ]
  }
};

export function sanitizeUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username, bio: user.bio, earnings: user.earnings };
}

export function findUserByCredentials(email, password) {
  return db.users.find((user) => user.email === email && user.password === password);
}

export function createUser({ name, email, password, role }) {
  const user = { id: `user-${Date.now()}`, name, email, password, role, earnings: 0, username: email.split('@')[0] };
  db.users.unshift(user);
  return sanitizeUser(user);
}

export function findDesign(id) {
  return db.designs.find((design) => design.id === id);
}

export function findCreator(username) {
  return db.users.find((user) => user.username === username && user.role === 'creator');
}

export function createDesign(payload) {
  const design = {
    id: `design-${Date.now()}`,
    creatorId: payload.creatorId,
    title: payload.title,
    imageUrl: payload.imageUrl,
    price: payload.price ?? SHIRT_PRICE,
    isPublished: payload.isPublished !== false,
    salesCount: 0,
    description: payload.description ?? '',
    tags: payload.tags ?? [],
    elements: payload.elements ?? []
  };
  db.designs.unshift(design);
  return design;
}

export function createOrder({ userId, customerName, phone, notes, items }) {
  const order = {
    id: `ORD-${String(Date.now()).slice(-6)}`,
    userId,
    customerName,
    phone,
    notes,
    status: 'Pending Payment',
    paymentStatus: 'Pending',
    totalPrice: items.reduce((sum, item) => sum + (item.price || item.unitPrice) * item.quantity, 0),
    items: items.map((item) => ({ productId: item.productId, designId: item.designId, size: item.size, quantity: item.quantity, unitPrice: item.price || item.unitPrice })),
    createdAt: new Date().toISOString()
  };
  let creatorCredits = 0;
  for (const item of order.items) {
    const design = findDesign(item.designId);
    if (!design?.creatorId) continue;
    const creator = db.users.find((user) => user.id === design.creatorId);
    if (!creator) continue;
    const credit = CREATOR_COMMISSION * (item.quantity || 1);
    creator.earnings = (creator.earnings || 0) + credit;
    design.salesCount = (design.salesCount || 0) + (item.quantity || 1);
    creatorCredits += credit;
  }
  order.creatorCredits = creatorCredits;
  db.orders.unshift(order);
  return order;
}

export function findOrder(id) {
  return db.orders.find((order) => order.id === id);
}

export function updateOrder(id, payload) {
  const order = findOrder(id);
  if (!order) return null;
  if (payload.status) order.status = payload.status;
  if (payload.paymentStatus) order.paymentStatus = payload.paymentStatus;
  return order;
}

export function createQrRecord(type, data) {
  const record = { id: `qr-${Date.now()}`, type, data: JSON.stringify(data), generatedAt: new Date().toISOString() };
  db.qrCodes.unshift(record);
  return record;
}

export function saveDesignExport(payload) {
  const record = {
    id: `export-${Date.now()}`,
    ownerId: payload.ownerId || 'guest',
    shirtColor: payload.shirtColor || 'black',
    sourceDesignId: payload.sourceDesignId || null,
    surfaces: payload.surfaces,
    pngs: payload.pngs,
    createdAt: new Date().toISOString()
  };
  db.designExports.unshift(record);
  return record;
}


export function savePreviewConfig(payload) {
  const record = {
    id: `preview-${Date.now()}`,
    designId: payload.designId || 'unknown',
    modelImageId: payload.modelImageId || 'front',
    mappings: payload.mappings || {},
    modelImages: payload.modelImages || {},
    createdAt: new Date().toISOString()
  };
  db.previewConfigs.unshift(record);
  return record;
}

export function listPreviewConfigs() {
  return db.previewConfigs;
}

export function getSiteConfig() {
  return db.siteConfig;
}

export function updateSiteConfig(payload) {
  db.siteConfig = {
    ...db.siteConfig,
    ...payload
  };
  return db.siteConfig;
}
