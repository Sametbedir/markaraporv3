export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addDemoMetrics, findValue, normalizeHeader, numberFrom } from '@/lib/demo-data';
import { prisma } from '@/lib/prisma';

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseDate(value: string) {
  const trimmed = value.trim();
  const turkishDate = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (turkishDate) return `${turkishDate[3]}-${turkishDate[2].padStart(2, '0')}-${turkishDate[1].padStart(2, '0')}`;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Şimdilik yalnızca CSV dosyaları destekleniyor.' }, { status: 400 });
    }

    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV dosyasında başlık ve en az bir veri satırı olmalı.' }, { status: 400 });
    }

    const headers = rows[0].map(normalizeHeader);
    const parsed = rows.slice(1).map((values) => {
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as Record<string, string>;
      return {
        date: parseDate(findValue(row, ['tarih', 'date', 'gun'])),
        platform: findValue(row, ['platform', 'kanal', 'channel']) || 'CSV',
        campaign: findValue(row, ['kampanya', 'campaign', 'campaignname']) || 'Yüklenen Veri',
        spend: numberFrom(findValue(row, ['harcama', 'spend', 'cost', 'maliyet'])),
        revenue: numberFrom(findValue(row, ['gelir', 'ciro', 'revenue', 'sales', 'satis'])),
        orders: numberFrom(findValue(row, ['siparis', 'orders', 'ordercount'])),
        impressions: numberFrom(findValue(row, ['gosterim', 'impressions'])),
        clicks: numberFrom(findValue(row, ['tiklama', 'clicks'])),
        conversions: numberFrom(findValue(row, ['donusum', 'conversions'])),
      };
    }).filter((row) => row.spend || row.revenue || row.orders || row.impressions || row.clicks);

    if (!parsed.length) {
      return NextResponse.json({ error: 'CSV sütunları tanınamadı. Örnek: tarih, harcama, gelir, sipariş.' }, { status: 400 });
    }

    let storage = 'database';
    if (session.user.id === 'admin-demo-user') {
      addDemoMetrics(parsed);
      storage = 'demo-memory';
    } else {
      for (const metric of parsed) {
        const campaign = await prisma.campaign.findFirst({
          where: { userId: session.user.id, name: metric.campaign, platform: metric.platform },
        }) ?? await prisma.campaign.create({
          data: { userId: session.user.id, name: metric.campaign, platform: metric.platform, source: 'upload', dataSourceLabel: 'Yüklenen CSV' },
        });

        await prisma.dailyMetric.create({
          data: {
            userId: session.user.id, campaignId: campaign.id, date: new Date(`${metric.date}T00:00:00.000Z`),
            platform: metric.platform, spend: metric.spend, revenue: metric.revenue, impressions: metric.impressions,
            clicks: metric.clicks, conversions: metric.conversions, source: 'upload', dataSourceLabel: 'Yüklenen CSV',
            ctr: metric.impressions ? (metric.clicks / metric.impressions) * 100 : 0,
            cpc: metric.clicks ? metric.spend / metric.clicks : 0,
            roas: metric.spend ? metric.revenue / metric.spend : 0,
          },
        });

        const orderCount = Math.max(0, Math.round(metric.orders));
        for (let index = 0; index < orderCount; index += 1) {
          await prisma.order.create({
            data: {
              userId: session.user.id, orderNumber: `CSV-${Date.now()}-${index}`, totalPrice: orderCount ? metric.revenue / orderCount : 0,
              channel: metric.platform, source: 'upload', status: 'confirmed', itemCount: 1,
              orderDate: new Date(`${metric.date}T00:00:00.000Z`),
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: `"${file.name}" dosyası işlendi. ${parsed.length} satır dashboard'a aktarıldı.`,
      filename: file.name,
      size: file.size,
      importedRows: parsed.length,
      storage,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Yükleme hatası' }, { status: 500 });
  }
}
