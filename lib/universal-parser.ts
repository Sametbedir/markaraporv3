/**
 * UNIVERSAL DATA PARSER (markarapor_v3)
 *
 * Her türlü CSV, Excel (XLSX, XLS), TSV veya TXT dosyasını akıllıca ayrıştırır.
 *
 * Desteklenen Formatlar:
 * 1. Aylık Tablolar (Ay: Ocak, Şubat, Mart..., Reklam Harcaması, Toplam Ciro, ROAS, Sepet, Alışveriş, Takipçi)
 * 2. Yatay Standart Günlük Tablolar (Tarih, Harcama, Ciro, Sipariş...)
 * 3. Dikey (Key-Value) Tablolar (Metrik, Değer, Birim)
 * 4. Tarih Aralıklı Satırlar (01.09.2026-30.09.2026)
 * 5. Tarih Sütunu Olmayan Kampanya Tabloları (Tarihi dosya adından çıkaran)
 * 6. Noktalı virgül (;), virgül (,), sekme (\t) veya pipe (|) ayracı
 * 7. Türkçe ve yabancı para/sayı formatları (624.662₺, ₺2.449.050, 5 173.654,12, 20,275.11, 20.275,11)
 * 8. Toplam / Dip Toplam satırlarını otomatik tespit edip çift saymayı engelleme
 */

export interface NormalizedMetricRow {
  date: string; // YYYY-MM-DD
  monthName?: string; // Örn: "Ocak", "Şubat", "Eylül"
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

export interface MonthlyItem {
  month: string;
  year: number;
  spend: number;
  revenue: number;
  orders: number;
  roas: number;
  basket: number;
  followers: number;
  aov: number;
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
  totalBasket?: number;
  totalFollowers?: number;
  platforms: string[];
  detectedType: 'standard_horizontal' | 'monthly_table' | 'key_value_vertical' | 'date_range_spread' | 'no_date_campaigns';
  monthlyBreakdown?: MonthlyItem[];
}

/* ─────────────────────────────────────────────────────────────
   1. Gelişmiş Sayı Ayıklayıcı (Türkçe / İngilizce / Para Birimleri)
───────────────────────────────────────────────────────────── */
export function parseUniversalNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let str = String(value).trim();
  // Para birimleri, birimler ve gereksiz karakterleri temizle
  str = str.replace(/₺|TL|TRY|\$|€|£|x|%|adet|gün|\/gün|\/day|users|kisi/gi, '').trim();

  if (!str) return 0;

  // Boşluklu binlik ayraçları (örn: 215 209 veya 5 173.654,12)
  if (/\d+\s+\d+/.test(str)) {
    str = str.replace(/\s+/g, '');
  }

