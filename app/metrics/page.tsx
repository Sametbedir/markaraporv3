import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import MetricsClient from './_components/metrics-client';

export const dynamic = 'force-dynamic';

export default async function MetricsPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <MetricsClient />
    </SidebarLayout>
  );
}
