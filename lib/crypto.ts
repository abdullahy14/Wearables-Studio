import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

function deriveHash(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${deriveHash(password, salt)}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [salt, expected] = encoded.split(':');
  if (!salt || !expected) return false;
  const actual = deriveHash(password, salt);
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
