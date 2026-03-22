import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/db';

export async function GET() {
  const orders = await getOrders();
  return NextResponse.json(orders);
}
