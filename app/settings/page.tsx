import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import SettingsClient from './_components/settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <SettingsClient />
    </SidebarLayout>
  );
}
