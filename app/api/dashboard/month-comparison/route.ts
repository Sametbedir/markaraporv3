export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';
import { demoMetricsInRange, sumDemoMetrics } from '@/lib/demo-data';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function periodMetrics(userId: string, isDemo: boolean, start: Date, end: Date) {
  if (isDemo) {
    const sum = sumDemoMetrics(demoMetricsInRange(iso(start), iso(end)));
    return { spend: sum.spend, revenue: sum.revenue, orders: sum.orders };
  }
  const m = await prisma.dailyMetric.aggregate({
    where: { userId, date: { gte: start, lte: end } },
    _sum: { spend: true, revenue: true },
  });
  const o = await prisma.order.aggregate({
    where: { userId, ...storeOrderWhere, orderDate: { gte: start, lte: end } },
    _count: { id: true },
  });
  return {
    spend: m._sum?.spend ?? 0,
    revenue: m._sum?.revenue ?? 0,
    orders: o._count?.id ?? 0,
  };
}

async function latestDataDate(userId: string, isDemo: boolean): Promise<Date | null> {
  if (isDemo) {
    const last = demoMetricsInRange().map((m) => m.date).sort().pop();
    return last ? new Date(`${last}T00:00:00`) : null;
  }
  const agg = await prisma.dailyMetric.aggregate({ where: { userId }, _max: { date: true } });
  const d = agg._max.date;
  return d ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const userId = session.user.id;
  const isDemo = userId === 'admin-demo-user';

  // Karşılaştırma son verinin olduğu güne göre yapılır (bugünden eskiyse), ve
  // iki ayın AYNI gün sayısı kıyaslanır: örn. 1–14 Eylül ile 1–14 Ağustos.
  const today = new Date();
  const latest = await latestDataDate(userId, isDemo);
  const anchor = latest && latest < today ? latest : today;
  const currentStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const dayOfMonth = anchor.getDate();
  const prevStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const prevMonthLastDay = new Date(anchor.getFullYear(), anchor.getMonth(), 0).getDate();
  const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), Math.min(dayOfMonth, prevMonthLastDay));

  const c = await periodMetrics(userId, isDemo, currentStart, anchor);
  const p = await periodMetrics(userId, isDemo, prevStart, prevEnd);

  const cRoas = c.spend > 0 ? c.revenue / c.spend : 0;
  const pRoas = p.spend > 0 ? p.revenue / p.spend : 0;

  // Önceki dönem 0 ise yüzde değişim tanımsızdır (null), "%0" gösterilmez
  const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
  const range = (a: Date, b: Date) =>
    `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;

  return NextResponse.json({
    current_month: range(currentStart, anchor),
    previous_month: range(prevStart, prevEnd),
    spend_change: pct(c.spend, p.spend),
    revenue_change: pct(c.revenue, p.revenue),
    roas_change: pct(cRoas, pRoas),
    orders_change: pct(c.orders, p.orders),
    current_spend: Math.round(c.spend * 100) / 100,
    previous_spend: Math.round(p.spend * 100) / 100,
    current_revenue: Math.round(c.revenue * 100) / 100,
    previous_revenue: Math.round(p.revenue * 100) / 100,
    current_orders: c.orders,
    previous_orders: p.orders,
    current_roas: Math.round(cRoas * 100) / 100,
    previous_roas: Math.round(pRoas * 100) / 100,
    is_spend_up: c.spend >= p.spend,
    is_revenue_up: c.revenue >= p.revenue,
    is_orders_up: c.orders >= p.orders,
    is_roas_up: cRoas >= pRoas,
  });
}
