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

      const channels = await prisma.order.groupBy({
        by: ['channel'],
        where: { userId, orderDate: { gte: start, lte: end } },
        _count: { id: true },
        _sum: { totalPrice: true, itemCount: true },
      });

      if (channels && channels.length > 0) {
        const totalOrders = channels.reduce((s: number, c: any) => s + (c._sum?.itemCount || c._count?.id || 0), 0) || 1;
        const result = channels.map((c: any) => {
          const count = c._sum?.itemCount || c._count?.id || 0;
          return {
            channel: c.channel,
            order_count: count,
            total_revenue: Math.round((c._sum?.totalPrice ?? 0) * 100) / 100,
            percentage: Math.round((count / totalOrders) * 1000) / 10,
          };
        });
        return NextResponse.json(result);
      }
    } catch (err: any) {
      console.warn('[channel-breakdown] DB failed, fallback to memory:', err?.message);
    }
  }

  // ── Memory Fallback ──
  const metrics = demoMetricsInRange(startDate, endDate);
  const grouped = new Map<string, { orders: number; revenue: number }>();
  for (const metric of metrics) {
    const ch = metric.platform || 'Meta Ads';
    const current = grouped.get(ch) ?? { orders: 0, revenue: 0 };
    current.orders += metric.orders || metric.conversions || 0;
    current.revenue += metric.revenue || 0;
    grouped.set(ch, current);
  }
  const totalOrders = [...grouped.values()].reduce((sum, item) => sum + item.orders, 0) || 1;
  return NextResponse.json(
    [...grouped.entries()].map(([channel, item]) => ({
      channel,
      order_count: item.orders,
      total_revenue: Math.round(item.revenue * 100) / 100,
      percentage: Math.round((item.orders / totalOrders) * 1000) / 10,
    }))
  );
}
