export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addDemoUpload, demoUploads } from '@/lib/demo-data';
import { prisma } from '@/lib/prisma';
import { AdRow } from '@/lib/import/ad-report';
import { ParsedFile, SUPPORTED_EXTENSIONS, parseUploadedFile } from '@/lib/import/file';
import { FIELD_LABELS } from '@/lib/import/headers';

const MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_PLATFORM = 'Genel';
const DEFAULT_CAMPAIGN = 'Yüklenen Veri';

/* ═══════════════════════════════════════════════════════════════
   DOSYA → TABLO
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   KULLANICIYA GÖSTERİLECEK RAPOR
═══════════════════════════════════════════════════════════════ */

function describeReport(parsed: ParsedFile) {
  const { report } = parsed;
  return {
    sheetName: parsed.sheetName,
    headerRow: report.headerRowNumber,
    currency: report.currency,
    decimalStyle: report.decimalStyle,
    mapping: Object.entries(report.mapping).map(([field, header]) => ({
      field,
      label: FIELD_LABELS[field as keyof typeof FIELD_LABELS],
      header,
    })),
    unmappedColumns: report.unmappedColumns,
    missingFields: report.missingFields.map((f) => FIELD_LABELS[f]),
    warnings: [
      ...parsed.extraWarnings.map((message) => ({ code: 'sheets', message, rows: [] as number[] })),
      ...report.warnings.map((w) => ({ ...w, rows: w.rows.slice(0, 20) })),
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════
   KAYIT
═══════════════════════════════════════════════════════════════ */

const ratio = (a: number | null, b: number | null, factor = 1) => (a !== null && b ? (a / b) * factor : undefined);

async function persist(userId: string, fileName: string, ext: string, fileHash: string, parsed: ParsedFile) {
  const { report } = parsed;
  const label = `Yüklenen ${ext.toUpperCase()}`;
  const platforms = [...new Set(report.rows.map((r) => r.platform ?? DEFAULT_PLATFORM))];

  return prisma.$transaction(
    async (tx) => {
      const log = await tx.uploadLog.create({
        data: {
          userId,
          fileName,
          fileType: ext.toUpperCase(),
          kind: 'ad_report',
          fileHash,
          currency: report.currency,
          importedRows: report.rows.length,
          dateStart: report.dateStart ? new Date(`${report.dateStart}T00:00:00.000Z`) : null,
          dateEnd: report.dateEnd ? new Date(`${report.dateEnd}T00:00:00.000Z`) : null,
          platforms: JSON.stringify(platforms),
          reportJson: JSON.stringify(describeReport(parsed)),
          status: 'success',
        },
      });

      // Kampanyaları (platform + ad) bul veya oluştur
      const campaignKey = (r: AdRow) => JSON.stringify([r.platform ?? DEFAULT_PLATFORM, r.campaign ?? DEFAULT_CAMPAIGN]);
      const campaignIds = new Map<string, string>();
      for (const key of new Set(report.rows.map(campaignKey))) {
        const [platform, name] = JSON.parse(key) as [string, string];
        const campaign =
          (await tx.campaign.findFirst({ where: { userId, name, platform } })) ??
          (await tx.campaign.create({ data: { userId, name, platform, source: 'upload', dataSourceLabel: label } }));
        campaignIds.set(key, campaign.id);
      }

      // Daha önce dosyayla yüklenmiş aynı kampanya-gün satırlarını yenileriyle değiştir (son yükleme geçerlidir)
      const datesByCampaign = new Map<string, Date[]>();
      for (const r of report.rows) {
        const id = campaignIds.get(campaignKey(r))!;
        const list = datesByCampaign.get(id) ?? [];
        list.push(new Date(`${r.date}T00:00:00.000Z`));
        datesByCampaign.set(id, list);
      }
      let replacedRows = 0;
      for (const [campaignId, dates] of datesByCampaign) {
        const deleted = await tx.dailyMetric.deleteMany({
          where: { userId, campaignId, source: 'upload', date: { in: dates } },
        });
        replacedRows += deleted.count;
      }

      const data = report.rows.map((r) => ({
        userId,
        campaignId: campaignIds.get(campaignKey(r))!,
        uploadId: log.id,
        date: new Date(`${r.date}T00:00:00.000Z`),
        platform: r.platform ?? DEFAULT_PLATFORM,
        spend: r.spend,
        revenue: r.conversionValue,
        conversions: r.conversions,
        impressions: r.impressions === null ? null : Math.round(r.impressions),
        clicks: r.clicks === null ? null : Math.round(r.clicks),
        reach: r.reach === null ? null : Math.round(r.reach),
        currency: report.currency,
        // Türetilmiş oranlar yalnızca iki girdi de varsa yazılır
        ctr: ratio(r.clicks, r.impressions, 100),
        cpc: ratio(r.spend, r.clicks),
        cpm: ratio(r.spend, r.impressions, 1000),
        roas: ratio(r.conversionValue, r.spend),
        source: 'upload',
        dataSourceLabel: label,
      }));
      for (let i = 0; i < data.length; i += 1000) {
        await tx.dailyMetric.createMany({ data: data.slice(i, i + 1000) });
      }

      return { replacedRows, platforms };
    },
    { maxWait: 10_000, timeout: 60_000 }
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN HANDLER
═══════════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file)
      return NextResponse.json({ error: 'Dosya bulunamadı. Lütfen bir dosya seçin.' }, { status: 400 });

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext))
      return NextResponse.json(
        { error: `".${ext}" formatı desteklenmiyor. Lütfen CSV, TSV, XLSX veya XLS dosyası yükleyin.` },
        { status: 400 }
      );

    if (file.size > MAX_BYTES)
      return NextResponse.json(
        { error: `Dosya boyutu ${(file.size / 1024 / 1024).toFixed(1)} MB — 10 MB sınırını aşıyor.` },
        { status: 400 }
      );

    if (file.size === 0)
      return NextResponse.json({ error: 'Dosya boş görünüyor.' }, { status: 400 });

    const buffer = await file.arrayBuffer();

    let parsed: ParsedFile;
    try {
      parsed = await parseUploadedFile(buffer, ext);
    } catch (ex: any) {
      return NextResponse.json(
        { error: `Dosya okunamadı: ${ex?.message ?? 'Format hatası'}.` },
        { status: 400 }
      );
    }

    if (!parsed.report.ok)
      return NextResponse.json(
        { error: parsed.report.errors.join(' '), report: describeReport(parsed) },
        { status: 400 }
      );

    const { report } = parsed;
    const userId = session.user.id;
    const isDemo = userId === 'admin-demo-user';
    let replacedRows = 0;
    let platforms = [...new Set(report.rows.map((r) => r.platform ?? DEFAULT_PLATFORM))];

    const fileHash = createHash('sha256').update(Buffer.from(buffer)).digest('hex');
    const duplicateError = (fileName: string, createdAt: Date) =>
      NextResponse.json(
        {
          error: `Bu dosya ${createdAt.toLocaleDateString('tr-TR')} tarihinde "${fileName}" adıyla zaten yüklendi. ` +
            `Veriyi yenilemek istiyorsanız önce yükleme geçmişinden eski kaydı silin.`,
        },
        { status: 409 }
      );

    if (isDemo) {
      // Demo modu bellekte çalışır; eksik değerler yalnızca burada 0 olarak tutulur ve mağaza siparişi üretilmez.
      const previous = demoUploads.find((u) => u.fileHash === fileHash);
      if (previous) return duplicateError(previous.fileName, new Date(previous.createdAt));
      addDemoUpload(
        {
          fileName: file.name,
          fileType: ext.toUpperCase(),
          kind: 'ad_report',
          fileHash,
          importedRows: report.rows.length,
          dateStart: report.dateStart,
          dateEnd: report.dateEnd,
          platforms: JSON.stringify(platforms),
        },
        report.rows.map((r) => ({
          date: r.date,
          platform: r.platform ?? DEFAULT_PLATFORM,
          campaign: r.campaign ?? DEFAULT_CAMPAIGN,
          spend: r.spend ?? 0,
          revenue: r.conversionValue ?? 0,
          orders: 0,
          impressions: r.impressions ?? 0,
          clicks: r.clicks ?? 0,
          conversions: r.conversions ?? 0,
        }))
      );
    } else {
      const previous = await prisma.uploadLog.findFirst({
        where: { userId, fileHash, status: 'success' },
        orderBy: { createdAt: 'desc' },
      });
      if (previous) return duplicateError(previous.fileName, previous.createdAt);

      const saved = await persist(userId, file.name, ext, fileHash, parsed);
      replacedRows = saved.replacedRows;
      platforms = saved.platforms;
    }

    const replacedNote = replacedRows ? ` Daha önce yüklenmiş ${replacedRows} kampanya-gün satırı yenileriyle değiştirildi.` : '';
    return NextResponse.json({
      success: true,
      message: `"${file.name}" işlendi: ${report.rows.length} kampanya-gün satırı aktarıldı.${replacedNote}`,
      filename: file.name,
      size: file.size,
      importedRows: report.rows.length,
      replacedRows,
      storage: isDemo ? 'demo-memory' : 'database',
      dateStart: report.dateStart,
      dateEnd: report.dateEnd,
      platforms,
      report: describeReport(parsed),
    });
  } catch (e: any) {
    console.error('[upload] error:', e);
    return NextResponse.json(
      { error: `Sunucu hatası: ${e?.message ?? 'Bilinmeyen hata'}. Lütfen tekrar deneyin.` },
      { status: 500 }
    );
  }
}
