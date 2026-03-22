import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrderById, getStatusForAction, updateOrder } from '@/lib/store';

const actionSchema = z.object({
  action: z.enum(['mark-paid', 'cancel', 'request-edits', 'advance-status'])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const { action } = actionSchema.parse(await request.json());
  const next = getStatusForAction(action, order.status);
  if (!next) {
    return NextResponse.json({ error: 'Unable to update order.' }, { status: 400 });
  }

  const updated = await updateOrder(id, next);
  return NextResponse.json({ order: updated });
}
