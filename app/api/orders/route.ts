import { NextResponse } from 'next/server';
import { z } from 'zod';

import { SHIRT_PRICE } from '@/lib/constants';
import { createOrder, generateQrCode, listOrders } from '@/lib/store';
import { randomId } from '@/lib/utils';

const orderSchema = z.object({
  userId: z.string(),
  customerName: z.string().min(2),
  phone: z.string().min(6),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      designId: z.string(),
      designTitle: z.string(),
      size: z.string(),
      quantity: z.number(),
      price: z.number(),
      mockupUrl: z.string()
    })
  ).min(1)
});

export async function GET() {
  const orders = await listOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = orderSchema.parse(await request.json());
  const items = body.items.map((item) => ({ ...item, id: randomId('item'), price: SHIRT_PRICE }));
  const order = await createOrder({
    userId: body.userId,
    customerName: body.customerName,
    phone: body.phone,
    notes: body.notes,
    items,
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: 'Pending Payment',
    paymentStatus: 'Pending'
  });

  const qrData = JSON.stringify({
    orderId: order.id,
    customerName: order.customerName,
    phone: order.phone,
    totalPrice: order.totalPrice,
    items: order.items,
    status: order.status
  });

  await generateQrCode('order', order.id, qrData);
  await generateQrCode('pickup', order.id, qrData);

  return NextResponse.json({ orderId: order.id, qrData });
}
