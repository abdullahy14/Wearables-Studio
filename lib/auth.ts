import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { findUserById } from './store';
import { Role } from './types';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'wearables-studio-secret-key');
const cookieName = 'wearables_session';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; role: Role }) {
  const token = await new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/'
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.role !== 'string') {
      return null;
    }

    const user = await findUserById(payload.sub);
    return user ?? null;
  } catch {
    return null;
  }
}
