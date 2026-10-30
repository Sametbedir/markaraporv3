export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;
  const { id } = await params;

  const deleted = await prisma.goal.deleteMany({ where: { id, brandId } });
  if (!deleted.count) return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
  return NextResponse.json({ message: 'Hedef silindi' });
}