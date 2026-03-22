import Link from 'next/link';

import { SectionIntro } from '@/components/section-intro';
import { listPublishedDesigns, getStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default async function CreatorHubPage() {
  const designs = await listPublishedDesigns();
  const store = await getStore();

  return (
    <div className="container" style={{ display: 'grid', gap: 48 }}>
      <SectionIntro
        eyebrow="Creator hub"
        title="Sell premium design drops"
        copy="Creators publish original apparel artwork, earn 50 EGP per sale, and build a visible storefront inside the Wearables Studio marketplace."
      />
      <div className="grid-auto">
        {designs.map((design) => {
          const creator = store.users.find((user) => user.id === design.creatorId);
          return (
            <div key={design.id} className="surface-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <span className="badge">{creator?.name ?? 'Creator'}</span>
                  <h2 style={{ fontSize: 30, marginBottom: 10 }}>{design.title}</h2>
                </div>
                <span>{formatCurrency(design.price)}</span>
              </div>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>{design.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ marginBottom: 0 }}>{design.salesCount} sales · 50 EGP commission each</p>
                {creator ? <Link href={`/creator/${creator.username}`} className="btn-ghost">View creator</Link> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
