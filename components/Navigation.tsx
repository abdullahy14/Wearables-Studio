import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions';

const links = [
  ['Home', '/'],
  ['Design Studio', '/design'],
  ['Creator Hub', '/creator-hub'],
  ['Checkout', '/checkout'],
  ['About', '/about'],
];

export async function Navigation() {
  const user = await getCurrentUser();

  return (
    <header className="site-shell nav-shell">
      <Link href="/" className="brand-mark">
        <span>Wearables</span>
        <span>Studio</span>
      </Link>
      <nav className="main-nav">
        {links.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        {user?.role === 'admin' && <Link href="/dashboard">Dashboard</Link>}
      </nav>
      <div className="nav-actions">
        {user ? (
          <>
            <span className="pill">{user.role}</span>
            <form action={logoutAction}>
              <button className="ghost-button" type="submit">Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="ghost-button">Login</Link>
            <Link href="/signup" className="primary-button">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
