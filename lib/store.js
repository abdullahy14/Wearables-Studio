const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join(process.cwd(), 'data', 'store.json');
const SHIRT_PRICE = 500;
const CREATOR_COMMISSION = 50;
const ORDER_FLOW = ['Pending Payment', 'Paid', 'Processing', 'Printed', 'Ready for Pickup', 'Completed'];

async function readStore() {
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

async function getStore() {
  return readStore();
}

async function getUserByEmail(email) {
  const store = await readStore();
  return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

async function getUserById(id) {
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === id);
  return user ? publicUser(user) : null;
}

async function getFullUserById(id) {
  const store = await readStore();
  return store.users.find((entry) => entry.id === id) || null;
}

async function createUser({ name, email, password, role, phone }) {
  const store = await readStore();
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    role,
    earnings: 0,
    phone
  };
  store.users.push(user);
  await writeStore(store);
  return publicUser(user);
}

async function createDesign({ creatorId, title, description, imageUrl, elements, isPublished }) {
  const store = await readStore();
  const design = {
    id: crypto.randomUUID(),
    creatorId,
    title,
    description,
    imageUrl,
    price: SHIRT_PRICE,
    isPublished,
    salesCount: 0,
    elements: elements || [],
    createdAt: new Date().toISOString()
  };
  store.designs.unshift(design);
  await writeStore(store);
  return design;
}

async function getDesignById(id) {
  const store = await readStore();
  return store.designs.find((design) => design.id === id) || null;
}

async function getPublishedDesigns() {
  const store = await readStore();
  return store.designs.filter((design) => design.isPublished);
}

async function getCreatorByUsername(username) {
  const normalized = username.replace(/-/g, ' ').toLowerCase();
  const store = await readStore();
  const creator = store.users.find((user) => user.role === 'creator' && user.name.toLowerCase() === normalized);
  if (!creator) return null;
  return {
    creator: publicUser(creator),
    designs: store.designs.filter((design) => design.creatorId === creator.id && design.isPublished)
  };
}

async function createOrder({ userId, customerName, phone, notes, designId, size }) {
  const store = await readStore();
  const design = store.designs.find((entry) => entry.id === designId);
  if (!design) return null;
  const now = new Date().toISOString();
  const order = {
    id: `order-${Math.floor(Date.now() / 1000)}`,
    userId,
    status: 'Pending Payment',
    paymentStatus: 'Pending',
    totalPrice: SHIRT_PRICE,
    notes: notes || '',
    phone,
    customerName,
    items: [
      {
        productId: design.id,
        designId: design.id,
        title: `${design.title} Tee`,
        size,
        price: SHIRT_PRICE,
        quantity: 1,
        creatorId: design.creatorId
      }
    ],
    createdAt: now,
    updatedAt: now,
    history: [
      {
        status: 'Pending Payment',
        timestamp: now,
        note: 'Order created online. Awaiting manual in-store payment.'
      }
    ]
  };
  store.orders.unshift(order);
  await writeStore(store);
  return order;
}

async function getOrderById(id) {
  const store = await readStore();
  return store.orders.find((order) => order.id === id) || null;
}

async function updateOrderStatus(id, status, note) {
  const store = await readStore();
  const order = store.orders.find((entry) => entry.id === id);
  if (!order) return null;
  order.status = status;
  if (ORDER_FLOW.indexOf(status) >= ORDER_FLOW.indexOf('Paid')) {
    order.paymentStatus = 'Paid';
  }
  order.updatedAt = new Date().toISOString();
  order.history.unshift({ status, timestamp: order.updatedAt, note });

  if (status === 'Completed') {
    order.items.forEach((item) => {
      const design = store.designs.find((entry) => entry.id === item.designId);
      if (design) design.salesCount += item.quantity;
      const creator = store.users.find((entry) => entry.id === item.creatorId);
      if (creator) creator.earnings += CREATOR_COMMISSION * item.quantity;
    });
  }

  await writeStore(store);
  return order;
}

async function createQrRecord(type, data) {
  const store = await readStore();
  const record = {
    id: crypto.randomUUID(),
    type,
    data,
    generatedAt: new Date().toISOString()
  };
  store.qrcodes.unshift(record);
  await writeStore(store);
  return record;
}

module.exports = {
  CREATOR_COMMISSION,
  ORDER_FLOW,
  SHIRT_PRICE,
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
};
