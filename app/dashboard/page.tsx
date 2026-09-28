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

        {/* SEO & GEO Marka Raporu Hızlı Erişim Banner'ı */}
        <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary text-primary-foreground">
                Yeni Özellik
              </span>
              <h4 className="font-bold text-foreground text-sm">
                SEO & GEO Marka Raporu ve Erken Uyarı Radarı
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Google Trends anlık verileri, İkas/Shopify/Ticimax/IdeaSoft altyapınıza özel adım adım panel uygulama rehberi ve bölgesel fırsat haritası.
            </p>
          </div>
          <a
            href="/seo-geo"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition shadow shrink-0"
          >
            SEO & GEO Raporuna Git →
          </a>
        </div>
      </div>
    </SidebarLayout>
  );
}