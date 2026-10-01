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
      dateNF: 'YYYY-MM-DD',
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
  const firstLine = text.split(/\r?\n/)[0] ?? '';
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
    if (c === '"' && quoted && n === '"') {
      value += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === sep && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += c;
    }
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
  // YYYY-MM-DD
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(v)) {
    const parts = v.split(/[./-]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`;
  }
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const tr = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (tr) {
    return `${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}`;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

/* ═══════════════════════════════════════════════════════════════
   COLUMN ALIASES (Turkish & English & Platform variants)
═══════════════════════════════════════════════════════════════ */
const A = {
  date:        ['tarih', 'date', 'gun', 'gün', 'day', 'reportdate', 'donem', 'dönem', 'raportar', 'time'],
  platform:    ['kanal', 'platform', 'channel', 'network', 'kaynak', 'source', 'medya'],
  campaign:    ['kampanya', 'campaign', 'campaignname', 'adset', 'ad_set', 'reklam', 'adname', 'ad_name'],
  spend:       ['harcama', 'spend', 'cost', 'maliyet', 'amountspent', 'amount_spent', 'toplamharcama',
                'butce', 'bütçe', 'harcanan', 'adspend', 'ad_spend', 'reklamharcamasi', 'maliyet_tl'],
  revenue:     ['ciro', 'gelir', 'revenue', 'sales', 'satis', 'satış', 'totalsales', 'toplamgelir',
                'toplamciro', 'satisgeliri', 'conversionvalue', 'purchasevalue', 'totalvalue', 'kazanc'],
  orders:      ['siparis', 'sipariş', 'orders', 'ordercount', 'order_count', 'siparissayisi',
                'adet', 'conversions', 'purchases', 'satısadedi', 'satisadedi', 'transactions'],
  impressions: ['gosterim', 'gösterim', 'impressions', 'impr', 'reach', 'views', 'goruntulenme'],
  clicks:      ['tiklama', 'tıklama', 'clicks', 'click', 'linkclicks', 'link_clicks', 'websiteclicks'],
  conversions: ['donusum', 'dönüşüm', 'conversions', 'conversion', 'sepeteekle'],
  aov:         ['aov', 'ortalamasepet', 'sepetortalamasi', 'avgorder'],
  cpc:         ['cpc', 'tiklamamaliyeti', 'costperclick'],
  ctr:         ['ctr', 'tiklamaorani', 'clickthroughrate'],
  cac:         ['cac', 'cpa', 'musteriedinme', 'costperacquisition'],
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
};

function rowToMetric(row: Record<string, string>): ParsedRow | null {
  const dateStr = findValue(row, A.date);
  const date = parseDate(dateStr);
  if (!date) return null;

  const spend = numberFrom(findValue(row, A.spend));
  const revenue = numberFrom(findValue(row, A.revenue));
  const orders = numberFrom(findValue(row, A.orders));
  const impressions = numberFrom(findValue(row, A.impressions));
  const clicks = numberFrom(findValue(row, A.clicks));
  const conversions = numberFrom(findValue(row, A.conversions)) || orders;

  // En az biri sıfırdan büyük veya anlamlı olmalı
  if (!spend && !revenue && !orders && !impressions && !clicks) return null;

  return {
    date,
    platform: findValue(row, A.platform) || 'Meta Ads',
    campaign: findValue(row, A.campaign) || 'Yüklenen Kampanya',
    spend,
    revenue,
    orders,
    impressions,
    clicks,
    conversions,
    aov: numberFrom(findValue(row, A.aov)) || undefined,
    cpc: numberFrom(findValue(row, A.cpc)) || undefined,
    ctr: numberFrom(findValue(row, A.ctr)) || undefined,
    cac: numberFrom(findValue(row, A.cac)) || undefined,
  };
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

    let parsed: ParsedRow[] = [];
    let detectedHeaders: string[] = [];

    /* ─── Excel Okuma ─── */
    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const sheets = await parseExcel(buffer);
        if (!sheets.length) {
          return NextResponse.json({ error: 'Excel dosyasında veri sayfası bulunamadı veya boş.' }, { status: 400 });
        }
        for (const sheetRows of sheets) {
          if (!sheetRows.length) continue;
          detectedHeaders = Object.keys(sheetRows[0]);
          for (const raw of sheetRows) {
            const norm: Record<string, string> = {};
            for (const [k, v] of Object.entries(raw)) {
              norm[normalizeHeader(k)] = v;
            }
            const m = rowToMetric(norm);
            if (m) parsed.push(m);
          }
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Excel dosyası ayrıştırılamadı: ${err?.message || 'Bozuk dosya formatı'}` },
          { status: 400 }
        );
      }
    }

    /* ─── CSV Okuma ─── */
    if (isCsv) {
      let text = '';
      try {
        text = await file.text();
      } catch {
        return NextResponse.json(
          { error: 'CSV dosyası okunamadı. UTF-8 kodlamasında kaydedildiğinden emin olun.' },
          { status: 400 }
        );
      }

      const rows = parseCsv(text);
      if (rows.length < 2) {
        return NextResponse.json(
          { error: 'Dosyada yeterli veri satırı bulunamadı (en az bir başlık ve bir veri satırı gereklidir).' },
          { status: 400 }
        );
      }

      const headers = rows[0].map(normalizeHeader);
      detectedHeaders = rows[0];

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] ?? '';
        });
        const m = rowToMetric(rowObj);
        if (m) parsed.push(m);
      }
    }

    if (!parsed.length) {
      const headerList = detectedHeaders.slice(0, 10).join(', ');
      return NextResponse.json(
        {
          error: `Dosyadaki sütunlar tanınamadı veya geçerli satır bulunamadı. Bulunan başlıklar: [${headerList}]. ` +
            `Gerekli en az sütunlar: Tarih, Harcama/Spend veya Ciro/Gelir/Revenue veya Sipariş/Orders.`,
        },
        { status: 400 }
      );
    }

    /* ─── Meta Bilgileri Hesapla ─── */
    const dates = parsed.map((p) => p.date).sort();
    const dateStart = dates[0];
    const dateEnd = dates[dates.length - 1];
    const platforms = [...new Set(parsed.map((p) => p.platform))];

    const totalSpend = parsed.reduce((sum, p) => sum + p.spend, 0);
    const totalRevenue = parsed.reduce((sum, p) => sum + p.revenue, 0);
    const totalOrders = parsed.reduce((sum, p) => sum + p.orders, 0);

    const userId = session.user.id;
    const isDemo = userId === 'admin-demo-user';

    if (isDemo) {
      addDemoMetrics(parsed);
    } else {
      /* ─── ULTRA HIZLI BATCH YAZMA ─── */
      // 1. Eşsiz Kampanyaları Çözümle
      const uniqueCampaignKeys = [...new Set(parsed.map((p) => `${p.platform}:::${p.campaign}`))];
      const campaignMap = new Map<string, string>(); // key -> campaign.id

      // Mevcut kampanyaları çek
      const existingCampaigns = await prisma.campaign.findMany({
        where: { userId },
        select: { id: true, name: true, platform: true },
      });
      existingCampaigns.forEach((c) => {
        campaignMap.set(`${c.platform}:::${c.name}`, c.id);
      });

      // Eksik olanları oluştur
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

      // 2. DailyMetric Kayıtlarını Toplu Oluştur (Batch)
      const dailyMetricRecords = parsed.map((m) => {
        const campaignId = campaignMap.get(`${m.platform}:::${m.campaign}`) || null;
        const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
        const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
        const roas = m.spend > 0 ? m.revenue / m.spend : 0;

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

      // PostgreSQL createMany ile tek sorguda gönder
      await prisma.dailyMetric.createMany({
        data: dailyMetricRecords,
      });

      // 3. Order Kayıtlarını Toplu Oluştur (Her satır için 1 toplu sipariş kaydı, itemCount = orders)
      const orderRecords = parsed
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

      // 4. UploadLog Kaydı (Hata vermemesi için güvenli blok)
      try {
        await (prisma as any).uploadLog.create({
          data: {
            userId,
            fileName: file.name,
            fileType: ext.toUpperCase(),
            importedRows: parsed.length,
            dateStart: new Date(`${dateStart}T00:00:00.000Z`),
            dateEnd: new Date(`${dateEnd}T00:00:00.000Z`),
            platforms: JSON.stringify(platforms),
            status: 'success',
          },
        });
      } catch {
        // Tablo henüz migrate edilmediyse sessizce atla
      }
    }

    return NextResponse.json({
      success: true,
      message: `"${file.name}" başarıyla işlendi! Toplam ${parsed.length} satır, ${totalOrders.toLocaleString('tr-TR')} sipariş ve ₺${Math.round(totalRevenue).toLocaleString('tr-TR')} ciro aktarıldı.`,
      filename: file.name,
      importedRows: parsed.length,
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSpend: Math.round(totalSpend * 100) / 100,
      dateStart,
      dateEnd,
      platforms,
    });
  } catch (err: any) {
    console.error('Upload Error:', err);
    return NextResponse.json(
      {
        error: `Yükleme sırasında hata oluştu: ${err?.message || 'Bilinmeyen sistem hatası'}. Dosya formatını kontrol edin.`,
      },
      { status: 500 }
    );
  }
}
