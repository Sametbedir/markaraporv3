export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';

/** DELETE /api/share-links/:id — linki iptal eder; kayıt görüntülenme geçmişi için saklanır */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const updated = await prisma.shareLink.updateMany({
    where: { id, brandId: ctx.brandId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!updated.count) return NextResponse.json({ error: 'Link bulunamadı veya zaten iptal edilmiş' }, { status: 404 });
  return NextResponse.json({ message: 'Link iptal edildi' });
}