  // Nokta ve virgül ayracı analizi
  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.234,56 formatı
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 formatı
      str = str.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Sadece virgül var
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Ondalık: "2,9" veya "2,74" veya "20,50"
      str = str.replace(',', '.');
    } else {
      // Binlik ayraç: "624,662"
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    // Sadece nokta var
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      // 624.662 formatı -> 624662
      str = str.replace(/\./g, '');
    } else if (parts.length > 2) {
      // 2.449.050 formatı -> 2449050
      str = str.replace(/\./g, '');
    }
  }

  const num = Number(str.replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

/* ─────────────────────────────────────────────────────────────
   2. Başlık Normalizasyonu (Türkçe karakter ve semantik eşleme)
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   3. Ay İsimleri ve Tarih Çözümleyici
───────────────────────────────────────────────────────────── */
const MONTH_MAP: Record<string, { num: number; days: number; name: string }> = {
  ocak: { num: 1, days: 31, name: 'Ocak' },
  subat: { num: 2, days: 28, name: 'Şubat' },
  mart: { num: 3, days: 31, name: 'Mart' },
  nisan: { num: 4, days: 30, name: 'Nisan' },
  mayis: { num: 5, days: 31, name: 'Mayıs' },
  haziran: { num: 6, days: 30, name: 'Haziran' },
  temmuz: { num: 7, days: 31, name: 'Temmuz' },
  agustos: { num: 8, days: 31, name: 'Ağustos' },
  eylul: { num: 9, days: 30, name: 'Eylül' },
  ekim: { num: 10, days: 31, name: 'Ekim' },
  kasim: { num: 11, days: 30, name: 'Kasım' },
  aralik: { num: 12, days: 31, name: 'Aralık' },
  jan: { num: 1, days: 31, name: 'Ocak' },
  january: { num: 1, days: 31, name: 'Ocak' },
  feb: { num: 2, days: 28, name: 'Şubat' },
  february: { num: 2, days: 28, name: 'Şubat' },
  mar: { num: 3, days: 31, name: 'Mart' },
  march: { num: 3, days: 31, name: 'Mart' },
  apr: { num: 4, days: 30, name: 'Nisan' },
  april: { num: 4, days: 30, name: 'Nisan' },
  may: { num: 5, days: 31, name: 'Mayıs' },
  jun: { num: 6, days: 30, name: 'Haziran' },
  june: { num: 6, days: 30, name: 'Haziran' },
  jul: { num: 7, days: 31, name: 'Temmuz' },
  july: { num: 7, days: 31, name: 'Temmuz' },
  aug: { num: 8, days: 31, name: 'Ağustos' },
  august: { num: 8, days: 31, name: 'Ağustos' },
  sep: { num: 9, days: 30, name: 'Eylül' },
  september: { num: 9, days: 30, name: 'Eylül' },
  oct: { num: 10, days: 31, name: 'Ekim' },
  october: { num: 10, days: 31, name: 'Ekim' },
  nov: { num: 11, days: 30, name: 'Kasım' },
  november: { num: 11, days: 30, name: 'Kasım' },
  dec: { num: 12, days: 31, name: 'Aralık' },
  december: { num: 12, days: 31, name: 'Aralık' },
};

export interface ExtractedDateRange {
  isRange: boolean;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  daysCount: number;
  monthName?: string;
  year?: number;
}

export function extractDateRange(val: string, defaultYear = 2026): ExtractedDateRange | null {
  if (!val) return null;
  const s = String(val).trim();
  const norm = normalizeKey(s);

  // A. Ay İsmi Kontrolü (Örn: "Ocak", "Şubat 2026", "2026 Eylül")
  for (const [mKey, mInfo] of Object.entries(MONTH_MAP)) {
    if (norm.includes(mKey)) {
      // Yıl çıkar (örn: "Eylül 2026" veya "2025-Ocak")
      const yearMatch = s.match(/(20\d{2})/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : defaultYear;
      const mm = String(mInfo.num).padStart(2, '0');
      const lastDay = String(mInfo.days).padStart(2, '0');

      return {
        isRange: true,
        start: `${year}-${mm}-01`,
        end: `${year}-${mm}-${lastDay}`,
        daysCount: mInfo.days,
        monthName: mInfo.name,
        year,
      };
    }
  }

  // B. İki tarih aralığı kontrolü (Örn: "01.09.2026-30.09.2026" veya "2026-09-01 - 2026-09-30")
  const rangeMatch = s.match(
    /(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})\s*(?:-|to|\/|–|ile)\s*(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})/i
  );
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

  // C. Tekil tarih
  const single = parseSingleDate(s);
  if (single) {
    return { isRange: false, start: single, end: single, daysCount: 1 };
  }

  return null;
}

