import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar-layout';
import ReportClient from './_components/report-client';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>}>
        <ReportClient />
      </Suspense>
    </SidebarLayout>
  );
}
