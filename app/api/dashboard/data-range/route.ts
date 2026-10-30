export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

/** Aktif markanın yüklü reklam verisinin ilk ve son tarihi (veri yoksa null). */
export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  try {
    const agg = await prisma.dailyMetric.aggregate({
      where: { brandId },
      _min: { date: true },
      _max: { date: true },
    });
    const iso = (d: Date | null) => (d ? d.toISOString().split('T')[0] : null);
    return NextResponse.json({ start: iso(agg._min.date), end: iso(agg._max.date) });
  } catch {
    return NextResponse.json({ start: null, end: null });
  }
}
