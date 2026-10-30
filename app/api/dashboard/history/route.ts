export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';

export async function GET(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  const url = new URL(req.url);
  const months = Math.min(Math.max(parseInt(url.searchParams.get('months') ?? '6'), 1), 24);
  const today = new Date();
  const points: any[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

    const m = await prisma.dailyMetric.aggregate({
      where: { brandId, date: { gte: ms, lte: me } },
      _sum: { spend: true, revenue: true },
    });
    const o = await prisma.order.aggregate({
      where: { brandId, ...storeOrderWhere, orderDate: { gte: ms, lte: me } },
      _count: { id: true },
    });
    const spend = m._sum?.spend ?? 0;
    const revenue = m._sum?.revenue ?? 0;
    const orderCount = o._count?.id ?? 0;
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
