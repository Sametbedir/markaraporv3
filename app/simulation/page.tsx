import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import SimulationClient from './_components/simulation-client';

export const dynamic = 'force-dynamic';

export default async function SimulationPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <SimulationClient />
    </SidebarLayout>
  );
}
