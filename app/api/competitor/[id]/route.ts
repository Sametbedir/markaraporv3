export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireBrand();
    if (ctx instanceof NextResponse) return ctx;

    const { id } = await context.params;

    await prisma.manualEntry.deleteMany({
      where: {
        id,
        brandId: ctx.brandId,
        entryType: 'competitor_report',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Silme hatası' }, { status: 500 });
  }
}
