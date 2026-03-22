import { promises as fs } from 'fs';
import path from 'path';

import { randomId } from './utils';
import { StoreData, Order, OrderStatus, PaymentStatus, Design, QrCodeRecord, User } from './types';

const storePath = path.join(process.cwd(), 'data', 'store.json');

async function readStore(): Promise<StoreData> {
  const raw = await fs.readFile(storePath, 'utf8');
  return JSON.parse(raw) as StoreData;
}

async function writeStore(data: StoreData) {
  await fs.writeFile(storePath, JSON.stringify(data, null, 2));
}

export async function getStore() {
  return readStore();
}

export async function findUserByEmail(email: string) {
  const store = await readStore();
  return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  const store = await readStore();
  return store.users.find((user) => user.id === id) ?? null;
}

export async function createUser(user: Omit<User, 'id' | 'earnings'> & { id?: string; earnings?: number }) {
  const store = await readStore();
  const newUser: User = {
    ...user,
    id: user.id ?? randomId('user'),
    earnings: user.earnings ?? 0
  };
  store.users.push(newUser);
  await writeStore(store);
  return newUser;
}

export async function listPublishedDesigns() {
  const store = await readStore();
  return store.designs.filter((design) => design.isPublished);
}

export async function listDesigns() {
  const store = await readStore();
  return store.designs;
}

export async function getDesignById(id: string) {
  const store = await readStore();
  return store.designs.find((design) => design.id === id) ?? null;
}

export async function createDesign(design: Omit<Design, 'id' | 'createdAt' | 'salesCount'>) {
  const store = await readStore();
  const newDesign: Design = {
    ...design,
    id: randomId('design'),
    createdAt: new Date().toISOString(),
    salesCount: 0
  };
  store.designs.unshift(newDesign);
  await writeStore(store);
  return newDesign;
}

export async function listOrders() {
  const store = await readStore();
  return [...store.orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function getOrderById(id: string) {
  const store = await readStore();
  return store.orders.find((order) => order.id === id) ?? null;
}

export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
  const store = await readStore();
  const newOrder: Order = {
    ...order,
    id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.orders.unshift(newOrder);
  await writeStore(store);
  return newOrder;
}

export async function updateOrder(
  id: string,
  updates: Partial<Pick<Order, 'status' | 'paymentStatus' | 'notes'>>
) {
  const store = await readStore();
  const index = store.orders.findIndex((order) => order.id === id);
  if (index === -1) {
    return null;
  }

  store.orders[index] = {
    ...store.orders[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await writeStore(store);
  return store.orders[index];
}

export async function generateQrCode(type: QrCodeRecord['type'], entityId: string, data: string) {
  const store = await readStore();
  const record: QrCodeRecord = {
    id: randomId('qr'),
    type,
    entityId,
    data,
    generatedAt: new Date().toISOString()
  };
  store.qrCodes.unshift(record);
  await writeStore(store);
  return record;
}

export async function getDashboardData() {
  const store = await readStore();
  const revenue = store.orders
    .filter((order) => order.paymentStatus === 'Paid')
    .reduce((sum, order) => sum + order.totalPrice, 0);
  const pendingOrders = store.orders.filter((order) => order.status === 'Pending Payment').length;

  return {
    orders: [...store.orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    designs: store.designs,
    users: store.users,
    stats: {
      revenue,
      pendingOrders,
      totalDesigns: store.designs.length,
      creators: store.users.filter((user) => user.role === 'creator').length
    }
  };
}

export function getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
  const statusFlow: OrderStatus[] = [
    'Pending Payment',
    'Paid',
    'Processing',
    'Printed',
    'Ready for Pickup',
    'Completed'
  ];

  const currentIndex = statusFlow.indexOf(currentStatus);
  return currentIndex >= 0 && currentIndex < statusFlow.length - 1
    ? statusFlow[currentIndex + 1]
    : null;
}

export function getStatusForAction(action: string, currentStatus: OrderStatus) {
  switch (action) {
    case 'mark-paid':
      return {
        status: 'Paid' as OrderStatus,
        paymentStatus: 'Paid' as PaymentStatus
      };
    case 'cancel':
      return {
        status: 'Cancelled' as OrderStatus,
        paymentStatus: 'Pending' as PaymentStatus
      };
    case 'request-edits':
      return {
        status: 'Design Edits Requested' as OrderStatus,
        paymentStatus: 'Pending' as PaymentStatus
      };
    case 'advance-status': {
      const nextStatus = getNextStatus(currentStatus);
      return nextStatus
        ? {
            status: nextStatus,
            paymentStatus: nextStatus === 'Pending Payment' ? 'Pending' : ('Paid' as PaymentStatus)
          }
        : null;
    }
    default:
      return null;
  }
}
