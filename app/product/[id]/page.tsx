import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderQRCode } from '@/components/OrderQRCode';
import { getDesignById, readDb } from '@/lib/db';
import { creatorCommission, formatCurrency } from '@/lib/utils';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const design = await getDesignById(params.id);
  if (!design) return notFound();
  const db = await readDb();
  const creator = db.users.find((user) => user.id === design.creatorId);
  const designQrPayload = { designId: design.id, href: `/product/${design.id}`, title: design.title };

  return (
    <div className="page-stack">
      <section className="split-grid product-hero">
        <div className="panel product-visual" style={{ backgroundImage: `url(${design.imageUrl})` }} />
        <div className="panel">
          <p className="eyebrow">Premium Product</p>
          <h1>{design.title}</h1>
          <p className="lead-copy">{design.mockupLabel}</p>
          <div className="price-row">
            <strong>{formatCurrency(design.price)}</strong>
            <span className="muted">Sizes S–XL</span>
          </div>
          <p className="muted">
            Creator: <Link href={`/creator/${creator?.username}`}>{creator?.name}</Link> · Commission per sale: {formatCurrency(50)} · Total creator earnings: {formatCurrency(creatorCommission(design))}
          </p>
          <div className="button-row wrap-row">
            {(['S', 'M', 'L', 'XL'] as const).map((size) => (
              <Link key={size} href={`/checkout?designId=${design.id}&size=${size}`} className="ghost-button">Add {size}</Link>
            ))}
          </div>
          <div className="panel subtle-panel">
            <p className="eyebrow">Checkout rule</p>
            <p>No online payment is available. Every order is submitted as Pending Payment and must be paid in store.</p>
          </div>
        </div>
      </section>
      <section className="split-grid">
        <div className="panel">
          <h2>Design Preview Details</h2>
          <ul className="detail-list">
            {design.elements.map((element) => (
              <li key={element.id}>{element.type === 'text' ? `${element.content} · ${element.fontSize}px` : 'Uploaded artwork element'}</li>
            ))}
          </ul>
        </div>
        <OrderQRCode payload={designQrPayload} label="Design QR" />
      </section>
    </div>
  );
}
