'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = ((await response.json()) as { error?: string }).error;
      setError(message ?? 'Unable to continue.');
      setSubmitting(false);
      return;
    }

    router.push(mode === 'login' ? '/dashboard' : '/');
    router.refresh();
  }

  return (
    <form className="surface-card" onSubmit={handleSubmit} style={{ padding: 28, display: 'grid', gap: 14, maxWidth: 520 }}>
      <div>
        <p className="badge">{mode === 'login' ? 'Secure sign in' : 'Create account'}</p>
        <h1 style={{ margin: '14px 0 4px', fontSize: 38, letterSpacing: '-0.05em' }}>
          {mode === 'login' ? 'Welcome back' : 'Join Wearables Studio'}
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {mode === 'login'
            ? 'Use a seeded admin, creator, or customer account to explore role-based flows.'
            : 'Sign up as a customer or creator to save designs and place orders.'}
        </p>
      </div>
      {mode === 'signup' ? <input name="name" className="input" placeholder="Full name" required /> : null}
      {mode === 'signup' ? <input name="username" className="input" placeholder="Username" required /> : null}
      {mode === 'signup' ? <input name="phone" className="input" placeholder="Phone number" required /> : null}
      <input name="email" type="email" className="input" placeholder="Email address" required />
      <input name="password" type="password" className="input" placeholder="Password" required minLength={6} />
      {mode === 'signup' ? (
        <select name="role" className="select" defaultValue="customer">
          <option value="customer">Customer</option>
          <option value="creator">Creator</option>
        </select>
      ) : null}
      {error ? <p style={{ color: '#8b0000', margin: 0 }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
      {mode === 'login' ? (
        <p style={{ color: 'var(--muted)', margin: 0 }}>Demo password for seeded accounts: <strong>wearables123</strong></p>
      ) : null}
    </form>
  );
}
