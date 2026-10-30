export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { LEGACY_SYNTHETIC_ORDER_SOURCE } from '@/lib/store-orders';

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

  const metrics = await prisma.dailyMetric.groupBy({
    by: ['date'],
    where: { brandId, date: { gte: start, lte: end } },
    _sum: { spend: true, revenue: true, impressions: true, clicks: true },
    orderBy: { date: 'asc' },
  });

  const orders = await prisma.$queryRaw<Array<{ d: string; cnt: number }>>`
    SELECT DATE(order_date) as d, COUNT(*)::int as cnt
    FROM orders WHERE brand_id = ${brandId}
      AND source <> ${LEGACY_SYNTHETIC_ORDER_SOURCE}
      AND order_date >= ${start} AND order_date <= ${end}
    GROUP BY DATE(order_date) ORDER BY d`;

  const orderMap: Record<string, number> = {};
  (orders ?? []).forEach((r: any) => {
    // DATE() Postgres'ten Date nesnesi olarak gelir; String(r.d) ISO anahtarla hiç eşleşmiyordu
    orderMap[new Date(r.d).toISOString().split('T')[0]] = Number(r.cnt);
  });

  const metricMap: Record<string, any> = {};
  for (const m of metrics ?? []) {
    const key = new Date(m.date).toISOString().split('T')[0];
    metricMap[key] = {
      spend: m._sum?.spend ?? 0,
      revenue: m._sum?.revenue ?? 0,
      impressions: m._sum?.impressions ?? 0,
      clicks: m._sum?.clicks ?? 0,
    };
  }

  const result: any[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().split('T')[0];
    const m = metricMap[key] ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
    const orderCount = orderMap[key] ?? 0;
    const roas = m.spend > 0 ? m.revenue / m.spend : 0;
    result.push({
      date: key,
      spend: Math.round(m.spend * 100) / 100,
      revenue: Math.round(m.revenue * 100) / 100,
      orders: orderCount,
      impressions: m.impressions,
      clicks: m.clicks,
      roas: Math.round(roas * 100) / 100,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return NextResponse.json(result);
}
