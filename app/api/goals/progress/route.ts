export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';
import { demoGoals, demoMetricsInRange } from '@/lib/demo-data';

function valueForGoal(goal: { targetType: string; startDate: string | Date; endDate: string | Date }, metrics: any[]) {
  if (goal.targetType === 'spend') return metrics.reduce((sum, metric) => sum + metric.spend, 0);
  if (goal.targetType === 'orders') return metrics.reduce((sum, metric) => sum + metric.orders, 0);
  const spend = metrics.reduce((sum, metric) => sum + metric.spend, 0);
  const revenue = metrics.reduce((sum, metric) => sum + metric.revenue, 0);
  if (goal.targetType === 'roas') return spend ? revenue / spend : 0;
  if (goal.targetType === 'profit') return revenue - spend;
  return revenue;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  if (session.user.id === 'admin-demo-user') {
    return NextResponse.json(demoGoals.map((goal) => {
      const metrics = demoMetricsInRange(goal.startDate, goal.endDate);
      const currentValue = valueForGoal(goal, metrics);
      return { id: goal.id, currentValue, percentage: goal.targetValue ? (currentValue / goal.targetValue) * 100 : 0 };
    }));
  }

  const goals = await prisma.goal.findMany({ where: { userId: session.user.id } });
  const result = await Promise.all(goals.map(async (goal) => {
    const metrics = await prisma.dailyMetric.aggregate({ where: { userId: session.user.id, date: { gte: goal.startDate, lte: goal.endDate } }, _sum: { spend: true, revenue: true } });
    const orders = await prisma.order.count({ where: { userId: session.user.id, ...storeOrderWhere, orderDate: { gte: goal.startDate, lte: goal.endDate } } });
    const spend = metrics._sum.spend ?? 0;
    const revenue = metrics._sum.revenue ?? 0;
    const currentValue = goal.targetType === 'spend' ? spend : goal.targetType === 'orders' ? orders : goal.targetType === 'roas' ? (spend ? revenue / spend : 0) : goal.targetType === 'profit' ? revenue - spend : revenue;
    return { id: goal.id, currentValue, percentage: goal.targetValue ? (currentValue / goal.targetValue) * 100 : 0 };
  }));
  return NextResponse.json(result);
}