import { NextResponse } from 'next/server';
import { z } from 'zod';

import { generateQrCode } from '@/lib/store';

const schema = z.object({
  type: z.enum(['design', 'order', 'pickup']),
  entityId: z.string().min(1),
  data: z.string().min(1)
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const qr = await generateQrCode(body.type, body.entityId, body.data);
  return NextResponse.json({ qr });
}
