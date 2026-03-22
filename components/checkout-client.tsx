'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { useCart } from './cart-provider';
import { formatCurrency } from '@/lib/utils';

export function CheckoutClient({ userId, customerName, phone }: { userId: string; customerName: string; phone: string }) {
  const router = useRouter();
  const { items, total, clearCart, removeItem } = useCart();
  const [result, setResult] = useState<{ orderId: string; qrData: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        customerName: formData.get('name'),
        phone: formData.get('phone'),
        notes: formData.get('notes'),
        items
      })
    });

    const payload = (await response.json()) as { orderId: string; qrData: string };
    setResult(payload);
    clearCart();
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 420px)', gap: 24 }}>
      <div className="surface-card" style={{ padding: 24 }}>
        <div className="section-heading">
          <div>
            <span className="badge">Pending payment checkout</span>
            <h1 style={{ fontSize: 38, margin: '12px 0 0', letterSpacing: '-0.05em' }}>Complete your order online</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 380 }}>
            No online payment is collected. We reserve your order, generate your QR, and the cashier marks payment in-store.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          {items.length ? items.map((item) => (
            <div key={`${item.productId}-${item.designId}-${item.size}`} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 16, alignItems: 'center', padding: 16, border: '1px solid rgba(11,11,11,0.08)', borderRadius: 20 }}>
              <div style={{ position: 'relative', width: 100, height: 110, borderRadius: 16, overflow: 'hidden' }}>
                <Image src={item.mockupUrl} alt={item.productName} fill style={{ objectFit: 'cover' }} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px' }}>{item.productName}</h3>
                <p style={{ margin: '0 0 4px', color: 'var(--muted)' }}>{item.designTitle}</p>
                <p style={{ margin: 0, color: 'var(--muted)' }}>Size {item.size} · Qty {item.quantity}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
                <button className="btn-ghost" type="button" style={{ display: 'block', marginTop: 12 }} onClick={() => removeItem(item.productId, item.designId, item.size)}>
                  Remove
                </button>
              </div>
            </div>
          )) : <p style={{ color: 'var(--muted)' }}>Your cart is empty. Add a product from the collection first.</p>}
        </div>
      </div>

      <div className="surface-card" style={{ padding: 24, alignSelf: 'start', display: 'grid', gap: 16 }}>
        {result ? (
          <>
            <span className="badge">Order confirmed</span>
            <h2 style={{ fontSize: 30, margin: 0 }}>Bring this QR to the store</h2>
            <div style={{ display: 'grid', placeItems: 'center', padding: 20, background: 'var(--surface)', borderRadius: 24 }}>
              <QRCodeSVG value={result.qrData} size={180} bgColor="#FFFFFF" fgColor="#0B0B0B" />
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Order <strong>{result.orderId}</strong> has been placed as <strong>Pending Payment</strong>.
            </p>
          </>
        ) : (
          <form onSubmit={handleCheckout} style={{ display: 'grid', gap: 14 }}>
            <span className="badge">Store pickup details</span>
            <input className="input" name="name" placeholder="Full name" defaultValue={customerName} required />
            <input className="input" name="phone" placeholder="Phone number" defaultValue={phone} required />
            <textarea className="textarea" name="notes" rows={4} placeholder="Optional notes for the cashier or production team" />
            <div style={{ padding: 18, borderRadius: 22, background: 'var(--surface)' }}>
              <p style={{ marginTop: 0, marginBottom: 8 }}>Summary</p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total due in store</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <p style={{ color: 'var(--muted)', marginBottom: 0 }}>Pay at the physical store. Cashier confirms payment manually in the dashboard.</p>
            </div>
            <button className="btn" type="submit" disabled={!items.length || submitting}>
              {submitting ? 'Creating order...' : 'Place pending-payment order'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
