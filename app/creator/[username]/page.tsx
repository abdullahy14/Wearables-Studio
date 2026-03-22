import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { readDb } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const db = await readDb();
  const creator = db.users.find((user) => user.username === params.username);
  if (!creator) return notFound();
  const designs = db.designs.filter((design) => design.creatorId === creator.id);

  return (
    <div className="page-stack">
      <section className="panel creator-profile-header">
        <p className="eyebrow">Creator Profile</p>
        <h1>{creator.name}</h1>
        <p className="lead-copy">{creator.bio}</p>
        <div className="stats-row compact">
          <div><strong>{designs.length}</strong><span>Published designs</span></div>
          <div><strong>{formatCurrency(creator.earnings)}</strong><span>Total earnings</span></div>
          <div><strong>{formatCurrency(50)}</strong><span>Commission per sale</span></div>
        </div>
      </section>
      <div className="product-grid">
        {designs.map((design) => (
          <ProductCard key={design.id} design={design} creator={creator} />
        ))}
      </div>
    </div>
  );
}
