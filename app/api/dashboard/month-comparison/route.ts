export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';

async function periodMetrics(userId: string, start: Date, end: Date) {
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  if (session.user.id === 'admin-demo-user') {
    return NextResponse.json({
      current_month: '', previous_month: '', spend_change: 0, revenue_change: 0,
      roas_change: 0, orders_change: 0, current_spend: 0, previous_spend: 0,
      current_revenue: 0, previous_revenue: 0, current_orders: 0,
      previous_orders: 0, current_roas: 0, previous_roas: 0,
      is_spend_up: false, is_revenue_up: false, is_orders_up: false, is_roas_up: false,
    });
  }

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonthEnd = new Date(currentMonthStart.getTime() - 86400000);
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);

  const c = await periodMetrics(session.user.id, currentMonthStart, today);
  const p = await periodMetrics(session.user.id, prevMonthStart, prevMonthEnd);

  const cRoas = c.spend > 0 ? c.revenue / c.spend : 0;
  const pRoas = p.spend > 0 ? p.revenue / p.spend : 0;

  const pct = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0;

  return NextResponse.json({
    current_month: currentMonthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
    previous_month: prevMonthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
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
