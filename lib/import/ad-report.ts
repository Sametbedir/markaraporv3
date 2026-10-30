/**
 * Reklam platformu raporunu (Meta, Google, TikTok veya elle hazırlanmış tablo) okur.
 *
 * Girdi: ilk satırlarından biri başlık olan hücre tablosu (CSV'den string, Excel'den string/number/Date).
 * Çıktı: kampanya-gün bazında satırlar ve kullanıcıya gösterilecek eşleme/eksik alan/uyarı raporu.
 *
 * Bu modül veritabanına dokunmaz ve hiçbir eksik değeri tahminle doldurmaz.
 */

import { parseDate } from './dates';
import {
  AdField,
  FIELD_LABELS,
  HeaderMapping,
  METRIC_FIELDS,
  MetricField,
  detectPlatformFromHeaders,
  mapHeaders,
  normalizeCurrency,
  normalizeHeader,
} from './headers';
import { DecimalStyle, detectDecimalStyle, parseNumber } from './numbers';

export type AdRow = {
  date: string;
  /** Satır tek bir günü değil bir aralığı kapsıyorsa bitiş tarihi, aksi halde null */
  dateEnd: string | null;
  platform: string | null;
  campaign: string | null;
  spend: number | null;
  conversionValue: number | null;
  conversions: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  /** Markaya özel metrikler (anahtar → değer); dosyada boşsa null */
  custom: Record<string, number | null>;
  /** Bu satırı oluşturan dosya satır numaraları (1'den başlar, başlık dahil) */
  sourceRows: number[];
};

export type ImportIssue = { code: string; message: string; rows: number[] };

/** Sütunu toplanarak saklanan markaya özel metrik (örn. "Potansiyel müşteriler"). */
export type CustomColumn = { index: number; key: string; label: string };

/** Kullanıcının önizleme ekranında onayladığı eşleme; verilmezse başlıklar otomatik eşlenir. */
export type ColumnMapping = {
  headerRowIndex: number;
  fields: Partial<Record<AdField, number>>;
  custom: CustomColumn[];
};

export type AdReportResult = {
  ok: boolean;
  rows: AdRow[];
  mapping: Partial<Record<AdField, string>>;
  customColumns: { key: string; label: string; header: string }[];
  unmappedColumns: string[];
  /** Dosyada hiç bulunmayan metrik alanları. Bu alanlar eksik kabul edilir, 0 değil. */
  missingFields: MetricField[];
  currency: string | null;
  decimalStyle: DecimalStyle;
  dateStart: string | null;
  dateEnd: string | null;
  headerRowNumber: number | null;
  mergedRowCount: number;
  warnings: ImportIssue[];
  errors: string[];
};

const COUNT_FIELDS: MetricField[] = ['conversions', 'impressions', 'clicks', 'reach'];
const MAX_HEADER_SCAN = 10;

class IssueCollector {
  private map = new Map<string, ImportIssue>();
  add(code: string, message: string, row?: number) {
    const issue = this.map.get(code) ?? { code, message, rows: [] };
    if (row !== undefined) issue.rows.push(row);
    this.map.set(code, issue);
  }
  list() {
    return [...this.map.values()];
  }
}

export function findHeaderRow(table: unknown[][]): { index: number; mapping: HeaderMapping } | null {
  for (let i = 0; i < Math.min(MAX_HEADER_SCAN, table.length); i++) {
    const mapping = mapHeaders(table[i] ?? []);
    const hasDate = mapping.columns.date !== undefined;
    const metricCount = METRIC_FIELDS.filter((f) => mapping.columns[f] !== undefined).length;
    if (hasDate && metricCount >= 1) return { index: i, mapping };
  }
  return null;
}

/** Elle verilen eşlemeyi otomatik eşlemeyle aynı biçime çevirir. */
function explicitHeader(table: unknown[][], m: ColumnMapping): { index: number; mapping: HeaderMapping } {
  const row = table[m.headerRowIndex] ?? [];
  const headers: Partial<Record<AdField, string>> = {};
  const used = new Set<number>(m.custom.map((c) => c.index));
  for (const [field, idx] of Object.entries(m.fields) as [AdField, number][]) {
    headers[field] = String(row[idx] ?? '');
    used.add(idx);
  }
  const headerCurrencies = new Set<string>();
  for (const f of METRIC_FIELDS) {
    const idx = m.fields[f];
    const currency = idx === undefined ? null : normalizeHeader(String(row[idx] ?? '')).currency;
    if (currency) headerCurrencies.add(currency);
  }
  return {
    index: m.headerRowIndex,
    mapping: {
      columns: { ...m.fields },
      headers,
      unmapped: row.map((h, i) => ({ h: String(h ?? '').trim(), i })).filter(({ h, i }) => h && !used.has(i)).map(({ h }) => h),
      headerCurrencies: [...headerCurrencies],
    },
  };
}

