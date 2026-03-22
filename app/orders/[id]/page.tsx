import { notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

import { getOrderById } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) notFound();

  const payload = JSON.stringify({
    orderId: order.id,
    customerName: order.customerName,
    phone: order.phone,
    items: order.items,
    status: order.status
  });

  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
      <section className="surface-card" style={{ padding: 28 }}>
        <span className="badge">Order lookup</span>
        <h1 style={{ fontSize: 42, marginBottom: 8, letterSpacing: '-0.05em' }}>{order.id}</h1>
        <p style={{ color: 'var(--muted)' }}>Created {formatDate(order.createdAt)}</p>
        <div style={{ display: 'grid', gap: 16 }}>
          {order.items.map((item) => (
            <div key={item.id} className="surface-card" style={{ padding: 18, background: 'var(--surface)' }}>
              <h3 style={{ marginTop: 0 }}>{item.productName}</h3>
              <p style={{ margin: '0 0 4px', color: 'var(--muted)' }}>{item.designTitle}</p>
              <p style={{ margin: 0 }}>Size {item.size} · {formatCurrency(item.price)}</p>
            </div>
          ))}
        </div>
      </section>
      <aside className="surface-card" style={{ padding: 24, alignSelf: 'start', textAlign: 'center' }}>
        <span className="badge">Pickup QR</span>
        <div style={{ marginTop: 16, display: 'grid', placeItems: 'center' }}>
          <QRCodeSVG value={payload} size={180} bgColor="#FFFFFF" fgColor="#0B0B0B" />
        </div>
        <p style={{ color: 'var(--muted)' }}>Scan in-store to retrieve and update the order instantly.</p>
      </aside>
    </div>
  );
}
