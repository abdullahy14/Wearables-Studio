'use server';

import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { clearSession, createSession, getCurrentUser, requireRole } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { getDesignById, readDb, writeDb } from '@/lib/db';
import { registerQr } from '@/lib/qr';
import type { DesignElement, OrderItem, OrderStatus, UserRole } from '@/lib/types';

export async function signupAction(formData: FormData) {
  const name = String(formData.get('name') || '');
  const email = String(formData.get('email') || '').toLowerCase();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'customer') as UserRole;
  const username = String(formData.get('username') || '').toLowerCase();

  if (!name || !email || !password || !username) {
    throw new Error('All fields are required.');
  }

  const db = await readDb();
  if (db.users.some((user) => user.email === email || user.username === username)) {
    throw new Error('Email or username is already in use.');
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    username,
    passwordHash: hashPassword(password),
    role,
    earnings: 0,
    bio: role === 'creator' ? 'New creator on Wearables Studio.' : 'Premium custom apparel customer.'
  };

  db.users.push(user);
  await writeDb(db);
  await createSession(user.id);
  redirect(role === 'admin' ? '/dashboard' : '/');
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').toLowerCase();
  const password = String(formData.get('password') || '');
  const db = await readDb();
  const user = db.users.find((entry) => entry.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid credentials.');
  }

  await createSession(user.id);
  redirect(user.role === 'admin' ? '/dashboard' : '/');
}

export async function logoutAction() {
  clearSession();
  redirect('/');
}

export async function createDesignAction(payload: {
  title: string;
  imageUrl: string;
  elements: DesignElement[];
  isPublished: boolean;
}) {
  const user = await requireRole(['creator', 'admin', 'customer']);
  const db = await readDb();
  const design = {
    id: randomUUID(),
    creatorId: user.id,
    title: payload.title || 'Untitled Design',
    imageUrl: payload.imageUrl || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    price: 500,
    isPublished: payload.isPublished,
    salesCount: 0,
    elements: payload.elements,
    mockupLabel: 'Custom Studio Tee',
    createdAt: new Date().toISOString(),
  };
  db.designs.unshift(design);
  await writeDb(db);
  await registerQr('design', design.id, { designId: design.id, href: `/product/${design.id}` });
  revalidatePath('/creator-hub');
  revalidatePath('/design');
  return { id: design.id };
}

export async function createOrderAction(formData: FormData) {
  const designId = String(formData.get('designId') || '');
  const size = String(formData.get('size') || 'M') as OrderItem['size'];
  const name = String(formData.get('name') || '');
  const phone = String(formData.get('phone') || '');
  const notes = String(formData.get('notes') || '');
  const quantity = Number(formData.get('quantity') || 1);
  const db = await readDb();
  const user = await getCurrentUser();
  const design = await getDesignById(designId);

  if (!design) {
    throw new Error('Design not found.');
  }

  const order = {
    id: `order-${Math.floor(Math.random() * 900000 + 100000)}`,
    userId: user?.id ?? 'guest',
    customerName: name,
    customerPhone: phone,
    notes,
    status: 'Pending Payment' as const,
    totalPrice: design.price * quantity,
    paymentStatus: 'Pending' as const,
    items: [{ designId: design.id, designTitle: design.title, size, quantity, unitPrice: design.price }],
    createdAt: new Date().toISOString(),
  };

  db.orders.unshift(order);
  await writeDb(db);
  await registerQr('order', order.id, order);
  await registerQr('pickup', order.id, { orderId: order.id, customerName: order.customerName, customerPhone: order.customerPhone });
  revalidatePath('/dashboard');
  redirect(`/checkout?success=${order.id}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireRole(['admin']);
  const orderId = String(formData.get('orderId') || '');
  const nextStatus = String(formData.get('status') || '') as OrderStatus;
  const adminNote = String(formData.get('adminNote') || '');

  const db = await readDb();
  const order = db.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error('Order not found.');
  order.status = nextStatus;
  if (nextStatus === 'Paid') order.paymentStatus = 'Paid';
  if (adminNote) order.adminNote = adminNote;
  await writeDb(db);
  revalidatePath('/dashboard');
}

export async function markOrderPaidAction(formData: FormData) {
  await requireRole(['admin']);
  const orderId = String(formData.get('orderId') || '');
  const db = await readDb();
  const order = db.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error('Order not found.');
  order.status = 'Paid';
  order.paymentStatus = 'Paid';
  await writeDb(db);
  revalidatePath('/dashboard');
}

export async function cancelOrderAction(formData: FormData) {
  await requireRole(['admin']);
  const orderId = String(formData.get('orderId') || '');
  const db = await readDb();
  const order = db.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error('Order not found.');
  order.status = 'Cancelled';
  await writeDb(db);
  revalidatePath('/dashboard');
}

export async function requestEditsAction(formData: FormData) {
  await requireRole(['admin']);
  const orderId = String(formData.get('orderId') || '');
  const adminNote = String(formData.get('adminNote') || 'Design edits requested by cashier.');
  const db = await readDb();
  const order = db.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error('Order not found.');
  order.status = 'Needs Design Edits';
  order.adminNote = adminNote;
  await writeDb(db);
  revalidatePath('/dashboard');
}
