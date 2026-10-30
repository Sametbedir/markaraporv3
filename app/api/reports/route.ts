export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { availableMonths } from '@/lib/report/brand-report';

/** GET /api/reports — aktif markanın verisi olan ayları ve her ayın rapor durumu */
export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const [months, snapshots] = await Promise.all([
    availableMonths(ctx.brandId),
    prisma.reportSnapshot.findMany({
      where: { brandId: ctx.brandId },
      select: { month: true, publishedAt: true, updatedAt: true, summary: true, actions: true },
    }),
  ]);
  const byMonth = new Map(snapshots.map((s) => [s.month, s]));
  // Verisi silinmiş ama yayınlanmış ay da listede kalır
  const all = [...new Set([...months, ...snapshots.map((s) => s.month)])].sort().reverse();
  return NextResponse.json({
    brand: ctx.brand.name,
    months: all.map((month) => {
      const s = byMonth.get(month);
      return {
        month,
        has_data: months.includes(month),
        published_at: s?.publishedAt?.toISOString() ?? null,
        has_notes: !!(s?.summary.trim() || s?.actions.trim()),
      };
    }),
  });
}
