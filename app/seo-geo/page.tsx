import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import SeoGeoClient from './_components/seo-geo-client';

export const dynamic = 'force-dynamic';

export default async function SeoGeoPage() {
  const session = await auth();
  if (!session) redirect('/');

  const user = session.user as any;
  const initialPlatform = user?.ikasStoreUrl
    ? 'ikas'
    : user?.ticimaxApiKey
    ? 'ticimax'
    : user?.shopifyShopUrl
    ? 'shopify'
    : 'ikas';

  return (
    <SidebarLayout>
      <SeoGeoClient
        userEmail={session.user?.email || ''}
        userCompany={user?.companyName || user?.name || ''}
        initialPlatform={initialPlatform}
      />
    </SidebarLayout>
  );
}
