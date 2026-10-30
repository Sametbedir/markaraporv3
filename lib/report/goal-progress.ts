import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';

export type GoalProgressRow = {
  id: string;
  periodType: string;
  targetType: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  currentValue: number;
  percentage: number;
};

/** Markanın hedefleri ve hedef dönemindeki gerçekleşen değer. */
export async function goalProgress(brandId: string, { activeOnly = true } = {}): Promise<GoalProgressRow[]> {
  const goals = await prisma.goal.findMany({
    where: { brandId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { startDate: 'desc' },
  });
  return Promise.all(
    goals.map(async (goal) => {
      const metrics = await prisma.dailyMetric.aggregate({
        where: { brandId, date: { gte: goal.startDate, lte: goal.endDate } },
        _sum: { spend: true, revenue: true },
      });
      const orders = await prisma.order.count({
        where: { brandId, ...storeOrderWhere, orderDate: { gte: goal.startDate, lte: goal.endDate } },
      });
      const spend = metrics._sum.spend ?? 0;
      const revenue = metrics._sum.revenue ?? 0;
      const currentValue =
        goal.targetType === 'spend' ? spend
          : goal.targetType === 'orders' ? orders
            : goal.targetType === 'roas' ? (spend ? revenue / spend : 0)
              : goal.targetType === 'profit' ? revenue - spend
                : revenue;
      return {
        id: goal.id,
        periodType: goal.periodType,
        targetType: goal.targetType,
        targetValue: goal.targetValue,
        startDate: goal.startDate.toISOString().slice(0, 10),
        endDate: goal.endDate.toISOString().slice(0, 10),
        currentValue,
        percentage: goal.targetValue ? (currentValue / goal.targetValue) * 100 : 0,
      };
    })
  );
}
