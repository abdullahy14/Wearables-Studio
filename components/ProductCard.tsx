import Link from 'next/link';
import type { Design, User } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function ProductCard({ design, creator }: { design: Design; creator?: User }) {
  return (
    <article className="product-card card-hover">
      <div className="mock-image" style={{ backgroundImage: `url(${design.imageUrl})` }} />
      <div className="card-body">
        <div>
          <p className="eyebrow">{creator?.name ?? 'Wearables Studio'}</p>
          <h3>{design.title}</h3>
        </div>
        <p className="muted">{design.mockupLabel}</p>
        <div className="product-meta">
          <strong>{formatCurrency(design.price)}</strong>
          <Link href={`/product/${design.id}`} className="ghost-button">View Product</Link>
        </div>
      </div>
    </article>
  );
}
