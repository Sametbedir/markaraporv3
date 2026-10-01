export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addDemoMetrics } from '@/lib/demo-data';
import { prisma } from '@/lib/prisma';
import { parseRawCsv, parseAnyTableData, UniversalParseResult } from '@/lib/universal-parser';

/* ─── Excel Okuyucu (XLSX / XLS) ─── */
async function readExcelAsGrid(buffer: ArrayBuffer): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const allRows: string[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // sheet_to_json header: 1 -> string[][] döner
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'YYYY-MM-DD',
    });
    if (!grid.length) continue;
    grid.forEach((row) => {
      allRows.push(row.map((cell) => String(cell ?? '').trim()));
    });
  }
  return allRows;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim. Lütfen oturum açın.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Lütfen bir dosya seçin.' }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const isCsv = ext === 'csv' || ext === 'tsv' || ext === 'txt';

    if (!isExcel && !isCsv) {
      return NextResponse.json(
        { error: `".${ext}" uzantısı desteklenmiyor. Lütfen CSV veya Excel (XLSX, XLS) dosyası yükleyin.` },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: `Dosya boyutu ${(file.size / 1024 / 1024).toFixed(1)} MB. 25 MB sınırını aşıyor.` },
        { status: 400 }
      );
    }

    let parsedResult: UniversalParseResult;

    /* ─── 1. Excel veya CSV Ayrıştırma ─── */
    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const grid = await readExcelAsGrid(buffer);
        parsedResult = parseAnyTableData(grid, file.name);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Excel dosyası okunamadı: ${err?.message || 'Geçersiz format'}. Dosyanın içeriğini kontrol edin.` },
          { status: 400 }
        );
      }
    } else {
      let rawText = '';
      try {
        rawText = await file.text();
      } catch {
        return NextResponse.json(
          { error: 'CSV dosyası okunamadı. UTF-8 kodlamasında kaydedildiğinden emin olun.' },
          { status: 400 }
        );
      }
      try {
        const grid = parseRawCsv(rawText);
        parsedResult = parseAnyTableData(grid, file.name);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Dosya içeriği ayrıştırılamadı: ${err?.message || 'Sütunlar tanınamadı'}` },
          { status: 400 }
        );
      }
    }

    const {
      rows,
      dateStart,
      dateEnd,
      totalSpend,
      totalRevenue,
      totalOrders,
      platforms,
      detectedType,
    } = parsedResult;

    const userId = session.user.id;
    const isDemo = userId === 'admin-demo-user';

    /* ─── 2. Veritabanına Hızlı Batch Kayıt ─── */
    if (isDemo) {
      addDemoMetrics(rows);
    } else {
      // A. Eşsiz Kampanyaları Çözümle
      const uniqueCampaignKeys = [...new Set(rows.map((p) => `${p.platform}:::${p.campaign}`))];
      const campaignMap = new Map<string, string>();

      const existingCampaigns = await prisma.campaign.findMany({
        where: { userId },
        select: { id: true, name: true, platform: true },
      });
      existingCampaigns.forEach((c) => {
        campaignMap.set(`${c.platform}:::${c.name}`, c.id);
      });

      for (const key of uniqueCampaignKeys) {
        if (!campaignMap.has(key)) {
          const [platform, name] = key.split(':::');
          const created = await prisma.campaign.create({
            data: {
              userId,
              name,
              platform,
              source: 'upload',
              dataSourceLabel: `Yüklenen ${ext.toUpperCase()}`,
            },
          });
          campaignMap.set(key, created.id);
        }
      }

      // B. DailyMetric Kayıtlarını Toplu Oluştur
      const dailyMetricRecords = rows.map((m) => {
        const campaignId = campaignMap.get(`${m.platform}:::${m.campaign}`) || null;
        const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
        const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
        const roas = m.roas ?? (m.spend > 0 ? m.revenue / m.spend : 0);

        return {
          userId,
          campaignId,
          date: new Date(`${m.date}T00:00:00.000Z`),
          platform: m.platform,
          spend: m.spend,
          revenue: m.revenue,
          impressions: m.impressions,
          clicks: m.clicks,
          conversions: m.orders || m.conversions,
          ctr: Math.round(ctr * 100) / 100,
          cpc: Math.round(cpc * 100) / 100,
          roas: Math.round(roas * 100) / 100,
          source: 'upload',
          dataSourceLabel: `Yüklenen ${ext.toUpperCase()}`,
        };
      });

      await prisma.dailyMetric.createMany({
        data: dailyMetricRecords,
      });

      // C. Order Kayıtlarını Toplu Oluştur
      const orderRecords = rows
        .filter((m) => m.orders > 0 || m.revenue > 0)
        .map((m, idx) => ({
          userId,
          orderNumber: `${ext.toUpperCase()}-${m.date.replace(/-/g, '')}-${idx + 1}`,
          totalPrice: m.revenue,
          channel: m.platform,
          source: 'upload',
          status: 'confirmed',
          itemCount: Math.max(1, Math.round(m.orders)),
          orderDate: new Date(`${m.date}T12:00:00.000Z`),
        }));

      if (orderRecords.length > 0) {
        await prisma.order.createMany({
          data: orderRecords,
        });
      }

      // D. UploadLog Kaydı (Güvenli)
      try {
        await (prisma as any).uploadLog.create({
          data: {
            userId,
            fileName: file.name,
            fileType: ext.toUpperCase(),
            importedRows: rows.length,
            dateStart: new Date(`${dateStart}T00:00:00.000Z`),
            dateEnd: new Date(`${dateEnd}T00:00:00.000Z`),
            platforms: JSON.stringify(platforms),
            status: 'success',
          },
        });
      } catch {
        // Migration tablosu yoksa hata vermez
      }
    }

    return NextResponse.json({
      success: true,
      message: `"${file.name}" başarıyla analiz edildi ve aktarıldı! (${rows.length} veri noktası, ₺${Math.round(totalRevenue).toLocaleString('tr-TR')} Ciro, ${Math.round(totalOrders).toLocaleString('tr-TR')} Sipariş)`,
      filename: file.name,
      importedRows: rows.length,
      totalOrders: Math.round(totalOrders),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSpend: Math.round(totalSpend * 100) / 100,
      dateStart,
      dateEnd,
      platforms,
      detectedType,
    });
  } catch (err: any) {
    console.error('Upload Error:', err);
    return NextResponse.json(
      {
        error: `Yükleme hatası: ${err?.message || 'Bilinmeyen sistem hatası'}. Dosyanın içeriğini kontrol edip tekrar deneyin.`,
      },
      { status: 500 }
    );
  }
}
