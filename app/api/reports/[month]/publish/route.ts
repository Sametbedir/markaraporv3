export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { isMonth } from '@/lib/report/months';
import { serializeSnapshot } from '@/lib/report/document';
import { liveDocument } from '@/lib/report/document-server';

/**
 * POST /api/reports/:month/publish — raporu o anki verilerle dondurur; müşteri linkinde bu hali görünür.
 * Tekrar yayınlamak eski yayının yerine geçer.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { month } = await params;
  if (!isMonth(month)) return NextResponse.json({ error: 'Geçersiz ay' }, { status: 400 });

  const existing = await prisma.reportSnapshot.findUnique({ where: { brandId_month: { brandId: ctx.brandId, month } } });
  const doc = await liveDocument(ctx.brand, ctx.userId, month, existing);
  if (!doc.report.current) {
    return NextResponse.json({ error: 'Bu ay için veri yok; boş rapor yayınlanamaz.' }, { status: 400 });
  }
  const publishedAt = new Date();
  const dataJson = serializeSnapshot({ ...doc, publishedAt: publishedAt.toISOString() });
  await prisma.reportSnapshot.upsert({
    where: { brandId_month: { brandId: ctx.brandId, month } },
    create: { brandId: ctx.brandId, userId: ctx.userId, month, dataJson, publishedAt },
    update: { dataJson, publishedAt },
  });
  return NextResponse.json({ published_at: publishedAt.toISOString() });
}

/** DELETE /api/reports/:month/publish — yayından kaldırır (notlar kalır) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { month } = await params;
  if (!isMonth(month)) return NextResponse.json({ error: 'Geçersiz ay' }, { status: 400 });
  const updated = await prisma.reportSnapshot.updateMany({
    where: { brandId: ctx.brandId, month, publishedAt: { not: null } },
    data: { publishedAt: null, dataJson: null },
  });
  if (!updated.count) return NextResponse.json({ error: 'Yayınlanmış rapor yok' }, { status: 404 });
  return NextResponse.json({ message: 'Rapor yayından kaldırıldı' });
}
