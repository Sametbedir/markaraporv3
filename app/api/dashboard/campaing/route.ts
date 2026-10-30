export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;
  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 86400000);

  const campaigns = await prisma.campaign.findMany({
    where: { brandId },
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
