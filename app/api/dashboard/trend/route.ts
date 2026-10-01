export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoMetricsInRange } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  if (session.user.id === 'admin-demo-user') {
    const url = new URL(req.url);
    const metrics = demoMetricsInRange(url.searchParams.get('start_date'), url.searchParams.get('end_date'));
    const grouped = new Map<string, typeof metrics[number]>();
    for (const metric of metrics) {
      const current = grouped.get(metric.date) ?? { ...metric, spend: 0, revenue: 0, orders: 0, impressions: 0, clicks: 0, conversions: 0 };
      current.spend += metric.spend; current.revenue += metric.revenue; current.orders += metric.orders;
      current.impressions += metric.impressions; current.clicks += metric.clicks; current.conversions += metric.conversions;
      grouped.set(metric.date, current);
    }
    return NextResponse.json([...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).map((metric) => ({
      ...metric, roas: metric.spend ? metric.revenue / metric.spend : 0,
    })));
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 86400000);
  const userId = session.user.id;

  const metrics = await prisma.dailyMetric.groupBy({
    by: ['date'],
    where: { userId, date: { gte: start, lte: end } },
    _sum: { spend: true, revenue: true, impressions: true, clicks: true, conversions: true },
    orderBy: { date: 'asc' },
  });

  let orders: Array<{ d: string; cnt: number }> = [];
  try {
    orders = await prisma.$queryRaw<Array<{ d: string; cnt: number }>>`
      SELECT DATE(order_date) as d, SUM(COALESCE(item_count, 1))::int as cnt
      FROM orders WHERE user_id = ${userId}
        AND order_date >= ${start} AND order_date <= ${end}
      GROUP BY DATE(order_date) ORDER BY d`;
  } catch {
    orders = [];
  }

  const orderMap: Record<string, number> = {};
  (orders ?? []).forEach((r: any) => {
    orderMap[String(r.d)] = Number(r.cnt);
  });

  const metricMap: Record<string, any> = {};
  for (const m of metrics ?? []) {
    const key = new Date(m.date).toISOString().split('T')[0];
    metricMap[key] = {
      spend: m._sum?.spend ?? 0,
      revenue: m._sum?.revenue ?? 0,
      impressions: m._sum?.impressions ?? 0,
      clicks: m._sum?.clicks ?? 0,
      conversions: m._sum?.conversions ?? 0,
    };
  }

  const result: any[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = cur.toISOString().split('T')[0];
    const m = metricMap[key] ?? { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
    const orderCount = orderMap[key] || m.conversions || 0;
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
