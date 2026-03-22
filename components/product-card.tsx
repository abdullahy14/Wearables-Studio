import Image from 'next/image';
import Link from 'next/link';

import { formatCurrency } from '@/lib/utils';
import { products } from '@/lib/products';

export function ProductGrid() {
  return (
    <div className="grid-auto">
      {products.map((product) => (
        <Link key={product.id} href={`/product/${product.id}`} className="surface-card" style={{ overflow: 'hidden' }}>
          <div style={{ position: 'relative', aspectRatio: '4 / 5' }}>
            <Image src={product.image} alt={product.name} fill style={{ objectFit: 'cover' }} />
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22 }}>{product.name}</h3>
                <p style={{ color: 'var(--muted)', marginBottom: 0 }}>{product.description}</p>
              </div>
              <span className="badge">{product.accent}</span>
            </div>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{formatCurrency(product.price)}</strong>
              <span>View product</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
