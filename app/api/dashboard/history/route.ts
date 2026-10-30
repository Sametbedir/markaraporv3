export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';
import { demoMetricsInRange, sumDemoMetrics } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const url = new URL(req.url);
  const months = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 1), 24);
  const userId = session.user.id;
  const isDemo = userId === 'admin-demo-user';
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const points: any[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

    let spend: number, revenue: number, orderCount: number;
    if (isDemo) {
      const sum = sumDemoMetrics(demoMetricsInRange(iso(ms), iso(me)));
      spend = sum.spend;
      revenue = sum.revenue;
      orderCount = sum.orders;
    } else {
      const m = await prisma.dailyMetric.aggregate({
        where: { userId, date: { gte: ms, lte: me } },
        _sum: { spend: true, revenue: true },
      });
      const o = await prisma.order.aggregate({
        where: { userId, ...storeOrderWhere, orderDate: { gte: ms, lte: me } },
        _count: { id: true },
      });
      spend = m._sum?.spend ?? 0;
      revenue = m._sum?.revenue ?? 0;
      orderCount = o._count?.id ?? 0;
    }
    points.push({
      month: `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, '0')}`,
      spend: Math.round(spend * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      orders: orderCount,
    });
  }

  return NextResponse.json({ points });
}
