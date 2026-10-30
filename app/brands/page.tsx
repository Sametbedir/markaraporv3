import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import BrandsClient from './_components/brands-client';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const session = await auth();
  if (!session) redirect('/');
  return (
    <SidebarLayout>
      <BrandsClient />
    </SidebarLayout>
  );
}
