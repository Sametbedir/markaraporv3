/**
 * Reklam raporu sütun başlıklarını alanlara eşler.
 *
 * Eşleme TAM eşleşmeyle yapılır: "Cost per result" asla "cost" (harcama) sayılmaz.
 * Her alan için takma adlar öncelik sırasıyla listelenir; dosyada birden fazlası varsa
 * listede önce gelen kullanılır (örn. "Clicks" varsa "Clicks (all)" yerine o seçilir).
 *
 * Kasıtlı olarak eşlenmeyenler:
 * - "Results / Sonuçlar": Meta'da kampanya hedefine göre tıklama, mesaj vb. olabilir; satın alma değildir.
 * - "Reach / Erişim": gösterimle aynı şey değildir, ayrı alan olarak tutulur.
 * - "All conv. value": satın alma dışı dönüşümleri de içerir.
 */

export type AdField =
  | 'date'
  | 'dateEnd'
  | 'platform'
  | 'campaign'
  | 'currency'
  | 'spend'
  | 'conversionValue'
  | 'conversions'
  | 'impressions'
  | 'clicks'
  | 'reach';

export const METRIC_FIELDS = ['spend', 'conversionValue', 'conversions', 'impressions', 'clicks', 'reach'] as const;
export type MetricField = (typeof METRIC_FIELDS)[number];

export const FIELD_LABELS: Record<AdField, string> = {
  date: 'Tarih',
  dateEnd: 'Bitiş tarihi',
  platform: 'Platform',
  campaign: 'Kampanya',
  currency: 'Para birimi',
  spend: 'Reklam harcaması',
  conversionValue: 'Platformun bildirdiği dönüşüm değeri',
  conversions: 'Platformun bildirdiği satın alma sayısı',
  impressions: 'Gösterim',
  clicks: 'Tıklama',
  reach: 'Erişim',
};

export const FIELD_ALIASES: Record<AdField, string[]> = {
  date: ['tarih', 'date', 'day', 'gun', 'reportingstarts', 'raporlamabaslangici', 'raporlamabaslangic'],
  dateEnd: ['reportingends', 'raporlamabitisi', 'raporlamabitis'],
  platform: ['platform', 'kanal', 'channel', 'network', 'ag'],
  campaign: ['kampanya', 'kampanyaadi', 'campaign', 'campaignname'],
  currency: ['currency', 'currencycode', 'parabirimi'],
  spend: [
    'harcama', 'spend', 'amountspent', 'harcanantutar', 'cost', 'maliyet', 'reklamharcamasi',
    'totalcost', 'toplammaliyet', 'toplamharcama',
  ],
  conversionValue: [
    'ciro', 'gelir', 'revenue', 'conversionvalue', 'convvalue', 'donusumdegeri',
    'purchasesconversionvalue', 'satinalmalardonusumdegeri', 'satinalmadonusumdegeri',
    'websitepurchasesconversionvalue', 'purchasevalue', 'totalpurchasevalue', 'satisgeliri',
  ],
  conversions: [
    'siparis', 'siparissayisi', 'orders', 'purchases', 'satinalmalar', 'satinalma',
    'websitepurchases', 'conversions', 'conv', 'donusumler', 'donusum',
  ],
  impressions: ['gosterim', 'gosterimler', 'impressions', 'impr', 'impression'],
  clicks: ['tiklama', 'tiklamalar', 'clicks', 'click', 'linkclicks', 'baglantitiklamalari', 'clicksall', 'tiklamalartumu'],
  reach: ['reach', 'erisim'],
};

const CURRENCY_IN_HEADER = /[([]\s*(TRY|TL|USD|EUR|GBP)\s*[)\]]/i;

export function normalizeCurrency(raw: string): string | null {
  const c = raw.trim().toUpperCase();
  if (!c) return null;
  if (c === 'TL' || c === '₺') return 'TRY';
  if (c === '$') return 'USD';
  if (c === '€') return 'EUR';
  if (c === '£') return 'GBP';
  return /^[A-Z]{3}$/.test(c) ? c : null;
}

/** "Amount spent (TRY)" → { key: "amountspent", currency: "TRY" } */
export function normalizeHeader(header: string): { key: string; currency: string | null } {
  const text = String(header ?? '');
  const currencyMatch = text.match(CURRENCY_IN_HEADER);
  const key = text
    .replace(CURRENCY_IN_HEADER, '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');
  return { key, currency: currencyMatch ? normalizeCurrency(currencyMatch[1]) : null };
}

export type HeaderMapping = {
  /** alan → sütun indeksi */
  columns: Partial<Record<AdField, number>>;
  /** alan → dosyadaki orijinal başlık */
  headers: Partial<Record<AdField, string>>;
  unmapped: string[];
  headerCurrencies: string[];
};

export function mapHeaders(headerRow: unknown[]): HeaderMapping {
  const normalized = headerRow.map((h) => normalizeHeader(String(h ?? '')));
  const columns: Partial<Record<AdField, number>> = {};
  const headers: Partial<Record<AdField, string>> = {};
  const used = new Set<number>();

  for (const field of Object.keys(FIELD_ALIASES) as AdField[]) {
    for (const alias of FIELD_ALIASES[field]) {
      const index = normalized.findIndex((n, i) => n.key === alias && !used.has(i));
      if (index >= 0) {
        columns[field] = index;
        headers[field] = String(headerRow[index]);
        used.add(index);
        break;
      }
    }
  }

  const headerCurrencies = new Set<string>();
  for (const field of METRIC_FIELDS) {
    const index = columns[field];
    const currency = index === undefined ? null : normalized[index].currency;
    if (currency) headerCurrencies.add(currency);
  }

  return {
    columns,
    headers,
    unmapped: headerRow
      .map((h, i) => ({ h: String(h ?? '').trim(), i }))
      .filter(({ h, i }) => h && !used.has(i))
      .map(({ h }) => h),
    headerCurrencies: [...headerCurrencies],
  };
}

/**
 * Platform sütunu olmayan dışa aktarımlarda platformu başlıklardan tanır.
 * Yalnızca o platforma özgü başlıklar kullanılır; emin olunamazsa null döner.
 */
const PLATFORM_SIGNATURES: { platform: string; keys: string[] }[] = [
  {
    platform: 'Meta Ads',
    keys: ['amountspent', 'harcanantutar', 'reportingstarts', 'raporlamabaslangici', 'purchasesconversionvalue', 'satinalmalardonusumdegeri', 'linkclicks', 'baglantitiklamalari'],
  },
  { platform: 'Google Ads', keys: ['convvalue', 'impr', 'currencycode', 'allconvvalue', 'costconv'] },
];

export function detectPlatformFromHeaders(headerRow: unknown[]): string | null {
  const keys = new Set(headerRow.map((h) => normalizeHeader(String(h ?? '')).key));
  const matches = PLATFORM_SIGNATURES.filter((sig) => sig.keys.some((k) => keys.has(k)));
  return matches.length === 1 ? matches[0].platform : null;
}
