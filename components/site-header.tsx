import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

import { BRAND } from '@/lib/constants';
import { getSession } from '@/lib/auth';

import { CartSummary } from './site-shell';

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(14px)', background: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(11,11,11,0.06)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.04em' }}>
          {BRAND}
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/design">Design Studio</Link>
          <Link href="/creator-hub">Creator Hub</Link>
          <Link href="/checkout">Checkout</Link>
          <Link href="/dashboard">Dashboard</Link>
          {session ? <span className="badge">{session.role}</span> : <Link href="/login">Login</Link>}
          <div style={{ display: 'none' }}>
            <ShoppingBag size={16} />
          </div>
          <CartSummary />
        </nav>
      </div>
    </header>
  );
}
