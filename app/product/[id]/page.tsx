import { notFound } from 'next/navigation';
import Image from 'next/image';

import { ProductPurchaseCard } from '@/components/product-purchase-card';
import { getStore } from '@/lib/store';
import { products } from '@/lib/products';
import { formatCurrency } from '@/lib/utils';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  const store = await getStore();

  if (!product) {
    notFound();
  }

  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 28 }}>
      <div className="surface-card" style={{ padding: 24 }}>
        <div style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: 28, overflow: 'hidden' }}>
          <Image src={product.image} alt={product.name} fill style={{ objectFit: 'cover' }} priority />
        </div>
      </div>
      <div className="surface-card" style={{ padding: 28, alignSelf: 'start' }}>
        <span className="badge">Premium apparel</span>
        <h1 style={{ fontSize: 42, letterSpacing: '-0.05em', marginBottom: 8 }}>{product.name}</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>{product.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <strong style={{ fontSize: 22 }}>{formatCurrency(product.price)}</strong>
          <span>In-store payment only</span>
        </div>
        <ProductPurchaseCard product={product} designs={store.designs.filter((design) => design.isPublished)} />
      </div>
    </div>
  );
}
