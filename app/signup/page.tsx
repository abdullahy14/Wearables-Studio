import { signupAction } from '@/app/actions';

export default function SignupPage() {
  return (
    <section className="auth-shell panel">
      <p className="eyebrow">Sign Up</p>
      <h1>Create a customer, creator, or admin account</h1>
      <form action={signupAction} className="form-stack">
        <label>Name<input name="name" required /></label>
        <label>Username<input name="username" required /></label>
        <label>Email<input type="email" name="email" required /></label>
        <label>Password<input type="password" name="password" required /></label>
        <label>Role
          <select name="role" defaultValue="customer">
            <option value="customer">Customer</option>
            <option value="creator">Creator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button className="primary-button" type="submit">Create Account</button>
      </form>
    </section>
  );
}
