/**
 * UNIVERSAL DATA PARSER (markarapor_v3)
 * Her türlü CSV, TSV, XLSX, XLS, TXT dosyasını parse eder.
 */

export interface NormalizedMetricRow {
  date: string; // YYYY-MM-DD
  platform: string;
  campaign: string;
  spend: number;
  revenue: number;
  orders: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas?: number;
  aov?: number;
  cpc?: number;
  ctr?: number;
  basket?: number;
  followers?: number;
}

export interface UniversalParseResult {
  rows: NormalizedMetricRow[];
  dateStart: string;
  dateEnd: string;
  totalSpend: number;
  totalRevenue: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  platforms: string[];
  detectedType: 'standard_horizontal' | 'key_value_vertical' | 'date_range_spread' | 'no_date_campaigns';
}

export function parseUniversalNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let str = String(value).trim();
  str = str.replace(/₺|TL|TRY|\$|€|£|x|%|adet|gün|\/gün|\/day|users|kisi/gi, '').trim();
  if (!str) return 0;

  if (/\d+\s+\d+/.test(str)) {
    str = str.replace(/\s+/g, '');
  }

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      str = str.replace(/\./g, '');
    } else if (parts.length > 2) {
      str = str.replace(/\./g, '');
    }
  }

  const num = Number(str.replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

export function normalizeKey(val: string): string {
  return String(val || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

export interface ExtractedDateRange {
  isRange: boolean;
  start: string;
  end: string;
  daysCount: number;
}

export function parseSingleDate(val: string): string | null {
  if (!val) return null;
  const s = String(val).trim();
  const iso = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (tr) return `${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export function extractDateRange(val: string): ExtractedDateRange | null {
  if (!val) return null;
  const s = String(val).trim();
  const rangeMatch = s.match(/(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})\s*(?:-|to|\/|–|ile)\s*(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})/i);
  if (rangeMatch) {
    const d1 = parseSingleDate(rangeMatch[1]);
    const d2 = parseSingleDate(rangeMatch[2]);
    if (d1 && d2) {
      const start = d1 <= d2 ? d1 : d2;
      const end = d1 <= d2 ? d2 : d1;
      const t1 = new Date(start).getTime();
      const t2 = new Date(end).getTime();
      const daysCount = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)) + 1);
      return { isRange: true, start, end, daysCount };
    }
  }
  const single = parseSingleDate(s);
  if (single) return { isRange: false, start: single, end: single, daysCount: 1 };
  return null;
}

export function extractDatesFromFileName(fileName: string): { start: string; end: string } | null {
  if (!fileName) return null;
  const match = fileName.match(/(\d{4}[-_]\d{2}[-_]\d{2})[^\d]+(\d{4}[-_]\d{2}[-_]\d{2})/);
  if (match) {
    const s1 = match[1].replace(/_/g, '-');
    const s2 = match[2].replace(/_/g, '-');
    return { start: s1 <= s2 ? s1 : s2, end: s1 <= s2 ? s2 : s1 };
  }
  return null;
}

export function parseRawCsv(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const counts = {
    ';': (firstLine.match(/;/g) || []).length,
    ',': (firstLine.match(/,/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
    '|': (firstLine.match(/\|/g) || []).length,
  };
  let sep = ',';
  let maxCount = counts[','];
  for (const [k, v] of Object.entries(counts)) {
    if (v > maxCount) {
      maxCount = v;
      sep = k;
    }
  }

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

function findHeaderIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.some((c) => h.includes(c)));
}

function findNumberInObject(obj: Record<string, number>, candidates: string[]): number {
  for (const [k, v] of Object.entries(obj)) {
    if (candidates.some((c) => k.includes(c))) return v;
  }
  return 0;
}

export function parseAnyTableData(grid: string[][], fileName = 'rapor.csv'): UniversalParseResult {
  if (!grid || grid.length < 1) throw new Error('Dosya içeriği boş veya geçersiz.');
  const cleanGrid = grid.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (cleanGrid.length === 0) throw new Error('Dosyada geçerli veri satırı bulunamadı.');

  const firstRowNorm = cleanGrid[0].map(normalizeKey);
  const isKeyValueHeader =
    firstRowNorm.some((h) => ['metrik', 'metric', 'parametre', 'ozellik', 'anahtar', 'key'].includes(h)) ||
    (cleanGrid.length >= 3 && cleanGrid[0].length <= 3 &&
      cleanGrid.some((r) => ['ciro', 'harcama', 'harcanan', 'siparis', 'roas'].includes(normalizeKey(r[0]))));

  if (isKeyValueHeader) {
    return parseKeyValueVerticalTable(cleanGrid, fileName);
  }
  return parseHorizontalTable(cleanGrid, fileName);
}

function parseKeyValueVerticalTable(grid: string[][], fileName: string): UniversalParseResult {
  const kv: Record<string, number> = {};
  let customDateRange: ExtractedDateRange | null = null;

  for (const row of grid) {
    if (row.length < 2) continue;
    const key = normalizeKey(row[0]);
    const rawVal = row[1];
    if (key.includes('tarih') || key.includes('date') || key.includes('donem')) {
      const extracted = extractDateRange(rawVal);
      if (extracted) customDateRange = extracted;
    }
    kv[key] = parseUniversalNumber(rawVal);
  }

  const revenue = findNumberInObject(kv, ['ciro', 'gelir', 'revenue', 'sales', 'satis', 'toplamciro']);
  const spend = findNumberInObject(kv, ['harcanan', 'harcama', 'spend', 'cost', 'maliyet', 'reklamharcamasi']);
  const orders = findNumberInObject(kv, ['siparis', 'orders', 'siparissayisi', 'donusum', 'conversions']);
  const followers = findNumberInObject(kv, ['takipci', 'follower', 'followers']);
  const basket = findNumberInObject(kv, ['sepet', 'sepettutari', 'basket', 'cart']);
  const roas = findNumberInObject(kv, ['roas', 'getiri']) || (spend > 0 ? revenue / spend : 0);

  const fileNameDates = extractDatesFromFileName(fileName);
  const start = customDateRange?.start || fileNameDates?.start || '2026-09-01';
  const end = customDateRange?.end || fileNameDates?.end || '2026-09-30';
  const daysCount = customDateRange?.daysCount || 30;

  const rows: NormalizedMetricRow[] = [];
  const cur = new Date(start);
  const endDateObj = new Date(end);
  const dailySpend = Math.round((spend / daysCount) * 100) / 100;
  const dailyRevenue = Math.round((revenue / daysCount) * 100) / 100;
  const dailyOrders = Math.max(1, Math.round(orders / daysCount));

  while (cur <= endDateObj) {
    const dStr = cur.toISOString().split('T')[0];
    rows.push({
      date: dStr,
      platform: 'Meta Ads',
      campaign: 'Özet Reklam Verisi',
      spend: dailySpend,
      revenue: dailyRevenue,
      orders: dailyOrders,
      impressions: Math.round(dailySpend * 25),
      clicks: Math.round(dailySpend * 1.5),
      conversions: dailyOrders,
      roas,
      basket,
      followers,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return {
    rows,
    dateStart: start,
    dateEnd: end,
    totalSpend: spend,
    totalRevenue: revenue,
    totalOrders: orders,
    totalImpressions: rows.reduce((s, r) => s + r.impressions, 0),
    totalClicks: rows.reduce((s, r) => s + r.clicks, 0),
    platforms: ['Meta Ads'],
    detectedType: 'key_value_vertical',
  };
}

function parseHorizontalTable(grid: string[][], fileName: string): UniversalParseResult {
  const headers = grid[0].map(normalizeKey);
  const rawHeaders = grid[0];

  const colIndex = {
    date: findHeaderIndex(headers, ['tarih', 'date', 'gun', 'day', 'donem', 'time']),
    spend: findHeaderIndex(headers, ['harcama', 'spend', 'cost', 'maliyet', 'amountspent', 'butce', 'harcanan']),
    revenue: findHeaderIndex(headers, ['ciro', 'gelir', 'revenue', 'sales', 'satis', 'totalrevenue', 'toplamciro']),
    orders: findHeaderIndex(headers, ['siparis', 'orders', 'ordercount', 'siparissayisi', 'adet', 'conversions']),
    platform: findHeaderIndex(headers, ['platform', 'kanal', 'channel', 'network', 'kaynak', 'source']),
    campaign: findHeaderIndex(headers, ['kampanya', 'campaign', 'adset', 'reklam', 'adname', 'name']),
    impressions: findHeaderIndex(headers, ['gosterim', 'impressions', 'impr', 'views', 'reach']),
    clicks: findHeaderIndex(headers, ['tiklama', 'clicks', 'click', 'linkclicks']),
    roas: findHeaderIndex(headers, ['roas', 'getiri']),
    basket: findHeaderIndex(headers, ['sepet', 'sepettutari', 'basket', 'cart']),
    followers: findHeaderIndex(headers, ['takipci', 'followers', 'follower']),
  };

  const hasMetric = colIndex.spend >= 0 || colIndex.revenue >= 0 || colIndex.orders >= 0;
  if (!hasMetric) {
    throw new Error(
      `Tablo sütunları tanınamadı. Başlıklar: [${rawHeaders.slice(0, 8).join(', ')}]. ` +
      `Gereken en az bir metrik: Harcama/Spend, Ciro/Revenue veya Sipariş/Orders.`
    );
  }

  const fileNameDates = extractDatesFromFileName(fileName);
  const fallbackDate = fileNameDates?.start || new Date().toISOString().split('T')[0];

  const rows: NormalizedMetricRow[] = [];
  const platformsSet = new Set<string>();

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length === 0 || !row.some(Boolean)) continue;

    const rawDate = colIndex.date >= 0 ? row[colIndex.date] : '';
    const dateRange = extractDateRange(rawDate);

    const spend = colIndex.spend >= 0 ? parseUniversalNumber(row[colIndex.spend]) : 0;
    const revenue = colIndex.revenue >= 0 ? parseUniversalNumber(row[colIndex.revenue]) : 0;
    const orders = colIndex.orders >= 0 ? parseUniversalNumber(row[colIndex.orders]) : 0;
    const impressions = colIndex.impressions >= 0 ? parseUniversalNumber(row[colIndex.impressions]) : 0;
    const clicks = colIndex.clicks >= 0 ? parseUniversalNumber(row[colIndex.clicks]) : 0;
    const roas = colIndex.roas >= 0 ? parseUniversalNumber(row[colIndex.roas]) : (spend > 0 ? revenue / spend : 0);
    const basket = colIndex.basket >= 0 ? parseUniversalNumber(row[colIndex.basket]) : 0;
    const followers = colIndex.followers >= 0 ? parseUniversalNumber(row[colIndex.followers]) : 0;

    let platform = (colIndex.platform >= 0 ? row[colIndex.platform] : '').trim();
    if (!platform) platform = 'Meta Ads';
    platformsSet.add(platform);

    let campaign = (colIndex.campaign >= 0 ? row[colIndex.campaign] : '').trim();
    if (!campaign) campaign = 'Yüklenen Kampanya';

    if (dateRange && dateRange.isRange && dateRange.daysCount > 1) {
      const cur = new Date(dateRange.start);
      const endObj = new Date(dateRange.end);
      const dCount = dateRange.daysCount;
      const dSpend = Math.round((spend / dCount) * 100) / 100;
      const dRevenue = Math.round((revenue / dCount) * 100) / 100;
      const dOrders = Math.max(0, Math.round(orders / dCount));
      const dImpr = Math.round(impressions / dCount);
      const dClicks = Math.round(clicks / dCount);

      while (cur <= endObj) {
        rows.push({
          date: cur.toISOString().split('T')[0],
          platform,
          campaign,
          spend: dSpend,
          revenue: dRevenue,
          orders: dOrders,
          impressions: dImpr,
          clicks: dClicks,
          conversions: dOrders,
          roas,
          basket,
          followers,
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const date = dateRange?.start || fallbackDate;
      rows.push({
        date,
        platform,
        campaign,
        spend,
        revenue,
        orders,
        impressions,
        clicks,
        conversions: orders,
        roas,
        basket,
        followers,
      });
    }
  }

  if (rows.length === 0) throw new Error('Dosyadaki satırlardan geçerli metrik çıkarılamadı.');

  const allDates = rows.map((r) => r.date).sort();
  return {
    rows,
    dateStart: allDates[0],
    dateEnd: allDates[allDates.length - 1],
    totalSpend: rows.reduce((s, r) => s + r.spend, 0),
    totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    totalOrders: rows.reduce((s, r) => s + r.orders, 0),
    totalImpressions: rows.reduce((s, r) => s + r.impressions, 0),
    totalClicks: rows.reduce((s, r) => s + r.clicks, 0),
    platforms: [...platformsSet],
    detectedType: 'standard_horizontal',
  };
}
