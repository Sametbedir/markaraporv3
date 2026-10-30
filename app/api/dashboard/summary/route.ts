export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { brandCosts, requireBrand } from '@/lib/brand';
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

  const metrics = await prisma.dailyMetric.aggregate({
    where: { brandId, date: { gte: start, lte: end } },
    _sum: { spend: true, revenue: true, impressions: true, clicks: true, conversions: true },
  });

  const orderAgg = await prisma.order.aggregate({
    where: { brandId, ...storeOrderWhere, orderDate: { gte: start, lte: end } },
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
  const costs = brandCosts(ctx.brand);
  const commissionCost = totalRevenue * (costs.avgCommission / 100);
  const shippingCost = totalOrders * costs.shippingCostPerOrder;
  const returnsCost = totalRevenue * (costs.returnRate / 100);
  const cogsCost = totalRevenue * (costs.productCogsRate / 100);
  const totalProfit = totalRevenue - totalSpend - commissionCost - shippingCost - returnsCost - cogsCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const netRoas = totalSpend > 0 ? totalProfit / totalSpend : 0;

  return NextResponse.json({
    total_spend: Math.round(totalSpend * 100) / 100,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_orders: totalOrders,
    // false ise mağaza siparişi verisi yok: kart 0 değil "—" gösterir
    has_store_orders: totalOrders > 0,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_conversions: totalConversions,
    avg_roas: Math.round(avgRoas * 100) / 100,
    avg_ctr: Math.round(avgCtr * 100) / 100,
    avg_cpc: Math.round(avgCpc * 100) / 100,
    total_profit: Math.round(totalProfit * 100) / 100,
    profit_margin: Math.round(profitMargin * 100) / 100,
    net_roas: Math.round(netRoas * 100) / 100,
    total_commission: Math.round(commissionCost * 100) / 100,
    total_shipping: Math.round(shippingCost * 100) / 100,
    total_returns: Math.round(returnsCost * 100) / 100,
    total_cogs: Math.round(cogsCost * 100) / 100,
  });
}
