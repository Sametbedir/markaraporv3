export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoMetricsInRange, sumDemoMetrics } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  if (session.user.id === 'admin-demo-user') {
    const url = new URL(req.url);
    const metrics = demoMetricsInRange(url.searchParams.get('start_date'), url.searchParams.get('end_date'));
    // Aynı kampanyanın tüm günleri toplanır (önceden yalnızca son gün gösteriliyordu)
    const grouped = new Map<string, ReturnType<typeof sumDemoMetrics> & { platform: string; campaign: string }>();
    for (const metric of metrics) {
      const key = `${metric.platform}|${metric.campaign}`;
      const current = grouped.get(key) ?? { ...sumDemoMetrics([]), platform: metric.platform, campaign: metric.campaign };
      const add = sumDemoMetrics([metric]);
      grouped.set(key, {
        ...current,
        spend: current.spend + add.spend, revenue: current.revenue + add.revenue, orders: current.orders + add.orders,
        impressions: current.impressions + add.impressions, clicks: current.clicks + add.clicks, conversions: current.conversions + add.conversions,
      });
    }
    return NextResponse.json([...grouped.values()].map((c) => ({
      campaign_id: `${c.platform}|${c.campaign}`, campaign_name: c.campaign, platform: c.platform,
      impressions: c.impressions, clicks: c.clicks, spend: c.spend,
      conversions: c.conversions, revenue: c.revenue,
      roas: c.spend ? c.revenue / c.spend : 0,
      ctr: c.impressions ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks ? c.spend / c.clicks : 0, data_source_label: 'Yüklenen veri',
    })).sort((a, b) => b.roas - a.roas));
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
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

  const result = (campaigns ?? []).map((c: any) => {
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
      data_source_label: c.dataSourceLabel,
    };
  });

  result.sort((a: any, b: any) => b.roas - a.roas);
  return NextResponse.json(result);
}
