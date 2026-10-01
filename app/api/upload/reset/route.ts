export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

  try {
    await prisma.dailyMetric.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.campaign.deleteMany({ where: { userId, source: 'upload' } });
    try {
      await (prisma as any).uploadLog.deleteMany({ where: { userId } });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Tüm yüklenmiş reklam, satış ve sipariş verileri başarıyla sıfırlandı.',
    });
  } catch (error: any) {
    console.error('Veri sıfırlanırken hata:', error);
    return NextResponse.json(
      { error: error?.message || 'Veriler sıfırlanırken hata oluştu.' },
      { status: 500 }
    );
  }
}
