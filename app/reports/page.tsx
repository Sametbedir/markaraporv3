import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar-layout';
import ReportsClient from './_components/reports-client';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>}>
        <ReportsClient />
      </Suspense>
    </SidebarLayout>
  );
}
