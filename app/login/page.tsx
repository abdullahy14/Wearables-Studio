import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <div className="container" style={{ display: 'grid', placeItems: 'center' }}>
      <AuthForm mode="login" />
    </div>
  );
}
