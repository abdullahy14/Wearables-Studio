import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { readDb, writeDb } from '@/lib/db';
import type { User, UserRole } from '@/lib/types';

const SESSION_COOKIE = 'wearables_session';

export async function createSession(userId: string) {
  const db = await readDb();
  const token = randomBytes(32).toString('hex');
  db.sessions = db.sessions.filter((entry) => entry.userId !== userId);
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  await writeDb(db);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find((entry) => entry.token === token);
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) ?? null;
}

export async function requireRole(roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) {
    throw new Error('Unauthorized');
  }
  return user;
}
