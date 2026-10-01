export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoMetricsInRange } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  if (session.user.id !== 'admin-demo-user') {
    try {
      const now = new Date();
      const end = endDate ? new Date(endDate) : now;
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 86400000);
      const userId = session.user.id;

      const campaigns = await prisma.campaign.findMany({
        where: { userId },
        include: {
          dailyMetrics: {
            where: { date: { gte: start, lte: end } },
          },
        },
      });

      if (campaigns && campaigns.length > 0) {
        const result = campaigns
          .map((c: any) => {
            const ms = c.dailyMetrics ?? [];
            const spend = ms.reduce((s: number, m: any) => s + (m.spend ?? 0), 0);
            const revenue = ms.reduce((s: number, m: any) => s + (m.revenue ?? 0), 0);
            const impressions = ms.reduce((s: number, m: any) => s + (m.impressions ?? 0), 0);
            const clicks = ms.reduce((s: number, m: any) => s + (m.clicks ?? 0), 0);
            const conversions = ms.reduce((s: number, m: any) => s + (m.conversions ?? 0), 0);
            const roas = spend > 0 ? revenue / spend : 0;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;

            return {
              campaign_id: c.id,
              campaign_name: c.name,
              platform: c.platform,
              impressions,
              clicks,
              spend: Math.round(spend * 100) / 100,
              conversions,
              revenue: Math.round(revenue * 100) / 100,
              roas: Math.round(roas * 100) / 100,
              ctr: Math.round(ctr * 100) / 100,
              cpc: Math.round(cpc * 100) / 100,
              data_source_label: c.dataSourceLabel ?? 'API',
            };
          })
          .filter((c: any) => c.spend > 0 || c.revenue > 0 || c.impressions > 0 || c.clicks > 0);

        if (result.length > 0) {
          return NextResponse.json(result);
        }
      }
    } catch (err: any) {
      console.warn('[campaigns] DB failed, fallback to memory:', err?.message);
    }
  }

  // ── Memory Fallback ──
  const metrics = demoMetricsInRange(startDate, endDate);
  const campMap = new Map<string, any>();
  for (const m of metrics) {
    const name = m.campaign || 'Genel Kampanya';
    const cur = campMap.get(name) ?? {
      campaign_id: name,
      campaign_name: name,
      platform: m.platform || 'Meta Ads',
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      revenue: 0,
      data_source_label: 'Yüklenen Veri',
    };
    cur.impressions += m.impressions || 0;
    cur.clicks += m.clicks || 0;
    cur.spend += m.spend || 0;
    cur.conversions += m.orders || m.conversions || 0;
    cur.revenue += m.revenue || 0;
    campMap.set(name, cur);
  }

  return NextResponse.json(
    [...campMap.values()].map((c) => ({
      ...c,
      spend: Math.round(c.spend * 100) / 100,
      revenue: Math.round(c.revenue * 100) / 100,
      roas: c.spend ? Math.round((c.revenue / c.spend) * 100) / 100 : 0,
      ctr: c.impressions ? Math.round(((c.clicks / c.impressions) * 100) * 100) / 100 : 0,
      cpc: c.clicks ? Math.round((c.spend / c.clicks) * 100) / 100 : 0,
    }))
  );
}
