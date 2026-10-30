export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';

export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  const goals = await prisma.goal.findMany({ where: { brandId } });
  const result = await Promise.all(goals.map(async (goal) => {
    const metrics = await prisma.dailyMetric.aggregate({ where: { brandId, date: { gte: goal.startDate, lte: goal.endDate } }, _sum: { spend: true, revenue: true } });
    const orders = await prisma.order.count({ where: { brandId, ...storeOrderWhere, orderDate: { gte: goal.startDate, lte: goal.endDate } } });
    const spend = metrics._sum.spend ?? 0;
    const revenue = metrics._sum.revenue ?? 0;
    const currentValue = goal.targetType === 'spend' ? spend : goal.targetType === 'orders' ? orders : goal.targetType === 'roas' ? (spend ? revenue / spend : 0) : goal.targetType === 'profit' ? revenue - spend : revenue;
    return { id: goal.id, currentValue, percentage: goal.targetValue ? (currentValue / goal.targetValue) * 100 : 0 };
  }));
  return NextResponse.json(result);
}