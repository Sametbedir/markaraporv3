import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import CompetitorClient from './_components/competitor-client';

export const dynamic = 'force-dynamic';

export default async function CompetitorPage() {
  const session = await auth();
  if (!session) redirect('/');

  const user = session.user as any;

  return (
    <SidebarLayout>
      <CompetitorClient
        userEmail={session.user?.email || ''}
        userCompany={user?.companyName || user?.name || ''}
        userWebsite={user?.website || ''}
      />
    </SidebarLayout>
  );
}
