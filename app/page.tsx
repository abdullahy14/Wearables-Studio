import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { SectionHeader } from '@/components/SectionHeader';
import { readDb } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

export default async function HomePage() {
  const db = await readDb();
  const designs = db.designs.filter((design) => design.isPublished).slice(0, 3);
  const creators = db.users.filter((user) => user.role === 'creator').slice(0, 2);

  return (
    <div className="page-stack">
      <section className="hero-grid hero-surface">
        <div>
          <p className="eyebrow">Luxury Custom Apparel</p>
          <h1>Minimalist fashion production, designed online and paid in store.</h1>
          <p className="lead-copy">
            Wearables Studio pairs a premium design editor, curated creator marketplace, and cashier-controlled order workflow with QR-powered pickup.
          </p>
          <div className="button-row">
            <Link href="/design" className="primary-button">Start Designing</Link>
            <Link href="/creator-hub" className="ghost-button">Explore Marketplace</Link>
          </div>
          <div className="stats-row">
            <div><strong>{formatCurrency(500)}</strong><span>Fixed shirt price</span></div>
            <div><strong>{formatCurrency(50)}</strong><span>Creator commission</span></div>
            <div><strong>0%</strong><span>Online payment processing</span></div>
          </div>
        </div>
        <div className="hero-card panel luxury-card">
          <p className="eyebrow">Store Workflow</p>
          <ol className="workflow-list">
            <li>Customer designs or selects an item.</li>
            <li>Order is submitted as <strong>Pending Payment</strong>.</li>
            <li>Cashier confirms in-store payment manually.</li>
            <li>Production advances from paid to pickup via dashboard.</li>
          </ol>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Featured Designs"
          title="Premium monochrome statements"
          description="Curated apparel from the Wearables Studio creator community, all priced at 500 EGP and optimized for in-store payment fulfillment."
        />
        <div className="product-grid">
          {designs.map((design) => (
            <ProductCard key={design.id} design={design} creator={db.users.find((user) => user.id === design.creatorId)} />
          ))}
        </div>
      </section>

      <section className="split-grid">
        <div className="panel">
          <SectionHeader
            eyebrow="Creator Marketplace"
            title="Rewarding creators with transparent commission"
            description="Every published design earns the creator 50 EGP per sale while operations stay fully controlled by the store team."
          />
          <div className="creator-list">
            {creators.map((creator) => (
              <Link href={`/creator/${creator.username}`} key={creator.id} className="creator-row card-hover">
                <div>
                  <strong>{creator.name}</strong>
                  <p className="muted">@{creator.username}</p>
                </div>
                <span>{formatCurrency(creator.earnings)} earned</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="panel beige-panel">
          <SectionHeader
            eyebrow="Admin-First Operations"
            title="Cashier dashboard built for store control"
            description="Manage pending payments, mark orders paid, request design revisions, generate QR codes, and move garments through production with a single interface."
          />
          <Link href="/dashboard" className="primary-button">Open Admin Dashboard</Link>
        </div>
      </section>
    </div>
  );
}
