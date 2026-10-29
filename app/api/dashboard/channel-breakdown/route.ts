export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';
import { demoMetricsInRange } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  if (session.user.id === 'admin-demo-user') {
    const url = new URL(req.url);
    const metrics = demoMetricsInRange(url.searchParams.get('start_date'), url.searchParams.get('end_date'));
    const grouped = new Map<string, { orders: number; revenue: number }>();
    for (const metric of metrics) {
      const current = grouped.get(metric.platform) ?? { orders: 0, revenue: 0 };
      current.orders += metric.orders; current.revenue += metric.revenue;
      grouped.set(metric.platform, current);
    }
    const totalOrders = [...grouped.values()].reduce((sum, item) => sum + item.orders, 0) || 1;
    return NextResponse.json([...grouped.entries()].map(([channel, item]) => ({ channel, order_count: item.orders, total_revenue: item.revenue, percentage: (item.orders / totalOrders) * 100 })));
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 86400000);
  const userId = session.user.id;

  const channels = await prisma.order.groupBy({
    by: ['channel'],
    where: { userId, ...storeOrderWhere, orderDate: { gte: start, lte: end } },
    _count: { id: true },
    _sum: { totalPrice: true },
  });

  const totalOrders = (channels ?? []).reduce((s: number, c: any) => s + (c._count?.id ?? 0), 0) || 1;

  const result = (channels ?? []).map((c: any) => ({
    channel: c.channel,
    order_count: c._count?.id ?? 0,
    total_revenue: Math.round((c._sum?.totalPrice ?? 0) * 100) / 100,
    percentage: Math.round(((c._count?.id ?? 0) / totalOrders) * 1000) / 10,
  }));

  return NextResponse.json(result);
}
