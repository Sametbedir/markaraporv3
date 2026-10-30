export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { brandCosts, requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';

export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  const body = await req.json();
  const { current_budget, new_budget, start_date, end_date } = body ?? {};

  if (!current_budget || !new_budget) {
    return NextResponse.json({ error: 'Bütçe değerleri gereklidir' }, { status: 400 });
  }

  // Tarih verilmezse bugünü değil, mevcut verinin son gününü bitiş kabul et;
  // aksi halde eski tarihli yüklemeler "veri yok" görünür.
  let latest: Date | null = null;
  if (!end_date) {
    const agg = await prisma.dailyMetric.aggregate({ where: { brandId }, _max: { date: true } });
    latest = agg._max.date;
  }
  const end = end_date ? new Date(end_date) : latest ?? new Date();
  const start = start_date ? new Date(start_date) : new Date(end.getTime() - 29 * 86400000);

  const toIso = (d: Date) => d.toISOString().split('T')[0];

  const metrics = await prisma.dailyMetric.aggregate({
    where: { brandId, date: { gte: start, lte: end } },
    _sum: { spend: true, revenue: true, clicks: true, impressions: true, conversions: true },
    _count: { id: true },
  });
  const orders = await prisma.order.aggregate({
    where: { brandId, ...storeOrderWhere, orderDate: { gte: start, lte: end } },
    _count: { id: true },
  });
  const totalSpend = metrics._sum?.spend ?? 0;
  const totalRevenue = metrics._sum?.revenue ?? 0;
  const totalClicks = metrics._sum?.clicks ?? 0;
  const totalImpressions = metrics._sum?.impressions ?? 0;
  const totalOrders = orders._count?.id ?? 0;
  const dataPoints = metrics._count?.id ?? 0;

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
  const costs = brandCosts(ctx.brand);
  const projectedProfit = Math.round(
    (projectedRevenue - projectedSpend -
      projectedRevenue * costs.avgCommission / 100 -
      projectedOrders * costs.shippingCostPerOrder -
      projectedRevenue * costs.returnRate / 100 -
      projectedRevenue * costs.productCogsRate / 100
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
