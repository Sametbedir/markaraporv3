export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { BUILTIN_KPIS, FORMULA_VARIABLES, METRIC_FORMATS, parseKpiKeys } from '@/lib/metrics/catalog';
import { allowedVariables } from '@/lib/metrics/server';
import { parseFormula } from '@/lib/metrics/formula';
import { normalizeHeader } from '@/lib/import/headers';

const FORMATS = new Set(METRIC_FORMATS.map((f) => f.value));

/** GET /api/metrics — aktif markanın metrik tanımları ve rapor KPI seçimi */
export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const definitions = await prisma.metricDefinition.findMany({ where: { brandId: ctx.brandId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({
    brand: ctx.brand.name,
    builtin: BUILTIN_KPIS,
    variables: FORMULA_VARIABLES,
    kpi_keys: parseKpiKeys(ctx.brand.reportKpis),
    definitions: definitions.map((d) => ({ key: d.key, label: d.label, kind: d.kind, formula: d.formula, format: d.format })),
  });
}

/** POST /api/metrics { label, formula, format } — formül metriği ekler */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const body = await req.json().catch(() => null);
  const label = String(body?.label ?? '').trim().slice(0, 60);
  const format = String(body?.format ?? 'number');
  if (!label) return NextResponse.json({ error: 'Metrik adı gerekli.' }, { status: 400 });
  if (!FORMATS.has(format as never)) return NextResponse.json({ error: 'Geçersiz biçim.' }, { status: 400 });

  const parsed = parseFormula(String(body?.formula ?? ''), await allowedVariables(ctx.brandId));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const base = `f_${normalizeHeader(label).key.slice(0, 30) || 'metrik'}`;
  let key = base;
  for (let i = 2; await prisma.metricDefinition.findUnique({ where: { brandId_key: { brandId: ctx.brandId, key } } }); i++) key = `${base}${i}`;

  const def = await prisma.metricDefinition.create({
    data: { brandId: ctx.brandId, key, label, kind: 'formula', formula: String(body.formula).trim(), format },
  });
  return NextResponse.json({ key: def.key, label: def.label, kind: def.kind, formula: def.formula, format: def.format }, { status: 201 });
}