function isTotalRow(cells: unknown[]): boolean {
  return cells.some((c) => typeof c === 'string' && /^\s*(toplam|total|genel toplam|grand total)\b/i.test(c));
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return a + b;
}

export function parseAdReport(table: unknown[][], options: { mapping?: ColumnMapping } = {}): AdReportResult {
  const issues = new IssueCollector();
  const empty: AdReportResult = {
    ok: false,
    rows: [],
    mapping: {},
    customColumns: [],
    unmappedColumns: [],
    missingFields: [...METRIC_FIELDS],
    currency: null,
    decimalStyle: 'comma',
    dateStart: null,
    dateEnd: null,
    headerRowNumber: null,
    mergedRowCount: 0,
    warnings: [],
    errors: [],
  };

  const custom = options.mapping?.custom ?? [];
  if (options.mapping) {
    const m = options.mapping;
    const hasMetric = METRIC_FIELDS.some((f) => m.fields[f] !== undefined) || custom.length > 0;
    if (m.fields.date === undefined || !hasMetric || !table[m.headerRowIndex]) {
      empty.errors.push('Eşlemede bir tarih sütunu ve en az bir metrik (veya özel metrik) sütunu seçilmeli.');
      return empty;
    }
  }

  const header = options.mapping ? explicitHeader(table, options.mapping) : findHeaderRow(table);
  if (!header) {
    const firstRow = (table[0] ?? []).map((c) => String(c ?? '').trim()).filter(Boolean).slice(0, 10);
    empty.errors.push(
      `Başlık satırı bulunamadı. En az bir tarih sütunu ve bir metrik sütunu (harcama, gösterim, dönüşüm değeri…) gerekli. ` +
        `İlk satırdaki sütunlar: [${firstRow.join(', ')}]`
    );
    return empty;
  }

  const { columns, headers, unmapped, headerCurrencies } = header.mapping;
  const dataRows = table.slice(header.index + 1);

  // Platform sütunu yoksa Meta/Google dışa aktarımlarını başlıklarından tanı
  const inferredPlatform = columns.platform === undefined ? detectPlatformFromHeaders(table[header.index] ?? []) : null;
  if (inferredPlatform) {
    issues.add('platform_inferred', `Dosyada platform sütunu yok; başlıklardan "${inferredPlatform}" olarak tanındı.`);
  }

  // Ondalık stilini metrik sütunlarındaki örneklerden belirle (bulunamazsa Türkçe biçim)
  const samples: unknown[] = [];
  for (const row of dataRows.slice(0, 500)) {
    for (const f of METRIC_FIELDS) {
      const idx = columns[f];
      if (idx !== undefined) samples.push(row[idx]);
    }
    for (const c of custom) samples.push(row[c.index]);
  }
  const detected = detectDecimalStyle(samples);
  const decimalStyle: DecimalStyle = detected ?? 'comma';

  // Para birimi: başlıktaki (TRY) gibi işaretler + varsa para birimi sütunu
  const currencies = new Set(headerCurrencies);
  if (columns.currency !== undefined) {
    for (const row of dataRows) {
      const c = normalizeCurrency(String(row[columns.currency] ?? ''));
      if (c) currencies.add(c);
    }
  }
  if (currencies.size > 1) {
    empty.errors.push(
      `Dosyada birden fazla para birimi var (${[...currencies].join(', ')}). ` +
        `Kur dönüşümü yapılmadığı için her para birimini ayrı dosya olarak yükleyin.`
    );
    return { ...empty, mapping: headers, unmappedColumns: unmapped, headerRowNumber: header.index + 1 };
  }
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  if (!currency) {
    issues.add('currency_missing', 'Para birimi dosyada belirtilmemiş; TRY olduğu varsayılmadı, "bilinmiyor" olarak kaydedilecek.');
  }

  const merged = new Map<string, AdRow>();
  let mergedRowCount = 0;
  let ambiguousSeen = false;

  dataRows.forEach((row, offset) => {
    const rowNumber = header.index + 2 + offset;
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) return;
    const date = parseDate(row[columns.date!]);
    if (!date) {
      if (isTotalRow(row)) issues.add('total_row', 'Toplam satırları atlandı (verinin iki kez sayılmaması için).', rowNumber);
      else issues.add('bad_date', 'Tarihi okunamayan satırlar atlandı.', rowNumber);
      return;
    }
    // Meta gibi platformlar özet satırını tarihli ama kampanya adı boş olarak verir
    if (columns.campaign !== undefined && String(row[columns.campaign] ?? '').trim() === '') {
      issues.add('empty_campaign', 'Kampanya adı boş satırlar atlandı (genellikle raporun toplam satırıdır).', rowNumber);
      return;
    }
    let dateEnd = columns.dateEnd !== undefined ? parseDate(row[columns.dateEnd]) : null;
    if (dateEnd === date) dateEnd = null;
    if (dateEnd) {
      issues.add('range_row', 'Bazı satırlar tek bir günü değil bir tarih aralığını kapsıyor; başlangıç tarihine yazıldı.', rowNumber);
    }

    const metrics = {} as Record<MetricField, number | null>;
    for (const field of METRIC_FIELDS) {
      const idx = columns[field];
      if (idx === undefined) {
        metrics[field] = null;
        continue;
      }
      const parsed = parseNumber(row[idx], decimalStyle);
      if (parsed.invalid) {
        issues.add(`invalid_${field}`, `"${FIELD_LABELS[field]}" sütununda okunamayan değerler eksik sayıldı.`, rowNumber);
      }
      if (parsed.ambiguous) ambiguousSeen = true;
      let value = parsed.value;
      if (value !== null && value < 0) {
        if (COUNT_FIELDS.includes(field)) {
          issues.add(`negative_${field}`, `"${FIELD_LABELS[field]}" negatif olamaz; bu değerler eksik sayıldı.`, rowNumber);
          value = null;
        } else {
          issues.add(`negative_${field}`, `"${FIELD_LABELS[field]}" sütununda negatif değerler var (iade/düzeltme olabilir); olduğu gibi alındı.`, rowNumber);
        }
      }
      metrics[field] = value;
    }

    const customValues: Record<string, number | null> = {};
    for (const c of custom) {
      const parsed = parseNumber(row[c.index], decimalStyle);
      if (parsed.invalid) issues.add(`invalid_custom_${c.key}`, `"${c.label}" sütununda okunamayan değerler eksik sayıldı.`, rowNumber);
      if (parsed.value !== null && parsed.value < 0) {
        issues.add(`negative_custom_${c.key}`, `"${c.label}" sütununda negatif değerler var; olduğu gibi alındı.`, rowNumber);
      }
      if (parsed.ambiguous) ambiguousSeen = true;
      customValues[c.key] = sumNullable(customValues[c.key] ?? null, parsed.value);
    }

    if (METRIC_FIELDS.every((f) => metrics[f] === null) && Object.values(customValues).every((v) => v === null)) {
      issues.add('empty_metrics', 'Hiç metrik değeri olmayan satırlar atlandı.', rowNumber);
      return;
    }

    const platform = columns.platform !== undefined ? String(row[columns.platform] ?? '').trim() || null : inferredPlatform;
    const campaign = columns.campaign !== undefined ? String(row[columns.campaign] ?? '').trim() || null : null;
    const key = [date, dateEnd ?? '', platform ?? '', campaign ?? ''].join('|');

    const existing = merged.get(key);
    if (existing) {
      // Aynı kampanya-gün birden çok satırda (örn. reklam seti kırılımı) → topla
      mergedRowCount++;
      for (const f of METRIC_FIELDS) {
        if ((existing[f] === null) !== (metrics[f] === null)) {
          issues.add('partial_merge', 'Birleştirilen satırların bazılarında değer eksikti; toplam yalnızca mevcut değerlerden oluştu.', rowNumber);
        }
        existing[f] = sumNullable(existing[f], metrics[f]);
      }
      for (const c of custom) existing.custom[c.key] = sumNullable(existing.custom[c.key] ?? null, customValues[c.key] ?? null);
      existing.sourceRows.push(rowNumber);
      return;
    }

    merged.set(key, { date, dateEnd, platform, campaign, ...metrics, custom: customValues, sourceRows: [rowNumber] });
  });

  if (ambiguousSeen && !detected) {
    issues.add(
      'ambiguous_numbers',
      '"1.500" gibi belirsiz sayılar Türkçe biçimde (binlik ayracı) okundu. Dosyanız İngilizce biçimdeyse kontrol edin.'
    );
  }

  const rows = [...merged.values()];
  if (mergedRowCount > 0) {
    issues.add('merged', `${mergedRowCount} satır aynı tarih ve kampanyaya ait olduğu için toplanarak birleştirildi.`);
  }

  const dates = rows.flatMap((r) => [r.date, r.dateEnd ?? r.date]).sort();
  const missingFields = METRIC_FIELDS.filter((f) => columns[f] === undefined);
  const errors: string[] = [];
  if (!rows.length) errors.push('Okunabilir veri satırı bulunamadı.');

  return {
    ok: errors.length === 0,
    rows,
    mapping: headers,
    customColumns: custom.map((c) => ({ key: c.key, label: c.label, header: String(table[header.index]?.[c.index] ?? '') })),
    unmappedColumns: unmapped,
    missingFields,
    currency,
    decimalStyle,
    dateStart: dates[0] ?? null,
    dateEnd: dates[dates.length - 1] ?? null,
    headerRowNumber: header.index + 1,
    mergedRowCount,
    warnings: issues.list(),
    errors,
  };
}
