export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/* GET /api/upload/logs  — yükleme geçmişini listele */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  try {
    const logs = await (prisma as any).uploadLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(logs);
  } catch {
    // UploadLog tablosu henüz migrate edilmemişse boş liste döndür
    return NextResponse.json([]);
  }
}

/* DELETE /api/upload/logs?id=xxx  — tek log kaydını ve ilişkili verileri sil */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id)
    return NextResponse.json({ error: 'id parametresi gerekli' }, { status: 400 });

  try {
    const log = await (prisma as any).uploadLog.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!log)
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 });

    // Tarih aralığına göre bu dosyaya ait dailyMetric'leri sil
    if (log.dateStart && log.dateEnd) {
      await prisma.dailyMetric.deleteMany({
        where: {
          userId: session.user.id,
          source: 'upload',
          date: {
            gte: new Date(log.dateStart),
            lte: new Date(log.dateEnd),
          },
        },
      });
      await prisma.order.deleteMany({
        where: {
          userId: session.user.id,
          source: 'upload',
          orderDate: {
            gte: new Date(log.dateStart),
            lte: new Date(log.dateEnd),
          },
        },
      });
    }

    await (prisma as any).uploadLog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Yükleme verisi silindi.' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Silme hatası' }, { status: 500 });
  }
}
