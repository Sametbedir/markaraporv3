import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import GoalsClient from './_components/goals-client';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <GoalsClient />
    </SidebarLayout>
  );
}
