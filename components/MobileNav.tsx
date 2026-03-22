'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const items = [
  ['/', 'Home'],
  ['/design', 'Studio'],
  ['/creator-hub', 'Market'],
  ['/checkout', 'Orders'],
  ['/dashboard', 'Admin'],
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      {items.map(([href, label]) => (
        <Link key={href} href={href} className={clsx(pathname === href && 'active')}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
