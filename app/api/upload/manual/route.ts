export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { addDemoMetrics } from '@/lib/demo-data';
import { parseDate } from '@/lib/import/dates';
import { parseNumber } from '@/lib/import/numbers';

const DEFAULT_PLATFORM = 'Manuel Giriş';

type FieldResult = { value: number | null; error?: string };

/** Boş alan null kalır; okunamayan veya negatif değer hata olarak döner. Hiçbir alan tahminle doldurulmaz. */
function readField(raw: unknown, label: string, { integer = false } = {}): FieldResult {
  const parsed = parseNumber(typeof raw === 'number' ? raw : String(raw ?? ''), 'comma');
  if (parsed.invalid) return { value: null, error: `"${label}" alanı okunamadı.` };
  if (parsed.value !== null && parsed.value < 0) return { value: null, error: `"${label}" negatif olamaz.` };
  if (parsed.value !== null && integer) return { value: Math.round(parsed.value) };
  return { value: parsed.value };
}

/**
 * POST /api/upload/manual — tek bir kampanya-gün kaydı ekler.
 * Alanlar: date, platform, campaign, adGroup, adName, spend, revenue, impressions, clicks,
 * newCustomers, returningCustomers.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    }

    const date = parseDate(String(body.date ?? ''));
    if (!date) {
      return NextResponse.json({ error: 'Geçerli bir tarih girin.' }, { status: 400 });
    }

    const fields = {
      spend: readField(body.spend, 'Harcanan tutar'),
      revenue: readField(body.revenue, 'Ciro'),
      impressions: readField(body.impressions, 'Gösterim', { integer: true }),
      clicks: readField(body.clicks, 'Tıklama', { integer: true }),
      newCustomers: readField(body.newCustomers, 'Yeni müşteri', { integer: true }),
      returningCustomers: readField(body.returningCustomers, 'Geri dönen müşteri', { integer: true }),
    };
    const errors = Object.values(fields).flatMap((f) => (f.error ? [f.error] : []));
    if (errors.length) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    const platform = String(body.platform ?? '').trim() || DEFAULT_PLATFORM;
    const campaignName = String(body.campaign ?? '').trim() || `${platform} Kampanyası`;
    const { spend, revenue, impressions, clicks } = {
      spend: fields.spend.value,
      revenue: fields.revenue.value,
      impressions: fields.impressions.value,
      clicks: fields.clicks.value,
    };
    // Müşteri sayıları girildiyse dönüşüm olarak toplanır; hiçbiri girilmediyse dönüşüm bilinmiyor (null).
    const customerCounts = [fields.newCustomers.value, fields.returningCustomers.value].filter((v): v is number => v !== null);
    const conversions = customerCounts.length ? customerCounts.reduce((a, b) => a + b, 0) : null;

    if ([spend, revenue, impressions, clicks, conversions].every((v) => v === null)) {
      return NextResponse.json({ error: 'En az bir metrik (harcama, ciro, gösterim, tıklama veya müşteri) girin.' }, { status: 400 });
    }

    const userId = session.user.id;

    if (userId === 'admin-demo-user') {
      addDemoMetrics([{
        date, platform, campaign: campaignName,
        spend: spend ?? 0, revenue: revenue ?? 0, orders: 0,
        impressions: impressions ?? 0, clicks: clicks ?? 0, conversions: conversions ?? 0,
      }]);
    } else {
      await prisma.$transaction(async (tx) => {
        const log = await tx.uploadLog.create({
          data: {
            userId,
            fileName: campaignName,
            fileType: 'MANUEL',
            kind: 'manual',
            importedRows: 1,
            dateStart: new Date(`${date}T00:00:00.000Z`),
            dateEnd: new Date(`${date}T00:00:00.000Z`),
            platforms: JSON.stringify([platform]),
            status: 'success',
          },
        });

        const campaign =
          (await tx.campaign.findFirst({ where: { userId, name: campaignName, platform } })) ??
          (await tx.campaign.create({
            data: { userId, name: campaignName, platform, source: 'manual', dataSourceLabel: 'Manuel Giriş' },
          }));

        await tx.dailyMetric.create({
          data: {
            userId,
            campaignId: campaign.id,
            uploadId: log.id,
            date: new Date(`${date}T00:00:00.000Z`),
            platform,
            spend,
            revenue,
            impressions,
            clicks,
            conversions,
            ctr: clicks !== null && impressions ? (clicks / impressions) * 100 : undefined,
            cpc: spend !== null && clicks ? spend / clicks : undefined,
            roas: revenue !== null && spend ? revenue / spend : undefined,
            source: 'manual',
            dataSourceLabel: 'Manuel Giriş',
          },
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Veri kaydedildi.',
      importedRows: 1,
      dateStart: date,
      dateEnd: date,
    });
  } catch (error: any) {
    console.error('Manuel veri kaydetme hatası:', error);
    return NextResponse.json(
      { error: 'Veri kaydedilemedi. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
