import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createSession, hashPassword } from '@/lib/auth';
import { createUser, findUserByEmail } from '@/lib/store';

const schema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  phone: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['customer', 'creator'])
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const existing = await findUserByEmail(body.email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const password = await hashPassword(body.password);
  const user = await createUser({ ...body, password });
  await createSession({ id: user.id, role: user.role });

  return NextResponse.json({ success: true });
}
