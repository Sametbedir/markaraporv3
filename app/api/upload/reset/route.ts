export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest) {
  return handleReset();
}

export async function DELETE(_req: NextRequest) {
  return handleReset();
}

async function handleReset() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  // Yalnızca dosya yüklemesi ve manuel girişle gelen veriler silinir; iKas/Ticimax gibi API kaynakları korunur.
  const fileSources = { in: ['upload', 'manual'] };

  try {
    await prisma.$transaction([
      prisma.dailyMetric.deleteMany({ where: { brandId, source: fileSources } }),
      prisma.order.deleteMany({ where: { brandId, source: fileSources } }),
      prisma.campaign.deleteMany({ where: { brandId, source: fileSources, dailyMetrics: { none: {} } } }),
      prisma.uploadLog.deleteMany({ where: { brandId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: `${ctx.brand.name}: dosyayla ve manuel olarak yüklenen tüm veriler sıfırlandı. API entegrasyonlarından gelen siparişler korundu.`,
    });
  } catch (error: any) {
    console.error('Veri sıfırlanırken hata:', error);
    return NextResponse.json(
      { error: error?.message || 'Veriler sıfırlanırken hata oluştu.' },
      { status: 500 }
    );
  }
}
