'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCart } from './cart-provider';
import { formatCurrency } from '@/lib/utils';
import { Design } from '@/lib/types';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sizes: string[];
  image: string;
  accent: string;
}

export function ProductPurchaseCard({ product, designs }: { product: Product; designs: Design[] }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState(product.sizes[2] ?? product.sizes[0]);
  const [selectedDesignId, setSelectedDesignId] = useState(designs[0]?.id ?? '');

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === selectedDesignId) ?? designs[0],
    [designs, selectedDesignId]
  );

  function handleAddToCart() {
    if (!selectedDesign) return;
    addItem({
      productId: product.id,
      productName: product.name,
      designId: selectedDesign.id,
      designTitle: selectedDesign.title,
      size: selectedSize,
      quantity: 1,
      price: product.price,
      mockupUrl: product.image
    });
    router.push('/checkout');
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <p style={{ marginBottom: 8 }}>Select size</p>
        <div className="pill-tabs">
          {product.sizes.map((size) => (
            <button key={size} className={selectedSize === size ? 'active' : ''} onClick={() => setSelectedSize(size)}>
              {size}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span>Select design</span>
        <select className="select" value={selectedDesignId} onChange={(event) => setSelectedDesignId(event.target.value)}>
          {designs.map((design) => (
            <option key={design.id} value={design.id}>{design.title}</option>
          ))}
        </select>
      </label>
      <div className="surface-card" style={{ padding: 18, background: 'var(--surface)' }}>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Order summary</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Product</span>
          <span>{product.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Applied design</span>
          <span>{selectedDesign?.title ?? '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total due in store</span>
          <strong>{formatCurrency(product.price)}</strong>
        </div>
      </div>
      <button className="btn" onClick={handleAddToCart}>Add to cart</button>
      <p style={{ color: 'var(--muted)', margin: 0 }}>Checkout creates a <strong>Pending Payment</strong> order. Payment happens physically at the store.</p>
    </div>
  );
}
