import { toQrDataUrl } from '@/lib/qr';

export async function OrderQRCode({ payload, label }: { payload: object | string; label: string }) {
  const src = await toQrDataUrl(typeof payload === 'string' ? payload : JSON.stringify(payload));
  return (
    <div className="qr-card">
      <img src={src} alt={label} width={180} height={180} />
      <p>{label}</p>
    </div>
  );
}
