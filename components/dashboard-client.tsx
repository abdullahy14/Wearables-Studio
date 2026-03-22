'use client';

import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { STATUS_FILTERS } from '@/lib/constants';
import { Design, Order, User } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardProps {
  initialOrders: Order[];
  designs: Design[];
  users: User[];
  stats: {
    revenue: number;
    pendingOrders: number;
    totalDesigns: number;
    creators: number;
  };
}

export function DashboardClient({ initialOrders, designs, users, stats }: DashboardProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [section, setSection] = useState<'orders' | 'designs' | 'users' | 'qr'>('orders');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [qrValue, setQrValue] = useState('');
  const [scannerInput, setScannerInput] = useState('');
  const [scannerResult, setScannerResult] = useState<Order | null>(null);

  const filteredOrders = useMemo(
    () => orders.filter((order) => (statusFilter === 'All' ? true : order.status === statusFilter)),
    [orders, statusFilter]
  );

  async function runAction(orderId: string, action: string) {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    const payload = (await response.json()) as { order: Order };
    setOrders((current) => current.map((item) => (item.id === orderId ? payload.order : item)));
  }

  function scanOrder() {
    const directMatch = orders.find((order) => scannerInput.includes(order.id) || order.id === scannerInput);
    setScannerResult(directMatch ?? null);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 24 }}>
      <aside className="surface-card" style={{ padding: 24, alignSelf: 'start', position: 'sticky', top: 100 }}>
        <span className="badge">Admin control center</span>
        <h1 style={{ fontSize: 34, margin: '14px 0 18px', letterSpacing: '-0.05em' }}>Cashier dashboard</h1>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            ['orders', 'Orders'],
            ['designs', 'Designs'],
            ['users', 'Users'],
            ['qr', 'QR Generator']
          ].map(([value, label]) => (
            <button key={value} className={section === value ? 'btn' : 'btn-ghost'} onClick={() => setSection(value as typeof section)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
          <div className="surface-card" style={{ padding: 16, background: 'var(--surface)' }}>
            <p style={{ color: 'var(--muted)', margin: '0 0 6px' }}>Paid revenue</p>
            <strong style={{ fontSize: 24 }}>{formatCurrency(stats.revenue)}</strong>
          </div>
          <div className="surface-card" style={{ padding: 16, background: 'var(--surface)' }}>
            <p style={{ color: 'var(--muted)', margin: '0 0 6px' }}>Pending payment</p>
            <strong style={{ fontSize: 24 }}>{stats.pendingOrders}</strong>
          </div>
        </div>
      </aside>

      <div style={{ display: 'grid', gap: 24 }}>
        {section === 'orders' ? (
          <div className="surface-card" style={{ padding: 24 }}>
            <div className="section-heading">
              <div>
                <span className="badge">Order management</span>
                <h2 style={{ fontSize: 36, margin: '10px 0 0', letterSpacing: '-0.05em' }}>Store order workflow</h2>
              </div>
            </div>
            <div className="pill-tabs" style={{ marginBottom: 18 }}>
              {STATUS_FILTERS.map((filter) => (
                <button key={filter} className={statusFilter === filter ? 'active' : ''} onClick={() => setStatusFilter(filter)}>
                  {filter}
                </button>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={{ padding: '12px 10px' }}>Order ID</th>
                    <th style={{ padding: '12px 10px' }}>Customer</th>
                    <th style={{ padding: '12px 10px' }}>Status</th>
                    <th style={{ padding: '12px 10px' }}>Payment</th>
                    <th style={{ padding: '12px 10px' }}>Updated</th>
                    <th style={{ padding: '12px 10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} style={{ borderTop: '1px solid rgba(11,11,11,0.08)' }}>
                      <td style={{ padding: '16px 10px', fontWeight: 600 }}>{order.id}</td>
                      <td style={{ padding: '16px 10px' }}>{order.customerName}</td>
                      <td style={{ padding: '16px 10px' }}>{order.status}</td>
                      <td style={{ padding: '16px 10px' }}>{order.paymentStatus}</td>
                      <td style={{ padding: '16px 10px' }}>{formatDate(order.updatedAt)}</td>
                      <td style={{ padding: '16px 10px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn-ghost" onClick={() => runAction(order.id, 'mark-paid')}>Mark Paid</button>
                          <button className="btn-ghost" onClick={() => runAction(order.id, 'request-edits')}>Request Edits</button>
                          <button className="btn-ghost" onClick={() => runAction(order.id, 'advance-status')}>Advance</button>
                          <button className="btn-ghost" onClick={() => runAction(order.id, 'cancel')}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="surface-card" style={{ marginTop: 24, padding: 20, background: 'var(--surface)' }}>
              <h3 style={{ marginTop: 0 }}>QR retrieval</h3>
              <p style={{ color: 'var(--muted)' }}>Paste an order QR payload or an order ID to retrieve the order instantly at the cashier desk.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input className="input" value={scannerInput} onChange={(event) => setScannerInput(event.target.value)} placeholder='Example: {"orderId":"ORD-24001"}' style={{ flex: 1 }} />
                <button className="btn" onClick={scanOrder}>Retrieve order</button>
              </div>
              {scannerResult ? <p style={{ marginBottom: 0 }}>Retrieved <strong>{scannerResult.id}</strong> for <strong>{scannerResult.customerName}</strong>.</p> : null}
            </div>
          </div>
        ) : null}

        {section === 'designs' ? (
          <div className="grid-auto">
            {designs.map((design) => (
              <div key={design.id} className="surface-card" style={{ padding: 22 }}>
                <span className="badge">Published design</span>
                <h3 style={{ marginBottom: 6 }}>{design.title}</h3>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>{design.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{formatCurrency(design.price)}</span>
                  <span>{design.salesCount} sales</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {section === 'users' ? (
          <div className="surface-card" style={{ padding: 24 }}>
            <span className="badge">Users</span>
            <h2 style={{ fontSize: 36, margin: '10px 0 18px', letterSpacing: '-0.05em' }}>Role-based member list</h2>
            <div className="grid-auto">
              {users.map((user) => (
                <div key={user.id} className="surface-card" style={{ padding: 20, background: 'var(--surface)' }}>
                  <h3 style={{ marginTop: 0 }}>{user.name}</h3>
                  <p style={{ color: 'var(--muted)' }}>{user.email}</p>
                  <p className="badge">{user.role}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {section === 'qr' ? (
          <div className="surface-card" style={{ padding: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 24 }}>
            <div>
              <span className="badge">QR Generator</span>
              <h2 style={{ fontSize: 36, margin: '10px 0 14px', letterSpacing: '-0.05em' }}>Generate a scannable payload</h2>
              <textarea className="textarea" rows={8} value={qrValue} onChange={(event) => setQrValue(event.target.value)} placeholder="Paste an order payload, pickup code, or design link here." />
              <p style={{ color: 'var(--muted)' }}>Use this for order pickup, design sharing, or quick access links in-store.</p>
            </div>
            <div className="surface-card" style={{ padding: 20, background: 'var(--surface)', display: 'grid', placeItems: 'center' }}>
              {qrValue ? <QRCodeSVG value={qrValue} size={210} bgColor="#FFFFFF" fgColor="#0B0B0B" /> : <p style={{ color: 'var(--muted)' }}>Enter payload</p>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
