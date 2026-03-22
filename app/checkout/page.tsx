import { CheckoutClient } from '@/components/checkout-client';
import { getSession } from '@/lib/auth';

export default async function CheckoutPage() {
  const session = await getSession();

  return (
    <div className="container">
      <CheckoutClient
        userId={session?.id ?? 'customer-guest'}
        customerName={session?.name ?? ''}
        phone={session?.phone ?? ''}
      />
    </div>
  );
}
