import { loginAction } from '@/app/actions';

export default function LoginPage() {
  return (
    <section className="auth-shell panel">
      <p className="eyebrow">Login</p>
      <h1>Access your Wearables Studio account</h1>
      <form action={loginAction} className="form-stack">
        <label>Email<input type="email" name="email" required /></label>
        <label>Password<input type="password" name="password" required /></label>
        <button className="primary-button" type="submit">Login</button>
      </form>
      <p className="muted">Demo admin: admin@wearables.studio / Admin123!</p>
    </section>
  );
}
