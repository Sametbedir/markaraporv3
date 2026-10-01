export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addDemoMetrics, findValue, normalizeHeader, numberFrom } from '@/lib/demo-data';
import { prisma } from '@/lib/prisma';

/* ─── Inline lightweight Excel reader (xlsx package) ─── */
async function parseExcel(buffer: ArrayBuffer): Promise<Record<string, string>[][]> {
  // Dynamic import so it won't affect cold-start for CSV-only uploads
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const results: Record<string, string>[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
      dateNF: 'DD.MM.YYYY',
    });
    if (json.length === 0) continue;
    // Convert each row to Record<string, string>
    results.push(
      json.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, String(v ?? '')])
        )
      ) as Record<string, string>[]
    );
  }
  return results;
}

/* ─── Pure-JS CSV parser (no external deps) ─── */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  // Normalize BOM and encoding
  const normalized = text.replace(/^\uFEFF/, '');

  // Detect separator: if more semicolons than commas in first line → semicolon
  const firstLine = normalized.split('\n')[0] ?? '';
  const separator = (firstLine.split(';').length - 1) >= (firstLine.split(',').length - 1) ? ';' : ',';

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const next = normalized[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === separator && !quoted) {
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

/* ─── Date normalizer ─── */
function parseDate(value: string): string {
  const trimmed = value.trim();
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const turkishDate = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (turkishDate) {
    return `${turkishDate[3]}-${turkishDate[2].padStart(2, '0')}-${turkishDate[1].padStart(2, '0')}`;
  }
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().split('T')[0]
    : date.toISOString().split('T')[0];
}

/* ─── Column-name aliases (Türkçe + platform variants) ─── */
const ALIASES = {
  date:        ['tarih', 'date', 'gun', 'gün', 'day', 'report_date', 'raportar', 'donem', 'dönem'],
  platform:    ['platform', 'kanal', 'channel', 'network', 'kaynak', 'source'],
  campaign:    ['kampanya', 'campaign', 'campaignname', 'ad_set', 'reklam', 'adkampanya'],
  spend:       ['harcama', 'spend', 'cost', 'maliyet', 'reklam_maliyeti', 'amount_spent',
                'toplam_harcama', 'butce', 'bütçe', 'harcanan', 'adspend', 'ad_spend',
                'cost_micros', 'reklam_harcamasi', 'reklam_harcaması'],
  revenue:     ['gelir', 'ciro', 'revenue', 'sales', 'satis', 'satış', 'total_revenue',
                'conversion_value', 'purchase_value', 'total_sales', 'toplam_gelir',
                'toplam_ciro', 'satis_geliri', 'satış_geliri', 'hasilat'],
  orders:      ['siparis', 'sipariş', 'orders', 'ordercount', 'order_count', 'siparis_sayisi',
                'sipariş_sayısı', 'adet', 'conversions', 'purchases', 'satis_adedi', 'satış_adedi'],
  impressions: ['gosterim', 'gösterim', 'impressions', 'impr', 'reach', 'views'],
  clicks:      ['tiklama', 'tıklama', 'clicks', 'click', 'link_clicks', 'website_clicks'],
  conversions: ['donusum', 'dönüşüm', 'conversions', 'conv', 'results'],
  aov:         ['aov', 'ortalama_sepet', 'sepet_ortalaması', 'avg_order', 'average_order_value'],
  cpc:         ['cpc', 'tiklama_maliyeti', 'tıklama_maliyeti', 'cost_per_click'],
  ctr:         ['ctr', 'tiklama_orani', 'tıklama_oranı', 'click_through_rate'],
  cac:         ['cac', 'musteri_edinme', 'müşteri_edinme', 'cost_per_acquisition', 'cpa'],
  followers:   ['takipci', 'takipçi', 'followers', 'follower_count'],
  basket:      ['sepet', 'basket', 'cart_value', 'toplam_sepet', 'total_cart'],
};

type ParsedRow = {
  date: string;
  platform: string;
  campaign: string;
  spend: number;
  revenue: number;
  orders: number;
  impressions: number;
  clicks: number;
  conversions: number;
  aov?: number;
  cpc?: number;
  ctr?: number;
  cac?: number;
  followers?: number;
  basket?: number;
};

function rowToMetric(row: Record<string, string>): ParsedRow {
  return {
    date:        parseDate(findValue(row, ALIASES.date)),
    platform:    findValue(row, ALIASES.platform) || 'CSV',
    campaign:    findValue(row, ALIASES.campaign) || 'Yüklenen Veri',
    spend:       numberFrom(findValue(row, ALIASES.spend)),
    revenue:     numberFrom(findValue(row, ALIASES.revenue)),
    orders:      numberFrom(findValue(row, ALIASES.orders)),
    impressions: numberFrom(findValue(row, ALIASES.impressions)),
    clicks:      numberFrom(findValue(row, ALIASES.clicks)),
    conversions: numberFrom(findValue(row, ALIASES.conversions)),
    aov:         numberFrom(findValue(row, ALIASES.aov)) || undefined,
    cpc:         numberFrom(findValue(row, ALIASES.cpc)) || undefined,
    ctr:         numberFrom(findValue(row, ALIASES.ctr)) || undefined,
    cac:         numberFrom(findValue(row, ALIASES.cac)) || undefined,
    followers:   numberFrom(findValue(row, ALIASES.followers)) || undefined,
    basket:      numberFrom(findValue(row, ALIASES.basket)) || undefined,
  };
}

/* ─── Main handler ─── */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const isCsv = ext === 'csv';

    if (!isExcel && !isCsv) {
      return NextResponse.json(
        { error: 'Desteklenmeyen format. Lütfen CSV, XLSX veya XLS dosyası yükleyin.' },
        { status: 400 }
      );
    }

    // File size guard (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Dosya boyutu 10 MB sınırını aşıyor.' },
        { status: 400 }
      );
    }

    let parsed: ParsedRow[] = [];

    /* ── Excel path ── */
    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const sheets = await parseExcel(buffer);
      if (sheets.length === 0) {
        return NextResponse.json({ error: 'Excel dosyasında geçerli veri bulunamadı.' }, { status: 400 });
      }
      for (const sheetRows of sheets) {
        const mapped = sheetRows
          .map((row) => {
            // normalise keys
            const normalised: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              normalised[normalizeHeader(k)] = v;
            }
            return rowToMetric(normalised);
          })
          .filter((r) => r.spend || r.revenue || r.orders || r.impressions || r.clicks);
        parsed.push(...mapped);
      }
    }

    /* ── CSV path ── */
    if (isCsv) {
      let text = '';
      try {
        text = await file.text();
      } catch {
        return NextResponse.json({ error: 'Dosya okunamadı. UTF-8 veya Windows-1254 encoding deneyin.' }, { status: 400 });
      }
      const rows = parseCsv(text);
      if (rows.length < 2) {
        return NextResponse.json(
          { error: 'CSV dosyasında başlık satırı ve en az bir veri satırı olmalıdır.' },
          { status: 400 }
        );
      }
      const headers = rows[0].map(normalizeHeader);
      const dataRows = rows.slice(1).map((values) => {
        const raw: Record<string, string> = Object.fromEntries(
          headers.map((h, i) => [h, values[i] ?? ''])
        );
        return rowToMetric(raw);
      });
      parsed = dataRows.filter(
        (r) => r.spend || r.revenue || r.orders || r.impressions || r.clicks
      );
    }

    if (!parsed.length) {
      return NextResponse.json(
        {
          error:
            'Hiçbir satır tanınamadı. Sütun başlıkları şunlardan biri olmalı: ' +
            'tarih, harcama, ciro/gelir, sipariş, gösterim, tıklama. ' +
            'Meta Ads, Google Ads veya İkas/Ticimax dışa aktarma dosyaları direkt desteklenir.',
        },
        { status: 400 }
      );
    }

    /* ── Persist ── */
    let storage = 'database';
    if (session.user.id === 'admin-demo-user') {
      addDemoMetrics(parsed);
      storage = 'demo-memory';
    } else {
      for (const metric of parsed) {
        const campaign =
          (await prisma.campaign.findFirst({
            where: { userId: session.user.id, name: metric.campaign, platform: metric.platform },
          })) ??
          (await prisma.campaign.create({
            data: {
              userId: session.user.id,
              name: metric.campaign,
              platform: metric.platform,
              source: 'upload',
              dataSourceLabel: `Yüklenen ${ext.toUpperCase()}`,
            },
          }));

        // Derive metrics where missing
        const impliedRevenue = metric.aov && metric.orders ? metric.aov * metric.orders : metric.revenue;
        const impliedCpc   = metric.cpc ?? (metric.clicks ? metric.spend / metric.clicks : 0);
        const impliedCtr   = metric.ctr ?? (metric.impressions ? (metric.clicks / metric.impressions) * 100 : 0);
        const impliedRoas  = metric.spend ? (impliedRevenue || metric.revenue) / metric.spend : 0;

        await prisma.dailyMetric.create({
          data: {
            userId:        session.user.id,
            campaignId:    campaign.id,
            date:          new Date(`${metric.date}T00:00:00.000Z`),
            platform:      metric.platform,
            spend:         metric.spend,
            revenue:       impliedRevenue || metric.revenue,
            impressions:   metric.impressions,
            clicks:        metric.clicks,
            conversions:   metric.conversions,
            source:        'upload',
            dataSourceLabel: `Yüklenen ${ext.toUpperCase()}`,
            ctr:           impliedCtr,
            cpc:           impliedCpc,
            roas:          impliedRoas,
          },
        });

        const orderCount = Math.max(0, Math.round(metric.orders));
        for (let index = 0; index < orderCount; index += 1) {
          await prisma.order.create({
            data: {
              userId:      session.user.id,
              orderNumber: `${ext.toUpperCase()}-${Date.now()}-${index}`,
              totalPrice:  orderCount ? (impliedRevenue || metric.revenue) / orderCount : 0,
              channel:     metric.platform,
              source:      'upload',
              status:      'confirmed',
              itemCount:   1,
              orderDate:   new Date(`${metric.date}T00:00:00.000Z`),
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: `"${file.name}" başarıyla işlendi. ${parsed.length} satır dashboard'a aktarıldı.`,
      filename: file.name,
      size: file.size,
      importedRows: parsed.length,
      storage,
    });
  } catch (e: any) {
    console.error('[upload] error:', e);
    return NextResponse.json(
      { error: `Yükleme hatası: ${e?.message ?? 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}
