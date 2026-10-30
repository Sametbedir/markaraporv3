export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { METRIC_FORMATS } from '@/lib/metrics/catalog';
import { parseFormula } from '@/lib/metrics/formula';
import { allowedVariables } from '@/lib/metrics/server';

const FORMATS = new Set<string>(METRIC_FORMATS.map((f) => f.value));

/** PATCH /api/metrics/:key { label?, format?, formula? } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { key } = await params;
  const def = await prisma.metricDefinition.findUnique({ where: { brandId_key: { brandId: ctx.brandId, key } } });
  if (!def) return NextResponse.json({ error: 'Metrik bulunamadı' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { label?: string; format?: string; formula?: string } = {};
  if (body?.label !== undefined) {
    const label = String(body.label).trim().slice(0, 60);
    if (!label) return NextResponse.json({ error: 'Metrik adı gerekli.' }, { status: 400 });
    data.label = label;
  }
  if (body?.format !== undefined) {
    if (!FORMATS.has(String(body.format))) return NextResponse.json({ error: 'Geçersiz biçim.' }, { status: 400 });
    data.format = String(body.format);
  }
  if (body?.formula !== undefined) {
    if (def.kind !== 'formula') return NextResponse.json({ error: 'Dosyadan gelen metriğin formülü olmaz.' }, { status: 400 });
    const allowed = await allowedVariables(ctx.brandId);
    const parsed = parseFormula(String(body.formula), allowed);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    data.formula = String(body.formula).trim();
  }
  const updated = await prisma.metricDefinition.update({ where: { id: def.id }, data });
  return NextResponse.json({ key: updated.key, label: updated.label, kind: updated.kind, formula: updated.formula, format: updated.format });
}

/** DELETE /api/metrics/:key — yalnızca formül metrikleri silinir (dosyadan gelen değerler veri olarak kalır) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { key } = await params;
  const deleted = await prisma.metricDefinition.deleteMany({ where: { brandId: ctx.brandId, key, kind: 'formula' } });
  if (!deleted.count) return NextResponse.json({ error: 'Formül metriği bulunamadı' }, { status: 404 });
  return NextResponse.json({ message: 'Metrik silindi' });
}
