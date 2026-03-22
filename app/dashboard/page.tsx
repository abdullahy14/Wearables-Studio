import { cancelOrderAction, markOrderPaidAction, requestEditsAction, updateOrderStatusAction } from '@/app/actions';
import { OrderQRCode } from '@/components/OrderQRCode';
import { StatusBadge } from '@/components/StatusBadge';
import { getCurrentUser } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { ORDER_STATUSES, formatCurrency } from '@/lib/utils';

export default async function DashboardPage({ searchParams }: { searchParams: { filter?: string; qr?: string } }) {
  const user = await getCurrentUser();
  const db = await readDb();
  const filter = searchParams.filter;
  const orders = db.orders.filter((order) => !filter || order.status === filter || order.paymentStatus === filter);
  const qrLookup = searchParams.qr ? db.orders.find((order) => order.id === searchParams.qr) : null;

  if (user?.role !== 'admin') {
    return (
      <div className="panel">
        <p className="eyebrow">Admin Access Required</p>
        <h1>Cashier dashboard</h1>
        <p>Log in with the seeded admin account to manage store orders.</p>
        <p className="muted">Demo admin credentials: admin@wearables.studio / Admin123!</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar panel">
        <p className="eyebrow">Dashboard</p>
        <h2>Store control center</h2>
        <div className="sidebar-links">
          {['Pending Payment', 'Paid', 'Processing', 'Ready for Pickup', 'Completed'].map((label) => (
            <a key={label} href={`/dashboard?filter=${encodeURIComponent(label)}`} className="ghost-button">{label}</a>
          ))}
        </div>
        <form className="form-stack" action="/dashboard">
          <label>QR / Order lookup<input name="qr" placeholder="order-1001" /></label>
          <button type="submit" className="primary-button">Open Order</button>
        </form>
        {qrLookup ? (
          <div className="panel subtle-panel">
            <p className="eyebrow">QR Result</p>
            <h3>{qrLookup.id}</h3>
            <p>{qrLookup.customerName} · {qrLookup.customerPhone}</p>
            <p>{qrLookup.status}</p>
          </div>
        ) : null}
      </aside>

      <section className="dashboard-content panel">
        <div className="dashboard-header-row">
          <div>
            <p className="eyebrow">Orders</p>
            <h1>Cashier operations dashboard</h1>
          </div>
          <div className="stats-row compact">
            <div><strong>{orders.length}</strong><span>Visible orders</span></div>
            <div><strong>{db.designs.length}</strong><span>Designs</span></div>
            <div><strong>{db.users.length}</strong><span>Users</span></div>
          </div>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customerName}<br /><span className="muted">{order.customerPhone}</span></td>
                  <td><StatusBadge>{order.status}</StatusBadge></td>
                  <td><StatusBadge>{order.paymentStatus}</StatusBadge></td>
                  <td>{formatCurrency(order.totalPrice)}</td>
                  <td>
                    <div className="action-stack">
                      <form action={markOrderPaidAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="ghost-button">Mark as Paid</button>
                      </form>
                      <form action={cancelOrderAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="ghost-button">Cancel</button>
                      </form>
                      <form action={requestEditsAction} className="action-form-inline">
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="text" name="adminNote" placeholder="Request design edits" />
                        <button type="submit" className="ghost-button">Request Edits</button>
                      </form>
                      <form action={updateOrderStatusAction} className="action-form-inline">
                        <input type="hidden" name="orderId" value={order.id} />
                        <select name="status" defaultValue={order.status}>
                          {ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}
                        </select>
                        <button type="submit" className="primary-button">Update Status</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split-grid dashboard-bottom">
          <div className="panel subtle-panel">
            <p className="eyebrow">QR Generator</p>
            <p>Use the generated order and pickup QR codes for fast cashier lookup and collection handling.</p>
            {db.orders[0] ? <OrderQRCode payload={db.orders[0]} label={`Sample order QR · ${db.orders[0].id}`} /> : null}
          </div>
          <div className="panel subtle-panel">
            <p className="eyebrow">Operational Policy</p>
            <ul className="detail-list">
              <li>No online payment processing anywhere in the application.</li>
              <li>Payment is confirmed only by an admin or cashier inside the dashboard.</li>
              <li>Status progression remains store-controlled from Paid to Completed.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
