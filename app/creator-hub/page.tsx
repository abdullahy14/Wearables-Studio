import { ProductCard } from '@/components/ProductCard';
import { SectionHeader } from '@/components/SectionHeader';
import { readDb } from '@/lib/db';

export default async function CreatorHubPage() {
  const db = await readDb();
  const designs = db.designs.filter((design) => design.isPublished);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Creator Hub"
        title="A premium marketplace for creator-led apparel drops"
        description="Browse published custom designs, discover creator profiles, and order pieces that stay in the store-controlled fulfillment workflow."
      />
      <div className="product-grid">
        {designs.map((design) => (
          <ProductCard key={design.id} design={design} creator={db.users.find((user) => user.id === design.creatorId)} />
        ))}
      </div>
    </div>
  );
}
