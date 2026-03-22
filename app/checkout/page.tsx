import Link from 'next/link';
import { createOrderAction } from '@/app/actions';
import { OrderQRCode } from '@/components/OrderQRCode';
import { SectionHeader } from '@/components/SectionHeader';
import { getDesignById, readDb } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

export default async function CheckoutPage({ searchParams }: { searchParams: { designId?: string; size?: 'S' | 'M' | 'L' | 'XL'; success?: string } }) {
  const db = await readDb();
  const selectedDesign = searchParams.designId ? await getDesignById(searchParams.designId) : db.designs[0];
  const order = searchParams.success ? db.orders.find((entry) => entry.id === searchParams.success) : null;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Checkout"
        title="Place your order now and finish payment in store"
        description="Orders stay in Pending Payment until a cashier manually confirms in-store payment."
      />

      {order ? (
        <section className="split-grid">
          <div className="panel">
            <p className="eyebrow">Order Created</p>
            <h2>{order.id}</h2>
            <p>Your order has been submitted successfully. Bring the QR code below to the store for faster payment and pickup processing.</p>
            <ul className="detail-list">
              <li>Status: {order.status}</li>
              <li>Payment: {order.paymentStatus}</li>
              <li>Total: {formatCurrency(order.totalPrice)}</li>
              <li>Customer: {order.customerName}</li>
            </ul>
            <Link href="/dashboard" className="ghost-button">View in Dashboard</Link>
          </div>
          <div className="qr-stack">
            <OrderQRCode payload={order} label="Order QR" />
            <OrderQRCode payload={{ orderId: order.id, customer: order.customerName, phone: order.customerPhone }} label="Pickup QR" />
          </div>
        </section>
      ) : (
        <section className="split-grid">
          <form action={createOrderAction} className="panel form-stack">
            <input type="hidden" name="designId" value={selectedDesign?.id} />
            <p className="eyebrow">Customer Details</p>
            <h2>In-store payment checkout</h2>
            <label>Name<input name="name" required placeholder="Full name" /></label>
            <label>Phone<input name="phone" required placeholder="+20 1X XXX XXXX" /></label>
            <label>Optional notes<textarea name="notes" rows={4} placeholder="Pickup time, fit notes, or edit requests" /></label>
            <div className="inline-grid">
              <label>Size
                <select name="size" defaultValue={searchParams.size ?? 'M'}>
                  {(['S', 'M', 'L', 'XL'] as const).map((size) => <option key={size}>{size}</option>)}
                </select>
              </label>
              <label>Quantity<input name="quantity" type="number" min={1} max={10} defaultValue={1} /></label>
            </div>
            <button type="submit" className="primary-button">Create Pending Payment Order</button>
          </form>

          <div className="panel">
            <p className="eyebrow">Order Summary</p>
            <h3>{selectedDesign?.title}</h3>
            <p className="muted">{selectedDesign?.mockupLabel}</p>
            <div className="summary-card">
              <div><span>Shirt price</span><strong>{formatCurrency(selectedDesign?.price ?? 500)}</strong></div>
              <div><span>Payment method</span><strong>In-store only</strong></div>
              <div><span>Initial status</span><strong>Pending Payment</strong></div>
            </div>
            <p className="muted">After creating the order, the cashier uses the dashboard or QR code to mark the order as paid and move it through production.</p>
          </div>
        </section>
      )}
    </div>
  );
}
