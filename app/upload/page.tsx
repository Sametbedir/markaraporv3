import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar-layout';
import UploadClient from './_components/upload-client';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <div className="p-6">
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>}>
          <UploadClient />
        </Suspense>
      </div>
    </SidebarLayout>
  );
}
