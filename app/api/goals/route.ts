export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoGoals } from '@/lib/demo-data';

const allowedPeriods = new Set(['weekly', 'monthly', 'quarterly']);
const allowedTypes = new Set(['revenue', 'spend', 'roas', 'orders', 'profit']);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  if (session.user.id === 'admin-demo-user') return NextResponse.json(demoGoals);

  const goals = await prisma.goal.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const periodType = String(body.periodType ?? '');
  const targetType = String(body.targetType ?? '');
  const targetValue = Number(body.targetValue);
  const startDate = String(body.startDate ?? '');
  const endDate = String(body.endDate ?? '');

  if (!allowedPeriods.has(periodType) || !allowedTypes.has(targetType) || !Number.isFinite(targetValue) || targetValue <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: 'Geçerli hedef bilgileri gereklidir' }, { status: 400 });
  }

  if (session.user.id === 'admin-demo-user') {
    const goal = { id: crypto.randomUUID(), userId: session.user.id, periodType, targetType, targetValue, startDate, endDate, isActive: true, createdAt: new Date().toISOString() };
    demoGoals.unshift(goal);
    return NextResponse.json(goal, { status: 201 });
  }

  const goal = await prisma.goal.create({ data: { userId: session.user.id, periodType, targetType, targetValue, startDate: new Date(`${startDate}T00:00:00.000Z`), endDate: new Date(`${endDate}T00:00:00.000Z`) } });
  return NextResponse.json(goal, { status: 201 });
}