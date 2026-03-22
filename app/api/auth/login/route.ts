import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createSession, verifyPassword } from '@/lib/auth';
import { findUserByEmail } from '@/lib/store';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const user = await findUserByEmail(body.email);

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const isValid = await verifyPassword(body.password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  await createSession({ id: user.id, role: user.role });
  return NextResponse.json({ success: true });
}
