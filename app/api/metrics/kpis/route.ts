export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { BUILTIN_KPI_KEYS } from '@/lib/metrics/catalog';

/** PUT /api/metrics/kpis { keys: string[] | null } — raporda gösterilecek metrikler; null = varsayılan */
export async function PUT(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const body = await req.json().catch(() => null);

  if (body?.keys === null) {
    await prisma.brand.update({ where: { id: ctx.brandId }, data: { reportKpis: null } });
    return NextResponse.json({ kpi_keys: null });
  }
  if (!Array.isArray(body?.keys) || body.keys.length === 0 || body.keys.length > 24) {
    return NextResponse.json({ error: '1 ile 24 arasında metrik seçin.' }, { status: 400 });
  }
  const defs = new Set((await prisma.metricDefinition.findMany({ where: { brandId: ctx.brandId }, select: { key: true } })).map((d) => d.key));
  const keys = [...new Set<string>(body.keys.map(String))].filter((k) => BUILTIN_KPI_KEYS.has(k) || defs.has(k));
  if (!keys.length) return NextResponse.json({ error: 'Geçerli metrik seçilmedi.' }, { status: 400 });
  await prisma.brand.update({ where: { id: ctx.brandId }, data: { reportKpis: JSON.stringify(keys) } });
  return NextResponse.json({ kpi_keys: keys });
}
