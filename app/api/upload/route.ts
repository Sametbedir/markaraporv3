export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { AdRow } from '@/lib/import/ad-report';
import { ParsedFile, SUPPORTED_EXTENSIONS, parseUploadedFile } from '@/lib/import/file';
import { type ColumnRole, mappingFromRoles, templateFromColumns } from '@/lib/import/preview';
import type { ColumnMapping } from '@/lib/import/ad-report';
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
    mapping: [
      ...Object.entries(report.mapping).map(([field, header]) => ({
        field,
        label: FIELD_LABELS[field as keyof typeof FIELD_LABELS],
        header,
      })),
      ...report.customColumns.map((c) => ({ field: `custom:${c.key}`, label: `Özel metrik: ${c.label}`, header: c.header })),
    ],
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

async function persist(userId: string, brandId: string, fileName: string, ext: string, fileHash: string, parsed: ParsedFile) {
  const { report } = parsed;
  const label = `Yüklenen ${ext.toUpperCase()}`;
  const platforms = [...new Set(report.rows.map((r) => r.platform ?? DEFAULT_PLATFORM))];

  return prisma.$transaction(
    async (tx) => {
      const log = await tx.uploadLog.create({
        data: {
          userId,
          brandId,
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
          (await tx.campaign.findFirst({ where: { brandId, name, platform } })) ??
          (await tx.campaign.create({ data: { userId, brandId, name, platform, source: 'upload', dataSourceLabel: label } }));
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
          where: { brandId, campaignId, source: 'upload', date: { in: dates } },
        });
        replacedRows += deleted.count;
        await tx.customMetricValue.deleteMany({ where: { brandId, campaignId, date: { in: dates } } });
      }

      const data = report.rows.map((r) => ({
        userId,
        brandId,
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

      // Markaya özel metrikler: boş hücreler kaydedilmez (eksik ≠ 0)
      const customData = report.rows.flatMap((r) =>
        Object.entries(r.custom).flatMap(([key, value]) =>
          value === null
            ? []
            : [{
                brandId,
                uploadId: log.id,
                campaignId: campaignIds.get(campaignKey(r))!,
                date: new Date(`${r.date}T00:00:00.000Z`),
                platform: r.platform ?? DEFAULT_PLATFORM,
                key,
                value,
              }]
        )
      );
      for (let i = 0; i < customData.length; i += 1000) {
        await tx.customMetricValue.createMany({ data: customData.slice(i, i + 1000) });
      }
      // Yeni özel metrik tanımı oluştur; var olanın adı/biçimi kullanıcının ayarıdır, değiştirilmez
      for (const c of report.customColumns) {
        await tx.metricDefinition.upsert({
          where: { brandId_key: { brandId, key: c.key } },
          create: { brandId, key: c.key, label: c.label, kind: 'custom' },
          update: {},
        });
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
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { userId, brandId } = ctx;

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

    // Önizleme ekranında onaylanan eşleme (yoksa başlıklar otomatik eşlenir)
    let mapping: ColumnMapping | undefined;
    let template: { signature: string; entries: ReturnType<typeof templateFromColumns> } | null = null;
    const rawMapping = formData.get('mapping');
    if (typeof rawMapping === 'string' && rawMapping) {
      let body: { headerRowIndex: number; sheetName: string | null; signature: string; columns: { index: number; key: string; role: ColumnRole }[] };
      try {
        body = JSON.parse(rawMapping);
      } catch {
        return NextResponse.json({ error: 'Sütun eşlemesi okunamadı.' }, { status: 400 });
      }
      if (!Array.isArray(body?.columns) || !Number.isInteger(body.headerRowIndex) || body.columns.length > 300) {
        return NextResponse.json({ error: 'Sütun eşlemesi geçersiz.' }, { status: 400 });
      }
      const built = mappingFromRoles(body.headerRowIndex, body.columns);
      if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });
      mapping = built;
      if (typeof body.signature === 'string' && /^[0-9a-f]{64}$/.test(body.signature)) {
        template = { signature: body.signature, entries: templateFromColumns(body.columns) };
      }
      formData.set('sheet', body.sheetName ?? '');
    }

    let parsed: ParsedFile;
    try {
      const sheet = formData.get('sheet');
      parsed = await parseUploadedFile(buffer, ext, { mapping, sheetName: typeof sheet === 'string' && sheet ? sheet : null });
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

    const fileHash = createHash('sha256').update(Buffer.from(buffer)).digest('hex');
    const duplicateError = (fileName: string, createdAt: Date) =>
      NextResponse.json(
        {
          error: `Bu dosya ${createdAt.toLocaleDateString('tr-TR')} tarihinde "${fileName}" adıyla zaten yüklendi. ` +
            `Veriyi yenilemek istiyorsanız önce yükleme geçmişinden eski kaydı silin.`,
        },
        { status: 409 }
      );

    // Aynı dosya aynı markaya ikinci kez yüklenemez; başka bir markaya yüklenebilir
    const previous = await prisma.uploadLog.findFirst({
      where: { brandId, fileHash, status: 'success' },
      orderBy: { createdAt: 'desc' },
    });
    if (previous) return duplicateError(previous.fileName, previous.createdAt);

    const { replacedRows, platforms } = await persist(userId, brandId, file.name, ext, fileHash, parsed);

    // Başarılı eşleme bu başlık yapısı için hatırlanır; aynı biçimdeki sonraki dosyada otomatik uygulanır
    if (template) {
      await prisma.importTemplate.upsert({
        where: { brandId_signature: { brandId, signature: template.signature } },
        create: { brandId, signature: template.signature, mappingJson: JSON.stringify(template.entries) },
        update: { mappingJson: JSON.stringify(template.entries) },
      });
    }
    const replacedNote = replacedRows ? ` Daha önce yüklenmiş ${replacedRows} kampanya-gün satırı yenileriyle değiştirildi.` : '';
    return NextResponse.json({
      success: true,
      message: `"${file.name}" ${ctx.brand.name} markasına işlendi: ${report.rows.length} kampanya-gün satırı aktarıldı.${replacedNote}`,
      filename: file.name,
      size: file.size,
      importedRows: report.rows.length,
      replacedRows,
      brand: ctx.brand.name,
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
