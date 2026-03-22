export const SHIRT_PRICE = 500;
export const SHIRT_COST = 275;
export const CREATOR_COMMISSION = 50;

export const db = {
  users: [
    { id: 'user-1', name: 'Lina Hassan', email: 'lina@wearables.studio', password: 'password123', role: 'customer', earnings: 0, username: 'linah' },
    { id: 'creator-1', name: 'Mariam Nader', email: 'mariam@wearables.studio', password: 'password123', role: 'creator', earnings: 1250, username: 'mariam-nader', bio: 'Minimal monochrome designer crafting premium drops inspired by editorial fashion.' },
    { id: 'admin-1', name: 'Store Manager', email: 'admin@wearables.studio', password: 'password123', role: 'admin', earnings: 0, username: 'admin', bio: 'Cashier and store operations lead.' }
  ],
  designs: [
    { id: 'design-1', creatorId: 'creator-1', title: 'Atelier Noir', imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', price: SHIRT_PRICE, isPublished: true, salesCount: 32, description: 'A premium monochrome composition tailored for elevated streetwear.', tags: ['black', 'minimal', 'premium'] },
    { id: 'design-2', creatorId: 'creator-1', title: 'Gallery Type', imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80', price: SHIRT_PRICE, isPublished: true, salesCount: 18, description: 'Editorial typography with understated beige accents for a gallery-inspired drop.', tags: ['editorial', 'beige', 'type'] },
    { id: 'design-3', creatorId: 'creator-1', title: 'Studio Lines', imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80', price: SHIRT_PRICE, isPublished: true, salesCount: 12, description: 'Architectural line work engineered for clean luxury basics.', tags: ['lines', 'luxury', 'architecture'] }
  ],
  orders: [
    { id: 'ORD-1001', userId: 'user-1', customerName: 'Lina Hassan', phone: '+20 100 123 4567', notes: 'Please keep the packaging minimal.', status: 'Pending Payment', totalPrice: 500, paymentStatus: 'Pending', items: [{ productId: 'design-1', designId: 'design-1', size: 'M', quantity: 1, unitPrice: 500 }], createdAt: new Date().toISOString() },
    { id: 'ORD-1002', userId: 'user-1', customerName: 'Lina Hassan', phone: '+20 100 123 4567', status: 'Ready for Pickup', totalPrice: 1000, paymentStatus: 'Paid', items: [{ productId: 'design-2', designId: 'design-2', size: 'L', quantity: 2, unitPrice: 500 }], createdAt: new Date(Date.now() - 86400000).toISOString() }
  ],
  qrCodes: []
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
