import { notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

import { getDesignById } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default async function DesignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const design = await getDesignById(id);

  if (!design) notFound();

  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
      <section className="surface-card" style={{ padding: 28 }}>
        <span className="badge">Published design</span>
        <h1 style={{ fontSize: 42, letterSpacing: '-0.05em' }}>{design.title}</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>{design.description}</p>
        <p>{formatCurrency(design.price)} · {design.salesCount} sales</p>
      </section>
      <aside className="surface-card" style={{ padding: 24, alignSelf: 'start', textAlign: 'center' }}>
        <span className="badge">Design QR</span>
        <div style={{ marginTop: 16, display: 'grid', placeItems: 'center' }}>
          <QRCodeSVG value={`https://wearables.studio/designs/${design.id}`} size={180} bgColor="#FFFFFF" fgColor="#0B0B0B" />
        </div>
      </aside>
    </div>
  );
}
