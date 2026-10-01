export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoMetricsInRange } from '@/lib/demo-data';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  if (session.user.id === 'admin-demo-user') {
    const url = new URL(req.url);
    const metrics = demoMetricsInRange(url.searchParams.get('start_date'), url.searchParams.get('end_date'));
    const totalSpend = metrics.reduce((sum, metric) => sum + metric.spend, 0);
    const totalRevenue = metrics.reduce((sum, metric) => sum + metric.revenue, 0);
    const totalOrders = metrics.reduce((sum, metric) => sum + metric.orders, 0);
    const totalImpressions = metrics.reduce((sum, metric) => sum + metric.impressions, 0);
    const totalClicks = metrics.reduce((sum, metric) => sum + metric.clicks, 0);
    const totalConversions = metrics.reduce((sum, metric) => sum + metric.conversions, 0);
    return NextResponse.json({
      total_spend: totalSpend, total_revenue: totalRevenue, total_orders: totalOrders,
      total_impressions: totalImpressions, total_clicks: totalClicks, total_conversions: totalConversions,
      avg_roas: totalSpend ? totalRevenue / totalSpend : 0,
      avg_ctr: totalImpressions ? (totalClicks / totalImpressions) * 100 : 0,
      avg_cpc: totalClicks ? totalSpend / totalClicks : 0,
      avg_aov: totalOrders ? totalRevenue / totalOrders : 0,
      avg_cac: totalOrders ? totalSpend / totalOrders : 0,
      total_profit: totalRevenue - totalSpend,
      profit_margin: totalRevenue ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0,
      net_roas: totalSpend ? (totalRevenue - totalSpend) / totalSpend : 0,
      total_commission: 0, total_shipping: 0, total_returns: 0, total_cogs: 0,
      daily_revenue: totalRevenue / 30,
    });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 86400000);

  const userId = session.user.id;

  const metrics = await prisma.dailyMetric.aggregate({
    where: { userId, date: { gte: start, lte: end } },
    _sum: { spend: true, revenue: true, impressions: true, clicks: true, conversions: true },
  });

  const orderAgg = await prisma.order.aggregate({
    where: { userId, orderDate: { gte: start, lte: end } },
    _count: { id: true },
    _sum: { totalPrice: true },
  });

  const totalSpend = metrics._sum?.spend ?? 0;
  const metricsRevenue = metrics._sum?.revenue ?? 0;
  const orderRevenue = orderAgg._sum?.totalPrice ?? 0;
  const totalRevenue = Math.max(metricsRevenue, orderRevenue);
  const totalOrders = orderAgg._count?.id ?? 0;
  const totalImpressions = metrics._sum?.impressions ?? 0;
  const totalClicks = metrics._sum?.clicks ?? 0;
  const totalConversions = metrics._sum?.conversions ?? 0;
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Profit calculation
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const avgCommission = (
    (user?.commissionRateTrendyol ?? 0) +
    (user?.commissionRateHepsiburada ?? 0) +
    (user?.commissionRateShopify ?? 0) +
    (user?.commissionRateIkas ?? 0) +
    (user?.commissionRateTicimax ?? 0)
  ) / 5;
  const commissionCost = totalRevenue * (avgCommission / 100);
  const shippingCost = totalOrders * (user?.shippingCostPerOrder ?? 0);
  const returnsCost = totalRevenue * ((user?.returnRate ?? 0) / 100);
  const cogsCost = totalRevenue * ((user?.productCogsRate ?? 0) / 100);
  const totalProfit = totalRevenue - totalSpend - commissionCost - shippingCost - returnsCost - cogsCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const netRoas = totalSpend > 0 ? totalProfit / totalSpend : 0;

  return NextResponse.json({
    total_spend: Math.round(totalSpend * 100) / 100,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_orders: totalOrders,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_conversions: totalConversions,
    avg_roas: Math.round(avgRoas * 100) / 100,
    avg_ctr: Math.round(avgCtr * 100) / 100,
    avg_cpc: Math.round(avgCpc * 100) / 100,
    avg_aov: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
    avg_cac: totalOrders > 0 ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0,
    total_profit: Math.round(totalProfit * 100) / 100,
    profit_margin: Math.round(profitMargin * 100) / 100,
    net_roas: Math.round(netRoas * 100) / 100,
    total_commission: Math.round(commissionCost * 100) / 100,
    total_shipping: Math.round(shippingCost * 100) / 100,
    total_returns: Math.round(returnsCost * 100) / 100,
    total_cogs: Math.round(cogsCost * 100) / 100,
    daily_revenue: Math.round((totalRevenue / 30) * 100) / 100,
  });
}
