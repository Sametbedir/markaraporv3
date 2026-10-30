export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

const allowedPeriods = new Set(['weekly', 'monthly', 'quarterly']);
const allowedTypes = new Set(['revenue', 'spend', 'roas', 'orders', 'profit']);

export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  const goals = await prisma.goal.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const body = await req.json().catch(() => ({}));
  const periodType = String(body.periodType ?? '');
  const targetType = String(body.targetType ?? '');
  const targetValue = Number(body.targetValue);
  const startDate = String(body.startDate ?? '');
  const endDate = String(body.endDate ?? '');

  if (!allowedPeriods.has(periodType) || !allowedTypes.has(targetType) || !Number.isFinite(targetValue) || targetValue <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: 'Geçerli hedef bilgileri gereklidir' }, { status: 400 });
  }

  const goal = await prisma.goal.create({ data: { userId: ctx.userId, brandId: ctx.brandId, periodType, targetType, targetValue, startDate: new Date(`${startDate}T00:00:00.000Z`), endDate: new Date(`${endDate}T00:00:00.000Z`) } });
  return NextResponse.json(goal, { status: 201 });
}