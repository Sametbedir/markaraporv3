export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  if (session.user.id === 'admin-demo-user') return NextResponse.json({ points: [] });

  const url = new URL(req.url);
  const months = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 1), 24);
  const userId = session.user.id;
  const today = new Date();
  const points: any[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

    const m = await prisma.dailyMetric.aggregate({
      where: { userId, date: { gte: ms, lte: me } },
      _sum: { spend: true, revenue: true },
    });
    const o = await prisma.order.aggregate({
      where: { userId, ...storeOrderWhere, orderDate: { gte: ms, lte: me } },
      _count: { id: true },
    });
    const spend = m._sum?.spend ?? 0;
    const revenue = m._sum?.revenue ?? 0;
    points.push({
      month: `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, '0')}`,
      spend: Math.round(spend * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      orders: o._count?.id ?? 0,
    });
  }

  return NextResponse.json({ points });
}
