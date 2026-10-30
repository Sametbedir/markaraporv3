export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { isMonth } from '@/lib/report/months';
import { liveDocument, publishedDocument } from '@/lib/report/document-server';

const MAX_TEXT = 5000;

/** GET /api/reports/:month — güncel taslak belge ve varsa yayınlanmış hali */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { month } = await params;
  if (!isMonth(month)) return NextResponse.json({ error: 'Geçersiz ay' }, { status: 400 });

  const snapshot = await prisma.reportSnapshot.findUnique({ where: { brandId_month: { brandId: ctx.brandId, month } } });
  return NextResponse.json({
    draft: await liveDocument(ctx.brand, ctx.userId, month, snapshot),
    published: publishedDocument(snapshot),
  });
}

/** PUT /api/reports/:month { summary, actions } — değerlendirme ve aksiyon planı taslağını kaydeder */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { month } = await params;
  if (!isMonth(month)) return NextResponse.json({ error: 'Geçersiz ay' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const summary = String(body?.summary ?? '');
  const actions = String(body?.actions ?? '');
  if (summary.length > MAX_TEXT || actions.length > MAX_TEXT) {
    return NextResponse.json({ error: `Metinler en fazla ${MAX_TEXT} karakter olabilir.` }, { status: 400 });
  }
  await prisma.reportSnapshot.upsert({
    where: { brandId_month: { brandId: ctx.brandId, month } },
    create: { brandId: ctx.brandId, userId: ctx.userId, month, summary, actions },
    update: { summary, actions },
  });
  return NextResponse.json({ saved_at: new Date().toISOString() });
}
