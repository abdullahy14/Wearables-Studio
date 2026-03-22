import QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import { readDb, writeDb } from '@/lib/db';

export async function toQrDataUrl(data: string) {
  return QRCode.toDataURL(data, {
    margin: 1,
    color: { dark: '#0B0B0B', light: '#FFFFFF' },
    width: 240,
  });
}

export async function registerQr(type: 'design' | 'order' | 'pickup', referenceId: string, data: object | string) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  const db = await readDb();
  const entry = {
    id: randomUUID(),
    type,
    data: serialized,
    generatedAt: new Date().toISOString(),
    referenceId,
  };
  db.qrCodes.push(entry);
  await writeDb(db);
  return entry;
}
