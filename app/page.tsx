import Link from 'next/link';

import { ProductGrid } from '@/components/product-card';
import { SectionIntro } from '@/components/section-intro';
import { listPublishedDesigns } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default async function HomePage() {
  const designs = await listPublishedDesigns();

  return (
    <div className="container" style={{ display: 'grid', gap: 72 }}>
      <section className="surface-card" style={{ padding: '42px clamp(24px, 6vw, 56px)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 420px)', gap: 28, alignItems: 'center' }}>
          <div>
            <span className="badge">Luxury custom apparel</span>
            <h1 style={{ fontSize: 'clamp(46px, 9vw, 96px)', lineHeight: 0.95, margin: '20px 0', letterSpacing: '-0.08em' }}>
              Designed online. Paid in store.
            </h1>
            <p style={{ maxWidth: 560, color: 'var(--muted)', lineHeight: 1.8, fontSize: 18 }}>
              Wearables Studio brings together a premium design editor, creator marketplace, QR-powered order retrieval, and a cashier dashboard built for elegant in-store checkout.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 28 }}>
              <Link href="/design" className="btn">Start designing</Link>
              <Link href="/creator-hub" className="btn-ghost">Explore creators</Link>
            </div>
          </div>
          <div className="surface-card" style={{ padding: 24, background: 'var(--surface)' }}>
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                ['Order state', 'Pending Payment → Paid → Processing → Printed → Ready for Pickup → Completed'],
                ['Price', '500 EGP premium tee'],
                ['Creator commission', '50 EGP per sale'],
                ['Store flow', 'QR code generated at checkout for instant cashier retrieval']
              ].map(([label, value]) => (
                <div key={label} style={{ paddingBottom: 12, borderBottom: '1px solid rgba(11,11,11,0.08)' }}>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{label}</p>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionIntro
          eyebrow="Collection"
          title="Premium essentials"
          copy="Minimal silhouettes, black-and-white dominance, and creator-powered graphics curated for a luxury streetwear audience."
        />
        <ProductGrid />
      </section>

      <section>
        <SectionIntro
          eyebrow="Marketplace"
          title="Featured creator drops"
          copy="Published designs are immediately monetizable through the marketplace, each with a 10% creator commission tracked within the platform."
        />
        <div className="grid-auto">
          {designs.map((design) => (
            <Link key={design.id} href={`/designs/${design.id}`} className="surface-card" style={{ padding: 24 }}>
              <span className="badge">{formatCurrency(design.price)}</span>
              <h3 style={{ fontSize: 28, marginBottom: 10 }}>{design.title}</h3>
              <p style={{ marginTop: 0, color: 'var(--muted)', lineHeight: 1.7 }}>{design.description}</p>
              <p style={{ marginBottom: 0 }}>{design.salesCount} sales recorded</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
