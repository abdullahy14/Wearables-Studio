import { notFound } from 'next/navigation';

import { getStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default async function CreatorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const store = await getStore();
  const creator = store.users.find((user) => user.username === username && user.role === 'creator');

  if (!creator) notFound();

  const designs = store.designs.filter((design) => design.creatorId === creator.id);

  return (
    <div className="container" style={{ display: 'grid', gap: 32 }}>
      <section className="surface-card" style={{ padding: 32 }}>
        <span className="badge">Creator profile</span>
        <h1 style={{ fontSize: 48, marginBottom: 8, letterSpacing: '-0.05em' }}>{creator.name}</h1>
        <p style={{ maxWidth: 640, color: 'var(--muted)', lineHeight: 1.8 }}>
          Independent designer publishing monochrome-led pieces for the Wearables Studio premium marketplace.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="surface-card" style={{ padding: 18, background: 'var(--surface)' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Earnings</p>
            <strong>{formatCurrency(creator.earnings)}</strong>
          </div>
          <div className="surface-card" style={{ padding: 18, background: 'var(--surface)' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Published designs</p>
            <strong>{designs.length}</strong>
          </div>
        </div>
      </section>
      <section className="grid-auto">
        {designs.map((design) => (
          <div key={design.id} className="surface-card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>{design.title}</h2>
            <p style={{ color: 'var(--muted)' }}>{design.description}</p>
            <p style={{ marginBottom: 0 }}>{design.salesCount} sales · {formatCurrency(design.price)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
