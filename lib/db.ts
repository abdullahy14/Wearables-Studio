import { promises as fs } from 'fs';
import path from 'path';
import type { AppDatabase, Design, Order, QRCodeRecord, User } from '@/lib/types';
import { hashPassword } from '@/lib/crypto';

const dbPath = path.join(process.cwd(), 'data', 'store.json');

const baseDesigns = (): Design[] => [
  {
    id: 'design-1',
    creatorId: 'user-creator-1',
    title: 'Monogram Noir',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    price: 500,
    isPublished: true,
    salesCount: 12,
    mockupLabel: 'Oversized Signature Tee',
    createdAt: new Date().toISOString(),
    elements: [
      { id: 'text-1', type: 'text', content: 'WS', x: 122, y: 140, color: '#0B0B0B', fontSize: 48 },
      { id: 'text-2', type: 'text', content: 'Monogram Noir', x: 88, y: 198, color: '#8A8A8A', fontSize: 18 }
    ]
  },
  {
    id: 'design-2',
    creatorId: 'user-creator-2',
    title: 'Atelier Grid',
    imageUrl: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80',
    price: 500,
    isPublished: true,
    salesCount: 8,
    mockupLabel: 'Gallery Cut Tee',
    createdAt: new Date().toISOString(),
    elements: [
      { id: 'text-3', type: 'text', content: 'ATELIER', x: 94, y: 112, color: '#0B0B0B', fontSize: 32 },
      { id: 'text-4', type: 'text', content: 'Wearables Studio', x: 72, y: 154, color: '#8A8A8A', fontSize: 16 }
    ]
  }
];

const baseUsers = (): User[] => [
  {
    id: 'user-admin-1',
    name: 'Store Manager',
    email: 'admin@wearables.studio',
    passwordHash: hashPassword('Admin123!'),
    role: 'admin',
    earnings: 0,
    username: 'storemanager',
    bio: 'Cashier and store operations lead.'
  },
  {
    id: 'user-creator-1',
    name: 'Nour Atelier',
    email: 'nour@wearables.studio',
    passwordHash: hashPassword('Creator123!'),
    role: 'creator',
    earnings: 1800,
    username: 'nouratelier',
    bio: 'Minimal monochrome designer inspired by gallery spaces.'
  },
  {
    id: 'user-creator-2',
    name: 'Layla Form',
    email: 'layla@wearables.studio',
    passwordHash: hashPassword('Creator123!'),
    role: 'creator',
    earnings: 1350,
    username: 'laylaform',
    bio: 'Luxury streetwear silhouettes with editorial restraint.'
  },
  {
    id: 'user-customer-1',
    name: 'Demo Customer',
    email: 'customer@example.com',
    passwordHash: hashPassword('Customer123!'),
    role: 'customer',
    earnings: 0,
    username: 'democustomer',
    bio: 'Returning premium apparel customer.'
  }
];

const baseOrders = (): Order[] => [
  {
    id: 'order-1001',
    userId: 'user-customer-1',
    customerName: 'Demo Customer',
    customerPhone: '+20 100 000 0000',
    notes: 'Need pickup after 6 PM.',
    status: 'Pending Payment',
    totalPrice: 500,
    paymentStatus: 'Pending',
    items: [{ designId: 'design-1', designTitle: 'Monogram Noir', size: 'M', quantity: 1, unitPrice: 500 }],
    createdAt: new Date().toISOString(),
  }
];

const baseQrs = (): QRCodeRecord[] => [];

function seedDb(): AppDatabase {
  return {
    users: baseUsers(),
    designs: baseDesigns(),
    orders: baseOrders(),
    qrCodes: baseQrs(),
    sessions: []
  };
}

export async function ensureDb() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(seedDb(), null, 2), 'utf8');
  }
}

export async function readDb(): Promise<AppDatabase> {
  await ensureDb();
  const raw = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(raw) as AppDatabase;
}

export async function writeDb(data: AppDatabase) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function getPublishedDesigns() {
  const db = await readDb();
  return db.designs.filter((design) => design.isPublished);
}

export async function getDesignById(id: string) {
  const db = await readDb();
  return db.designs.find((design) => design.id === id) ?? null;
}

export async function getUserByUsername(username: string) {
  const db = await readDb();
  return db.users.find((user) => user.username === username) ?? null;
}

export async function getOrders() {
  const db = await readDb();
  return db.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
