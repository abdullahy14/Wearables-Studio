import { redirect } from 'next/navigation';

import { DashboardClient } from '@/components/dashboard-client';
import { getSession } from '@/lib/auth';
import { getDashboardData } from '@/lib/store';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/login');
  }

  const dashboard = await getDashboardData();

  return (
    <div className="container">
      <DashboardClient
        initialOrders={dashboard.orders}
        designs={dashboard.designs}
        users={dashboard.users}
        stats={dashboard.stats}
      />
    </div>
  );
}
