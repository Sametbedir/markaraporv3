export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateCompetitorReport, CompetitorAnalysisRequest } from '@/lib/competitor-analysis';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CompetitorAnalysisRequest;

    if (!body || !body.ownBrandName || !body.competitorBrandName) {
      return NextResponse.json(
        { error: 'Kendi marka adınız ve rakip marka adı alanları zorunludur.' },
        { status: 400 }
      );
    }

    const report = await generateCompetitorReport(body);

    let savedId: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) {
        const saved = await prisma.manualEntry.create({
          data: {
            userId: session.user.id,
            entryType: 'competitor_report',
            entryCategory: body.niche || 'e-ticaret',
            dataJson: JSON.stringify(report),
            fileName: `${body.ownBrandName} vs ${body.competitorBrandName}`,
            fileType: 'competitor_json',
            status: 'completed',
          },
        });
        savedId = saved.id;
      }
    } catch (dbErr) {
      console.warn('Rakip analiz raporu DB kaydı atlandı:', dbErr);
    }

    return NextResponse.json({
      success: true,
      report,
      savedId,
    });
  } catch (error: any) {
    console.error('Rakip Analiz API Hatası:', error);
    return NextResponse.json(
      { error: error?.message || 'Rakip analizi oluşturulurken bir hata meydana geldi.' },
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
        entryType: 'competitor_report',
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
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
    console.error('Kayıtlı rakip raporları getirilirken hata:', error);
    return NextResponse.json({ reports: [] });
  }
}
