export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

/* GET /api/upload/logs  — yükleme geçmişini listele */
export async function GET(_req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  try {
    const logs = await prisma.uploadLog.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch {
    // UploadLog tablosu henüz migrate edilmemişse boş liste döndür
    return NextResponse.json([]);
  }
}

/* DELETE /api/upload/logs?id=xxx  — tek yüklemeyi ve YALNIZCA o yüklemeye ait satırları sil */
export async function DELETE(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  const id = new URL(req.url).searchParams.get('id');
  if (!id)
    return NextResponse.json({ error: 'id parametresi gerekli' }, { status: 400 });

  try {
    const log = await prisma.uploadLog.findFirst({ where: { id, brandId } });
    if (!log)
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 });

    // Silme tarih aralığına göre değil yükleme kimliğine göre yapılır; böylece aynı tarihlere
    // ait başka yüklemeler ve API'den gelen veriler etkilenmez.
    const [metrics, orders] = await prisma.$transaction([
      prisma.dailyMetric.deleteMany({ where: { brandId, uploadId: id } }),
      prisma.order.deleteMany({ where: { brandId, uploadId: id } }),
      prisma.uploadLog.delete({ where: { id } }),
    ]);

    const legacy = metrics.count === 0 && orders.count === 0 && !log.fileHash;
    return NextResponse.json({
      success: true,
      deletedMetrics: metrics.count,
      deletedOrders: orders.count,
      message: legacy
        ? 'Kayıt silindi. Bu eski yüklemenin satırları kayda bağlı olmadığı için verileri silinmedi; tamamen temizlemek için "Tüm verileri sıfırla" kullanın.'
        : `Yükleme silindi: ${metrics.count} metrik satırı${orders.count ? ` ve ${orders.count} sipariş` : ''} kaldırıldı.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Silme hatası' }, { status: 500 });
  }
}
