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
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 86400000);

  const channels = await prisma.order.groupBy({
    by: ['channel'],
    where: { brandId, ...storeOrderWhere, orderDate: { gte: start, lte: end } },
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
