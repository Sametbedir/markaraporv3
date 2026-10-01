export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addDemoMetrics, findValue, normalizeHeader, numberFrom } from '@/lib/demo-data';
import { prisma } from '@/lib/prisma';

/* ═══════════════════════════════════════════════════════════════
   EXCEL PARSER  (xlsx package — dynamic import)
═══════════════════════════════════════════════════════════════ */
async function parseExcel(buffer: ArrayBuffer): Promise<Record<string, string>[][]> {
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
    if (!json.length) continue;
    results.push(
      json.map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
      ) as Record<string, string>[]
    );
  }
  return results;
}

/* ═══════════════════════════════════════════════════════════════
   CSV PARSER  (pure JS — BOM-safe, comma/semicolon/tab auto-detect)
═══════════════════════════════════════════════════════════════ */
function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, ''); // strip BOM
  const firstLine = text.split('\n')[0] ?? '';
  const sep =
    (firstLine.split(';').length - 1) >= (firstLine.split(',').length - 1)
      ? ';'
      : (firstLine.split('\t').length - 1) >= (firstLine.split(',').length - 1)
      ? '\t'
      : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && quoted && n === '"') { value += '"'; i++; }
    else if (c === '"') { quoted = !quoted; }
    else if (c === sep && !quoted) { row.push(value.trim()); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = '';
    } else { value += c; }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/* ═══════════════════════════════════════════════════════════════
   DATE NORMALIZATION
═══════════════════════════════════════════════════════════════ */
function parseDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // DD.MM.YYYY  DD/MM/YYYY  DD-MM-YYYY
  const tr = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return `${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // MM/DD/YYYY
  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════════════════════════
   COLUMN ALIASES  (TR + EN + platform variants)
═══════════════════════════════════════════════════════════════ */
const A = {
  date:     ['tarih','date','gun','gün','day','report_date','donem','dönem','raportar'],
  platform: ['platform','kanal','channel','network','kaynak','source','medya'],
  campaign: ['kampanya','campaign','campaignname','ad_set','adset','reklam','reklamadi','ad_name'],
  spend:    ['harcama','spend','cost','maliyet','amount_spent','toplam_harcama','butce','bütçe',
             'harcanan','adspend','ad_spend','cost_micros','reklam_harcamasi','reklam_harcaması',
             'maliyet_tl','toplam_maliyet'],
  revenue:  ['gelir','ciro','revenue','sales','satis','satış','total_revenue','conversion_value',
             'purchase_value','total_sales','toplam_gelir','toplam_ciro','satis_geliri',
             'satış_geliri','hasilat','total_value'],
  orders:   ['siparis','sipariş','orders','ordercount','order_count','siparis_sayisi',
             'sipariş_sayısı','adet','conversions','purchases','satis_adedi','satış_adedi',
             'result','results'],
  impressions:['gosterim','gösterim','impressions','impr','reach','views','goruntuleme'],
  clicks:   ['tiklama','tıklama','clicks','click','link_clicks','website_clicks','tiklama_sayisi'],
  conversions:['donusum','dönüşüm','conversions','conv','sepete_ekle'],
  aov:      ['aov','ortalama_sepet','sepet_ortalaması','avg_order','average_order_value','ort_siparis'],
  cpc:      ['cpc','tiklama_maliyeti','tıklama_maliyeti','cost_per_click','tba_maliyet'],
  ctr:      ['ctr','tiklama_orani','tıklama_oranı','click_through_rate'],
  cac:      ['cac','musteri_edinme','müşteri_edinme','cost_per_acquisition','cpa','edinme_maliyeti'],
  followers:['takipci','takipçi','followers','follower_count'],
  basket:   ['sepet','basket','cart_value','toplam_sepet','total_cart'],
};

type ParsedRow = {
  date: string;
  platform: string;
  campaign: string;
  spend: number; revenue: number; orders: number;
  impressions: number; clicks: number; conversions: number;
  aov?: number; cpc?: number; ctr?: number; cac?: number;
  followers?: number; basket?: number;
};

function rowToMetric(row: Record<string, string>): ParsedRow | null {
  const date = parseDate(findValue(row, A.date));
  if (!date) return null; // skip rows without a parsable date

  return {
    date,
    platform:    findValue(row, A.platform) || 'Genel',
    campaign:    findValue(row, A.campaign) || 'Yüklenen Veri',
    spend:       numberFrom(findValue(row, A.spend)),
    revenue:     numberFrom(findValue(row, A.revenue)),
    orders:      numberFrom(findValue(row, A.orders)),
    impressions: numberFrom(findValue(row, A.impressions)),
    clicks:      numberFrom(findValue(row, A.clicks)),
    conversions: numberFrom(findValue(row, A.conversions)),
    aov:         numberFrom(findValue(row, A.aov)) || undefined,
    cpc:         numberFrom(findValue(row, A.cpc)) || undefined,
    ctr:         numberFrom(findValue(row, A.ctr)) || undefined,
    cac:         numberFrom(findValue(row, A.cac)) || undefined,
    followers:   numberFrom(findValue(row, A.followers)) || undefined,
    basket:      numberFrom(findValue(row, A.basket)) || undefined,
  };
}

/* ═══════════════════════════════════════════════════════════════
   DETECT date range & platforms from parsed rows
═══════════════════════════════════════════════════════════════ */
function detectMeta(rows: ParsedRow[]) {
  const dates = rows.map((r) => r.date).filter(Boolean).sort();
  const platforms = [...new Set(rows.map((r) => r.platform).filter(Boolean))];
  return {
    dateStart: dates[0] ?? null,
    dateEnd:   dates[dates.length - 1] ?? null,
    platforms,
  };
}

/* ═══════════════════════════════════════════════════════════════
   DESCRIBE PARSE FAILURE (human-readable Turkish)
═══════════════════════════════════════════════════════════════ */
function buildParseError(headers: string[]): string {
  const detected = headers.slice(0, 8).join(', ');
  return (
    `Sütunlar tanınamadı. Tespit edilen sütun adları: [${detected}]. ` +
    `Desteklenen sütun adları: tarih/date, harcama/spend/cost, ciro/gelir/revenue, ` +
    `sipariş/orders, gösterim/impressions, tıklama/clicks, platform/kanal, kampanya/campaign.`
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
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const isCsv   = ext === 'csv';

    if (!isExcel && !isCsv)
      return NextResponse.json(
        { error: `".${ext}" formatı desteklenmiyor. Lütfen CSV, XLSX veya XLS dosyası yükleyin.` },
        { status: 400 }
      );

    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json(
        { error: `Dosya boyutu ${(file.size / 1024 / 1024).toFixed(1)} MB — 10 MB sınırını aşıyor.` },
        { status: 400 }
      );

    if (file.size === 0)
      return NextResponse.json({ error: 'Dosya boş görünüyor.' }, { status: 400 });

    /* ── Parse ── */
    let parsed: ParsedRow[] = [];
    let rawHeaders: string[] = [];

    if (isExcel) {
      let sheets: Record<string, string>[][];
      try {
        sheets = await parseExcel(await file.arrayBuffer());
      } catch (ex: any) {
        return NextResponse.json(
          { error: `Excel dosyası okunamadı: ${ex?.message ?? 'Format hatası'}. Dosyanın bozulmadığından emin olun.` },
          { status: 400 }
        );
      }
      if (!sheets.length)
        return NextResponse.json({ error: 'Excel dosyasında hiçbir çalışma sayfasında veri bulunamadı.' }, { status: 400 });

      for (const sheetRows of sheets) {
        if (!sheetRows.length) continue;
        rawHeaders = Object.keys(sheetRows[0]);
        const mapped = sheetRows
          .map((row) => {
            const norm: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) norm[normalizeHeader(k)] = v;
            return rowToMetric(norm);
          })
          .filter((r): r is ParsedRow => r !== null && !!(r.spend || r.revenue || r.orders || r.impressions || r.clicks));
        parsed.push(...mapped);
      }
    }

    if (isCsv) {
      let text: string;
      try {
        text = await file.text();
      } catch {
        return NextResponse.json(
          { error: 'CSV dosyası okunamadı. Dosyanın UTF-8 veya Windows-1254 encoding ile kaydedildiğinden emin olun.' },
          { status: 400 }
        );
      }
      const rows = parseCsv(text);
      if (rows.length < 2)
        return NextResponse.json(
          { error: 'CSV çok kısa: en az 1 başlık satırı + 1 veri satırı olmalı.' },
          { status: 400 }
        );
      const headers = rows[0].map(normalizeHeader);
      rawHeaders = rows[0];
      const data = rows.slice(1).map((values) => {
        const raw: Record<string, string> = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
        return rowToMetric(raw);
      });
      parsed = data.filter((r): r is ParsedRow => r !== null && !!(r.spend || r.revenue || r.orders || r.impressions || r.clicks));
    }

    if (!parsed.length)
      return NextResponse.json(
        { error: buildParseError(rawHeaders) },
        { status: 400 }
      );

    /* ── Date & platform meta ── */
    const meta = detectMeta(parsed);

    /* ── Persist ── */
    const userId = session.user.id;
    const isDemo = userId === 'admin-demo-user';

    if (isDemo) {
      addDemoMetrics(parsed);
    } else {
      for (const metric of parsed) {
        const label = `Yüklenen ${ext.toUpperCase()}`;
        const campaign =
          (await prisma.campaign.findFirst({
            where: { userId, name: metric.campaign, platform: metric.platform },
          })) ??
          (await prisma.campaign.create({
            data: { userId, name: metric.campaign, platform: metric.platform, source: 'upload', dataSourceLabel: label },
          }));

        const impliedRevenue = metric.aov && metric.orders ? metric.aov * metric.orders : metric.revenue;
        const impliedCpc = metric.cpc ?? (metric.clicks ? metric.spend / metric.clicks : 0);
        const impliedCtr = metric.ctr ?? (metric.impressions ? (metric.clicks / metric.impressions) * 100 : 0);
        const impliedRoas = metric.spend ? (impliedRevenue || metric.revenue) / metric.spend : 0;

        await prisma.dailyMetric.create({
          data: {
            userId, campaignId: campaign.id,
            date: new Date(`${metric.date}T00:00:00.000Z`),
            platform: metric.platform,
            spend: metric.spend, revenue: impliedRevenue || metric.revenue,
            impressions: metric.impressions, clicks: metric.clicks,
            conversions: metric.conversions,
            source: 'upload', dataSourceLabel: label,
            ctr: impliedCtr, cpc: impliedCpc, roas: impliedRoas,
          },
        });

        const orderCount = Math.max(0, Math.round(metric.orders));
        for (let i = 0; i < orderCount; i++) {
          await prisma.order.create({
            data: {
              userId, orderNumber: `${ext.toUpperCase()}-${Date.now()}-${i}`,
              totalPrice: orderCount ? (impliedRevenue || metric.revenue) / orderCount : 0,
              channel: metric.platform, source: 'upload', status: 'confirmed', itemCount: 1,
              orderDate: new Date(`${metric.date}T00:00:00.000Z`),
            },
          });
        }
      }

      // ── Save UploadLog ──
      try {
        await (prisma as any).uploadLog.create({
          data: {
            userId,
            fileName: file.name,
            fileType: ext.toUpperCase(),
            importedRows: parsed.length,
            dateStart: meta.dateStart ? new Date(`${meta.dateStart}T00:00:00.000Z`) : null,
            dateEnd:   meta.dateEnd   ? new Date(`${meta.dateEnd}T00:00:00.000Z`)   : null,
            platforms: JSON.stringify(meta.platforms),
            status: 'success',
          },
        });
      } catch {
        // UploadLog tablosu henüz migrate edilmemişse sessizce geç
      }
    }

    return NextResponse.json({
      success: true,
      message: `"${file.name}" başarıyla işlendi. ${parsed.length} satır dashboard'a aktarıldı.`,
      filename: file.name,
      size: file.size,
      importedRows: parsed.length,
      storage: isDemo ? 'demo-memory' : 'database',
      dateStart: meta.dateStart,
      dateEnd:   meta.dateEnd,
      platforms: meta.platforms,
    });
  } catch (e: any) {
    console.error('[upload] error:', e);
    return NextResponse.json(
      { error: `Sunucu hatası: ${e?.message ?? 'Bilinmeyen hata'}. Lütfen tekrar deneyin.` },
      { status: 500 }
    );
  }
}
