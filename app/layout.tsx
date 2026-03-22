import type { Metadata } from 'next';

import './globals.css';

import { CartProvider } from '@/components/cart-provider';
import { SiteHeader } from '@/components/site-header';
import { MobileBottomNav } from '@/components/site-shell';

export const metadata: Metadata = {
  title: 'Wearables Studio',
  description: 'Premium custom apparel studio with QR-based in-store payment workflow.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteHeader />
          <main style={{ padding: '32px 0 120px' }}>{children}</main>
          <div className="mobile-nav-wrapper" style={{ display: 'block' }}>
            <MobileBottomNav />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
