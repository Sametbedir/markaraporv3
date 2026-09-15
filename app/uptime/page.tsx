import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import UptimeClient from './_components/uptime-client';

export const dynamic = 'force-dynamic';

export default async function UptimePage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <UptimeClient />
    </SidebarLayout>
  );
}
