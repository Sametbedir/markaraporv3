export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoMetricsInRange, demoSettings, sumDemoMetrics } from '@/lib/demo-data';
import { storeOrderWhere } from '@/lib/store-orders';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await req.json();
  const { current_budget, new_budget, start_date, end_date } = body ?? {};

  if (!current_budget || !new_budget) {
    return NextResponse.json({ error: 'Bütçe değerleri gereklidir' }, { status: 400 });
  }

  const userId = session.user.id;
  const isDemo = userId === 'admin-demo-user';

  // Tarih verilmezse bugünü değil, mevcut verinin son gününü bitiş kabul et;
  // aksi halde eski tarihli yüklemeler "veri yok" görünür.
  let latest: Date | null = null;
  if (!end_date) {
    if (isDemo) {
      const last = demoMetricsInRange().map((m) => m.date).sort().pop();
      latest = last ? new Date(`${last}T00:00:00.000Z`) : null;
    } else {
      const agg = await prisma.dailyMetric.aggregate({ where: { userId }, _max: { date: true } });
      latest = agg._max.date;
    }
  }
  const end = end_date ? new Date(end_date) : latest ?? new Date();
  const start = start_date ? new Date(start_date) : new Date(end.getTime() - 29 * 86400000);

  const toIso = (d: Date) => d.toISOString().split('T')[0];

  // Geçmiş metrikler (demo modunda bellekten, aksi halde veritabanından)
  let totalSpend: number, totalRevenue: number, totalClicks: number, totalImpressions: number, totalOrders: number, dataPoints: number;
  if (isDemo) {
    const rows = demoMetricsInRange(toIso(start), toIso(end));
    const sum = sumDemoMetrics(rows);
    totalSpend = sum.spend;
    totalRevenue = sum.revenue;
    totalClicks = sum.clicks;
    totalImpressions = sum.impressions;
    totalOrders = sum.orders;
    dataPoints = rows.length;
  } else {
    const metrics = await prisma.dailyMetric.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { spend: true, revenue: true, clicks: true, impressions: true, conversions: true },
      _count: { id: true },
    });
    const orders = await prisma.order.aggregate({
      where: { userId, ...storeOrderWhere, orderDate: { gte: start, lte: end } },
      _count: { id: true },
    });
    totalSpend = metrics._sum?.spend ?? 0;
    totalRevenue = metrics._sum?.revenue ?? 0;
    totalClicks = metrics._sum?.clicks ?? 0;
    totalImpressions = metrics._sum?.impressions ?? 0;
    totalOrders = orders._count?.id ?? 0;
    dataPoints = metrics._count?.id ?? 0;
  }

  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Geçmiş veri yoksa projeksiyon üretmiyoruz; aksi halde 0 ROAS üzerinden yanıltıcı bir güven skoru çıkar.
  if (dataPoints === 0) {
    return NextResponse.json({ error: 'Seçilen dönemde geçmiş reklam verisi yok. Önce veri yükleyin.' }, { status: 400 });
  }

  const budgetRatio = Number(new_budget) / Number(current_budget);

  // Diminishing returns factor
  let efficiencyFactor = 1;
  if (budgetRatio > 1.2) {
    const excess = budgetRatio - 1.2;
    efficiencyFactor = 1 - Math.min(excess * 0.15, 0.3);
  } else if (budgetRatio < 0.8) {
    efficiencyFactor = 1.05;
  }

  const projectedSpend = Number(new_budget);
  const projectedRevenue = Math.round(projectedSpend * avgRoas * efficiencyFactor * 100) / 100;
  const projectedRoas = projectedSpend > 0 ? Math.round((projectedRevenue / projectedSpend) * 100) / 100 : 0;
  const projectedOrders = totalSpend > 0 ? Math.round(totalOrders * budgetRatio * efficiencyFactor) : 0;

  // Profit calculation
  const user = isDemo
    ? {
        commissionRateTrendyol: Number(demoSettings.commission_rate_trendyol ?? 0),
        commissionRateHepsiburada: Number(demoSettings.commission_rate_hepsiburada ?? 0),
        commissionRateShopify: Number(demoSettings.commission_rate_shopify ?? 0),
        commissionRateIkas: Number(demoSettings.commission_rate_ikas ?? 0),
        commissionRateTicimax: Number(demoSettings.commission_rate_ticimax ?? 0),
        shippingCostPerOrder: Number(demoSettings.shipping_cost_per_order ?? 0),
        returnRate: Number(demoSettings.return_rate ?? 0),
        productCogsRate: Number(demoSettings.product_cogs_rate ?? 0),
      }
    : await prisma.user.findUnique({ where: { id: userId } });
  const avgCommission = (
    (user?.commissionRateTrendyol ?? 0) + (user?.commissionRateHepsiburada ?? 0) +
    (user?.commissionRateShopify ?? 0) + (user?.commissionRateIkas ?? 0) + (user?.commissionRateTicimax ?? 0)
  ) / 5;
  const projectedProfit = Math.round(
    (projectedRevenue - projectedSpend -
      projectedRevenue * avgCommission / 100 -
      projectedOrders * (user?.shippingCostPerOrder ?? 0) -
      projectedRevenue * (user?.returnRate ?? 0) / 100 -
      projectedRevenue * (user?.productCogsRate ?? 0) / 100
    ) * 100
  ) / 100;

  // Confidence score
  let confidence = 70;
  if (dataPoints >= 20) confidence += 10;
  if (dataPoints >= 50) confidence += 10;
  if (Math.abs(budgetRatio - 1) < 0.3) confidence += 5;
  if (budgetRatio > 2) confidence -= 15;
  confidence = Math.max(30, Math.min(95, confidence));

  return NextResponse.json({
    projected_spend: projectedSpend,
    projected_revenue: projectedRevenue,
    projected_roas: projectedRoas,
    projected_orders: projectedOrders,
    projected_profit: projectedProfit,
    confidence_score: confidence,
    historical: {
      avg_roas: Math.round(avgRoas * 100) / 100,
      avg_ctr: Math.round(avgCtr * 10000) / 100,
      avg_cpc: Math.round(avgCpc * 100) / 100,
      data_points: dataPoints,
      period_start: toIso(start),
      period_end: toIso(end),
    },
  });
}
