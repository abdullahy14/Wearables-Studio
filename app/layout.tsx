import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { Navigation } from '@/components/Navigation';
import { MobileNav } from '@/components/MobileNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wearables Studio',
  description: 'Premium custom apparel platform with design studio, creator marketplace, and in-store payment workflows.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main className="site-shell">{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
