'use client';

import Link from 'next/link';
import { Home, PencilRuler, ShoppingBag, LayoutDashboard, LucideIcon } from 'lucide-react';

import { useCart } from './cart-provider';

export function CartSummary() {
  const { items } = useCart();

  return (
    <Link href="/checkout" className="badge" style={{ gap: 10 }}>
      <ShoppingBag size={14} /> {items.length} item{items.length === 1 ? '' : 's'}
    </Link>
  );
}

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/design', label: 'Design', icon: PencilRuler },
  { href: '/checkout', label: 'Checkout', icon: ShoppingBag },
  { href: '/dashboard', label: 'Admin', icon: LayoutDashboard }
];

export function MobileBottomNav() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        borderRadius: 999,
        border: '1px solid rgba(11,11,11,0.08)',
        background: 'rgba(255,255,255,0.96)',
        boxShadow: '0 24px 48px rgba(11,11,11,0.12)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        padding: 10,
        gap: 8,
        zIndex: 40
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} style={{ display: 'grid', placeItems: 'center', gap: 4, padding: '6px 4px', fontSize: 12 }}>
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
