export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { validateManualEntry } from '@/lib/import/manual';

const LABEL = 'Manuel Giriş';
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * POST /api/upload/manual — tek gün veya bir dönemin toplamı için elle veri girişi.
 * Gövde: { date, endDate?, platform?, campaign?, metrics: { spend, conversionValue, conversions,
 * impressions, clicks, reach }, custom: [{ key?, label, value, format? }] }. Tüm alanlar isteğe bağlı.
 * Dönem toplamı, dönemin ilk gününe yazılır (aylık raporda doğru, günlük grafikte tek gün görünür).
 */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { userId, brandId } = ctx;

  const parsed = validateManualEntry(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const e = parsed.entry;
  const m = e.metrics;
  const ratio = (a: number | null, b: number | null, factor = 1) => (a !== null && b ? (a / b) * factor : undefined);

  try {
    await prisma.$transaction(
      async (tx) => {
        const log = await tx.uploadLog.create({
          data: {
            userId,
            brandId,
            fileName: e.endDate ? `${e.campaign} (dönem toplamı)` : e.campaign,
            fileType: 'MANUEL',
            kind: 'manual',
            importedRows: 1,
            dateStart: utc(e.date),
            dateEnd: utc(e.endDate ?? e.date),
            platforms: JSON.stringify([e.platform]),
            reportJson: JSON.stringify({ custom: e.custom.map((c) => ({ key: c.key, label: c.label })) }),
            status: 'success',
          },
        });

        const campaign =
          (await tx.campaign.findFirst({ where: { brandId, name: e.campaign, platform: e.platform }, orderBy: { createdAt: 'asc' } })) ??
          (await tx.campaign.create({ data: { userId, brandId, name: e.campaign, platform: e.platform, source: 'manual', dataSourceLabel: LABEL } }));

        // Yalnızca özel metrik girilse de satır açılır; ay listesinde ve raporlarda görünmesi için
        await tx.dailyMetric.create({
          data: {
            userId,
            brandId,
            campaignId: campaign.id,
            uploadId: log.id,
            date: utc(e.date),
            platform: e.platform,
            spend: m.spend,
            revenue: m.conversionValue,
            conversions: m.conversions,
            impressions: m.impressions,
            clicks: m.clicks,
            reach: m.reach,
            ctr: ratio(m.clicks, m.impressions, 100),
            cpc: ratio(m.spend, m.clicks),
            cpm: ratio(m.spend, m.impressions, 1000),
            roas: ratio(m.conversionValue, m.spend),
            source: 'manual',
            dataSourceLabel: LABEL,
          },
        });

        if (e.custom.length) {
          await tx.customMetricValue.createMany({
            data: e.custom.map((c) => ({ brandId, uploadId: log.id, campaignId: campaign.id, date: utc(e.date), platform: e.platform, key: c.key, value: c.value })),
          });
          // Yeni metrikler markaya eklenir; var olanın adı/biçimi kullanıcının ayarıdır, değişmez
          await tx.metricDefinition.createMany({
            data: e.custom.map((c) => ({ brandId, key: c.key, label: c.label, kind: 'custom', format: c.format })),
            skipDuplicates: true,
          });
        }
      },
      { maxWait: 15_000, timeout: 60_000 }
    );

    const count = Object.values(m).filter((v) => v !== null).length + e.custom.length;
    return NextResponse.json({
      success: true,
      message: `${ctx.brand.name}: ${count} değer kaydedildi${e.endDate ? ` (${e.date} – ${e.endDate} dönem toplamı)` : ''}.`,
      importedRows: 1,
      dateStart: e.date,
      dateEnd: e.endDate ?? e.date,
    });
  } catch (error) {
    console.error('Manuel veri kaydetme hatası:', error);
    return NextResponse.json({ error: 'Veri kaydedilemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