export function parseSingleDate(val: string): string | null {
  if (!val) return null;
  const s = String(val).trim();

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }

  // DD.MM.YYYY veya DD/MM/YYYY
  const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (tr) {
    return `${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────
   4. Dosya Adından Tarih Çıkarma
───────────────────────────────────────────────────────────── */
export function extractDatesFromFileName(fileName: string): { start: string; end: string; year?: number } | null {
  if (!fileName) return null;
  const match = fileName.match(/(\d{4}[-_]\d{2}[-_]\d{2})[^\d]+(\d{4}[-_]\d{2}[-_]\d{2})/);
  if (match) {
    const s1 = match[1].replace(/_/g, '-');
    const s2 = match[2].replace(/_/g, '-');
    return { start: s1 <= s2 ? s1 : s2, end: s1 <= s2 ? s2 : s1 };
  }
  const yearMatch = fileName.match(/(20\d{2})/);
  if (yearMatch) {
    return {
      start: `${yearMatch[1]}-01-01`,
      end: `${yearMatch[1]}-12-31`,
      year: parseInt(yearMatch[1], 10),
    };
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────
   5. CSV Ayrıştırıcı (Akıllı Ayraç Tespiti)
───────────────────────────────────────────────────────────── */
export function parseRawCsv(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const firstLine = text.split(/\r?\n/)[0] ?? '';
  // Ayraç oylaması: hangisi daha çok geçiyor?
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

/* ─────────────────────────────────────────────────────────────
   6. ANA AYRIŞTIRICI FONKSİYON (Universal Parse)
───────────────────────────────────────────────────────────── */
export function parseAnyTableData(
  grid: string[][],
  fileName = 'rapor.csv'
): UniversalParseResult {
  if (!grid || grid.length < 1) {
    throw new Error('Dosya içeriği boş veya geçersiz.');
  }

  // Boş satırları filtrele
  const cleanGrid = grid.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (cleanGrid.length === 0) {
    throw new Error('Dosyada geçerli veri satırı bulunamadı.');
  }

  /* -------------------------------------------------------------
     DURUM A: DİKEY (KEY-VALUE) TABLO TESPİTİ
  ------------------------------------------------------------- */
  const firstRowNorm = cleanGrid[0].map(normalizeKey);
  const isKeyValueHeader =
    firstRowNorm.some((h) => ['metrik', 'metric', 'parametre', 'ozellik', 'anahtar', 'key'].includes(h)) ||
    (cleanGrid.length >= 3 && cleanGrid[0].length <= 3 &&
      cleanGrid.some((r) => ['ciro', 'harcama', 'harcanan', 'siparis', 'roas'].includes(normalizeKey(r[0]))));

  if (isKeyValueHeader) {
    return parseKeyValueVerticalTable(cleanGrid, fileName);
  }

  /* -------------------------------------------------------------
     DURUM B: YATAY TABLO (Klasik, Aylık veya Tarih Aralıklı)
  ------------------------------------------------------------- */
  return parseHorizontalTable(cleanGrid, fileName);
}

/* ─────────────────────────────────────────────────────────────
   A1. Dikey Tablo Ayrıştırıcısı
───────────────────────────────────────────────────────────── */
function parseKeyValueVerticalTable(grid: string[][], fileName: string): UniversalParseResult {
  const kv: Record<string, number> = {};
  let customDateRange: ExtractedDateRange | null = null;

  for (const row of grid) {
    if (row.length < 2) continue;
    const key = normalizeKey(row[0]);
    const rawVal = row[1];

    // Tarih kontrolü
    if (key.includes('tarih') || key.includes('date') || key.includes('donem') || key.includes('ay')) {
      const extracted = extractDateRange(rawVal);
      if (extracted) customDateRange = extracted;
    }

    const num = parseUniversalNumber(rawVal);
    kv[key] = num;
  }

  // Metrikleri topla
  const revenue = findNumberInObject(kv, ['ciro', 'gelir', 'revenue', 'sales', 'satis', 'toplamciro']);
  const spend = findNumberInObject(kv, ['harcanan', 'harcama', 'spend', 'cost', 'maliyet', 'reklamharcamasi']);
  const orders = findNumberInObject(kv, ['siparis', 'orders', 'siparissayisi', 'alisveris', 'alisverissayisi', 'donusum', 'conversions']);
  const followers = findNumberInObject(kv, ['takipci', 'gelentakipci', 'follower', 'followers']);
  const basket = findNumberInObject(kv, ['sepet', 'sepettutari', 'sepetdonusum', 'basket', 'cart']);
  const roas = findNumberInObject(kv, ['roas', 'getiri']) || (spend > 0 ? revenue / spend : 0);

  // Tarih aralığı belirle
  const fileNameDates = extractDatesFromFileName(fileName);
  const start = customDateRange?.start || fileNameDates?.start || '2026-09-01';
  const end = customDateRange?.end || fileNameDates?.end || '2026-09-30';
  const daysCount = customDateRange?.daysCount || 30;

  // Günlük satırlara yay (Trend grafiği ve detaylar için)
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
    totalBasket: basket,
    totalFollowers: followers,
    platforms: ['Meta Ads'],
    detectedType: 'key_value_vertical',
  };
}

/* ─────────────────────────────────────────────────────────────
   B1. Yatay Tablo Ayrıştırıcısı (Aylık & Günlük & Kampanya)
───────────────────────────────────────────────────────────── */
function parseHorizontalTable(grid: string[][], fileName: string): UniversalParseResult {
  const headers = grid[0].map(normalizeKey);
  const rawHeaders = grid[0];

  // Sütun İndekslerini Haritala (Genişletilmiş Semantik Eşleşme)
  const colIndex = {
    date: findHeaderIndex(headers, [
      'ay', 'month', 'tarih', 'date', 'gun', 'day', 'donem', 'time', 'hafta', 'week', 'period',
    ]),
    spend: findHeaderIndex(headers, [
      'reklamharcamasi', 'harcamalar', 'harcama', 'harcanan', 'spend', 'cost', 'maliyet', 'amountspent', 'butce', 'adspend',
    ]),
    revenue: findHeaderIndex(headers, [
      'toplamciro', 'ciro', 'gelir', 'revenue', 'sales', 'satis', 'totalrevenue', 'kazanc',
    ]),
    orders: findHeaderIndex(headers, [
      'alisverissayisi', 'alisveris', 'siparis', 'siparissayisi', 'orders', 'ordercount', 'purchases', 'adet', 'conversions',
    ]),
    platform: findHeaderIndex(headers, [
      'platform', 'kanal', 'channel', 'network', 'kaynak', 'source',
    ]),
    campaign: findHeaderIndex(headers, [
      'kampanya', 'campaign', 'adset', 'reklam', 'adname', 'name',
    ]),
    impressions: findHeaderIndex(headers, [
      'gosterim', 'impressions', 'impr', 'views', 'reach',
    ]),
    clicks: findHeaderIndex(headers, [
      'tiklama', 'clicks', 'click', 'linkclicks',
    ]),
    roas: findHeaderIndex(headers, [
      'roasgetiriorani', 'roasgetiri', 'getiriorani', 'roas', 'getiri',
    ]),
    basket: findHeaderIndex(headers, [
      'sepetdonusumtutari', 'sepetdonusum', 'sepettutari', 'sepet', 'basket', 'cart',
    ]),
    followers: findHeaderIndex(headers, [
      'gelentakipcireklam', 'gelentakipci', 'takipci', 'followers', 'follower',
    ]),
  };

  // En azından harcama veya ciro veya sipariş bulunabilmeli
  const hasMetric = colIndex.spend >= 0 || colIndex.revenue >= 0 || colIndex.orders >= 0;
  if (!hasMetric) {
    throw new Error(
      `Tablo sütunları tanınamadı. Başlıklar: [${rawHeaders.slice(0, 8).join(', ')}]. ` +
      `Gereken en az bir metrik: Harcama/Spend, Ciro/Revenue veya Sipariş/Orders.`
    );
  }

  const fileNameDates = extractDatesFromFileName(fileName);
  const defaultYear = fileNameDates?.year || new Date().getFullYear();
  const fallbackDate = fileNameDates?.start || `${defaultYear}-09-01`;

  const rows: NormalizedMetricRow[] = [];
  const monthlyItems: MonthlyItem[] = [];
  const platformsSet = new Set<string>();
  let hasMonthlyFormat = false;

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length === 0 || !row.some(Boolean)) continue;

    // Satırın ilk veya herhangi bir hücresinde "Toplam", "Genel Toplam", "Total" kontrolü
    const firstCellNorm = normalizeKey(row[0] || '');
    if (
      firstCellNorm.includes('toplam') ||
      firstCellNorm.includes('total') ||
      firstCellNorm.includes('genel') ||
      firstCellNorm.includes('ortalama') ||
      firstCellNorm.includes('summary')
    ) {
      // Toplam satırını veri satırı olarak ekleme (çift toplam oluşmasını engelle)
      continue;
    }

    // İlk hücre boş ama diğer sütunlarda toplam sayıları varsa yine atla
    if (!row[0] && colIndex.date === 0) {
      continue;
    }

    // Tarih veya Ay Çözümleme
    const rawDate = colIndex.date >= 0 ? row[colIndex.date] : '';
    const dateRange = extractDateRange(rawDate, defaultYear);

    const spend = colIndex.spend >= 0 ? parseUniversalNumber(row[colIndex.spend]) : 0;
    const revenue = colIndex.revenue >= 0 ? parseUniversalNumber(row[colIndex.revenue]) : 0;
    const orders = colIndex.orders >= 0 ? parseUniversalNumber(row[colIndex.orders]) : 0;
    const impressions = colIndex.impressions >= 0 ? parseUniversalNumber(row[colIndex.impressions]) : 0;
    const clicks = colIndex.clicks >= 0 ? parseUniversalNumber(row[colIndex.clicks]) : 0;
    const parsedRoas = colIndex.roas >= 0 ? parseUniversalNumber(row[colIndex.roas]) : 0;
    const roas = parsedRoas > 0 ? parsedRoas : (spend > 0 ? Number((revenue / spend).toFixed(2)) : 0);
    const basket = colIndex.basket >= 0 ? parseUniversalNumber(row[colIndex.basket]) : 0;
    const followers = colIndex.followers >= 0 ? parseUniversalNumber(row[colIndex.followers]) : 0;

    // Eğer tamamen sıfırlardan oluşan bir satırsa (örneğin henüz gelmemiş aylar: Ekim 0, Kasım 0, Aralık 0)
    const isAllZero = spend === 0 && revenue === 0 && orders === 0 && roas === 0;

    let platform = (colIndex.platform >= 0 ? row[colIndex.platform] : '').trim();
    if (!platform) platform = 'Meta Ads';
    platformsSet.add(platform);

    let campaign = (colIndex.campaign >= 0 ? row[colIndex.campaign] : '').trim();
    if (!campaign) {
      campaign = dateRange?.monthName ? `${dateRange.monthName} Kampanyası` : 'Genel Kampanya';
    }

    // Ay Tablosu tespiti
    if (dateRange?.monthName) {
      hasMonthlyFormat = true;
      monthlyItems.push({
        month: dateRange.monthName,
        year: dateRange.year || defaultYear,
        spend,
        revenue,
        orders,
        roas,
        basket,
        followers,
        aov: orders > 0 ? Math.round(revenue / orders) : 0,
      });

      // Eğer tüm değerler 0 ise günlük satırlara yaymaya gerek yok
      if (isAllZero) {
        continue;
      }
    }

    // Eğer tarih aralığı ise (örn: Ocak 31 gün veya 01.09.2026-30.09.2026), günlere yay
    if (dateRange && dateRange.isRange && dateRange.daysCount > 1) {
      const cur = new Date(dateRange.start);
      const endObj = new Date(dateRange.end);
      const dCount = dateRange.daysCount;

      const dSpend = Math.round((spend / dCount) * 100) / 100;
      const dRevenue = Math.round((revenue / dCount) * 100) / 100;
      const dOrders = Math.max(0, Math.round(orders / dCount));
      const dImpr = impressions > 0 ? Math.round(impressions / dCount) : Math.round(dSpend * 25);
      const dClicks = clicks > 0 ? Math.round(clicks / dCount) : Math.round(dSpend * 1.5);

      while (cur <= endObj) {
        rows.push({
          date: cur.toISOString().split('T')[0],
          monthName: dateRange.monthName,
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
      // Tekil tarih veya fallback
      const date = dateRange?.start || fallbackDate;
      rows.push({
        date,
        monthName: dateRange?.monthName,
        platform,
        campaign,
        spend,
        revenue,
        orders,
        impressions: impressions > 0 ? impressions : Math.round(spend * 25),
        clicks: clicks > 0 ? clicks : Math.round(spend * 1.5),
        conversions: orders,
        roas,
        basket,
        followers,
      });
    }
  }

  if (rows.length === 0 && monthlyItems.length === 0) {
    throw new Error('Dosyadaki satırlardan geçerli metrik çıkarılamadı.');
  }

  // Tarih Aralığı Belirle
  const allDates = rows.map((r) => r.date).sort();
  const dateStart = allDates[0] || `${defaultYear}-01-01`;
  const dateEnd = allDates[allDates.length - 1] || `${defaultYear}-12-31`;

  // Toplamları hesapla
  // Eğer monthly tablosuysa, doğrudan monthlyItems (sıfır olmayanlar) üzerinden toplam almak en doğrusu!
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalBasket = 0;
  let totalFollowers = 0;

  if (hasMonthlyFormat && monthlyItems.length > 0) {
    totalSpend = monthlyItems.reduce((s, m) => s + m.spend, 0);
    totalRevenue = monthlyItems.reduce((s, m) => s + m.revenue, 0);
    totalOrders = monthlyItems.reduce((s, m) => s + m.orders, 0);
    totalBasket = monthlyItems.reduce((s, m) => s + m.basket, 0);
    totalFollowers = monthlyItems.reduce((s, m) => s + m.followers, 0);
    totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
    totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  } else {
    totalSpend = rows.reduce((s, r) => s + r.spend, 0);
    totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    totalOrders = rows.reduce((s, r) => s + r.orders, 0);
    totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
    totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
    totalBasket = rows.reduce((s, r) => s + (r.basket || 0), 0);
    totalFollowers = rows.reduce((s, r) => s + (r.followers || 0), 0);
  }

  return {
    rows,
    dateStart,
    dateEnd,
    totalSpend,
    totalRevenue,
    totalOrders,
    totalImpressions,
    totalClicks,
    totalBasket,
    totalFollowers,
    platforms: [...platformsSet],
    detectedType: hasMonthlyFormat ? 'monthly_table' : 'standard_horizontal',
    monthlyBreakdown: monthlyItems.length > 0 ? monthlyItems : undefined,
  };
}

/* ─────────────────────────────────────────────────────────────
   Yardımcı Fonksiyonlar
───────────────────────────────────────────────────────────── */
function findHeaderIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.some((c) => h.includes(c)));
}

function findNumberInObject(obj: Record<string, number>, candidates: string[]): number {
  for (const [k, v] of Object.entries(obj)) {
    if (candidates.some((c) => k.includes(c))) {
      return v;
    }
  }
  return 0;
}
