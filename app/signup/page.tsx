import { AuthForm } from '@/components/auth-form';

export default function SignupPage() {
  return (
    <div className="container" style={{ display: 'grid', placeItems: 'center' }}>
      <AuthForm mode="signup" />
    </div>
  );
}
