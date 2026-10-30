export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resetDemoData } from '@/lib/demo-data';

export async function POST(_req: NextRequest) {
  return handleReset();
}

export async function DELETE(_req: NextRequest) {
  return handleReset();
}

async function handleReset() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const userId = session.user.id;

  if (userId === 'admin-demo-user') {
    resetDemoData();
    return NextResponse.json({ success: true, message: 'Demo verileri sıfırlandı.' });
  }

  // Yalnızca dosya yüklemesi ve manuel girişle gelen veriler silinir; iKas/Ticimax gibi API kaynakları korunur.
  const fileSources = { in: ['upload', 'manual'] };

  try {
    await prisma.$transaction([
      prisma.dailyMetric.deleteMany({ where: { userId, source: fileSources } }),
      prisma.order.deleteMany({ where: { userId, source: fileSources } }),
      prisma.campaign.deleteMany({ where: { userId, source: fileSources, dailyMetrics: { none: {} } } }),
      prisma.uploadLog.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Dosyayla ve manuel olarak yüklenen tüm veriler sıfırlandı. API entegrasyonlarından gelen siparişler korundu.',
    });
  } catch (error: any) {
    console.error('Veri sıfırlanırken hata:', error);
    return NextResponse.json(
      { error: error?.message || 'Veriler sıfırlanırken hata oluştu.' },
      { status: 500 }
    );
  }
}
