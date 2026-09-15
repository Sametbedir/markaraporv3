import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import UploadClient from './_components/upload-client';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <UploadClient />
    </SidebarLayout>
  );
}
