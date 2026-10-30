import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar-layout';
import DashboardClient from './_components/dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/');

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <Suspense fallback={<div className="h-96 flex items-center justify-center text-muted-foreground text-sm">Yükleniyor...</div>}>
          <DashboardClient />
        </Suspense>

        {/* SEO & GEO ve Rakip Analizi Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 flex flex-col justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary text-primary-foreground">
                  Strateji
                </span>
                <h4 className="font-bold text-foreground text-sm">
                  SEO &amp; GEO Marka Raporu
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Google Trends anlık verileri, İkas/Shopify/Ticimax/IdeaSoft altyapı panel rehberi ve bölgesel fırsat haritası.
              </p>
            </div>
            <a
              href="/seo-geo"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition shadow self-start"
            >
              SEO &amp; GEO Raporuna Git →
            </a>
          </div>

          <div className="p-5 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-background to-amber-500/5 flex flex-col justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500 text-white">
                  Yeni
                </span>
                <h4 className="font-bold text-foreground text-sm">
                  Stratejik Rekabet &amp; Huni Raporu
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajans seviyesi rakip analizi, teklif ve huni matrisi, fiyatlandırma stratejisi, reklam kancaları ve aksiyon planı.
              </p>
            </div>
            <a
              href="/competitor"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition shadow self-start"
            >
              Rakip Analizine Git →
            </a>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}