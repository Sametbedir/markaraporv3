import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SidebarLayout from '@/components/sidebar-layout';
import DashboardClient from './_components/dashboard-client';
import AIAnalizKarti from '@/components/AIAnalizKarti';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/');

  // Panelindeki mevcut veriler (burayı dilersen veritabanından gelen gerçek verilerle güncelleyebilirsin)
  const anlikVeriler = {
    toplamHarcama: 460138,
    toplamCiro: 1682731,
    netKar: 1222592,
    siparis: 3579,
    roas: 3.66,
    netRoas: 2.66,
    karMarji: "72.66%"
  };

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        {/* Mevcut client dashboard bileşenin */}
        <DashboardClient />
        
        {/* Yapay Zeka Analiz Asistanı */}
        <AIAnalizKarti dashboardVerileri={anlikVeriler} />
      </div>
    </SidebarLayout>
  );
}