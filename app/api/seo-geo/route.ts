export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateSeoGeoReport, SeoGeoRequest } from '@/lib/seo-geo';

export async function POST(req: NextRequest) {
  // AI kotası harcayan bir uç nokta; yalnızca giriş yapmış kullanıcılar kullanabilir
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SeoGeoRequest;

    if (!body || !body.niche || !body.location) {
      return NextResponse.json(
        { error: 'Sektör/ürün grubu ve hedef bölge/lokasyon alanları zorunludur.' },
        { status: 400 }
      );
    }

    const report = await generateSeoGeoReport(body);
    if (!report) {
      return NextResponse.json(
        { error: 'SEO & GEO raporu yapay zekâ servisi gerektirir. GEMINI_API_KEY tanımlı değil veya servis şu an yanıt vermiyor. Hazır şablonla uydurma rapor üretilmez.' },
        { status: 503 }
      );
    }

    let savedId: string | null = null;
    try {
      if (session.user.id !== 'admin-demo-user') {
        const saved = await prisma.manualEntry.create({
          data: {
            userId: session.user.id,
            entryType: 'seo_geo_report',
            entryCategory: body.platform || 'ikas',
            dataJson: JSON.stringify(report),
            fileName: `${body.niche} - ${body.location}`,
            fileType: 'seo_geo_json',
            status: 'completed',
          },
        });
        savedId = saved.id;
      }
    } catch (dbErr) {
      console.warn('Rapor veritabanına kaydedilirken atlandı:', dbErr);
    }

    return NextResponse.json({
      success: true,
      report,
      savedId,
    });
  } catch (error: any) {
    console.error('SEO & GEO Analiz Hatası:', error);
    return NextResponse.json(
      { error: error?.message || 'SEO & GEO raporu oluşturulurken bir hata meydana geldi.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ reports: [] });
    }

    const entries = await prisma.manualEntry.findMany({
      where: {
        userId: session.user.id,
        entryType: 'seo_geo_report',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const reports = entries
      .map((entry) => {
        try {
          return {
            dbId: entry.id,
            createdAt: entry.createdAt,
            data: JSON.parse(entry.dataJson || '{}'),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Kayıtlı raporlar getirilirken hata:', error);
    return NextResponse.json({ reports: [] });
  }
}
