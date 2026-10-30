/** Raporda gösterilebilecek metrikler: hazır olanlar + markanın özel/formül metrikleri. */

export type MetricFormat = 'number' | 'money' | 'percent' | 'ratio';
export const METRIC_FORMATS: { value: MetricFormat; label: string }[] = [
  { value: 'number', label: 'Sayı' },
  { value: 'money', label: 'Para' },
  { value: 'percent', label: 'Yüzde' },
  { value: 'ratio', label: 'Oran (x)' },
];

export const BUILTIN_KPIS = [
  { key: 'spend', label: 'Reklam harcaması', format: 'money' },
  { key: 'conversionValue', label: 'Dönüşüm değeri', format: 'money' },
  { key: 'roas', label: 'ROAS', format: 'ratio' },
  { key: 'conversions', label: 'Dönüşüm', format: 'number' },
  { key: 'cpa', label: 'Dönüşüm başı maliyet', format: 'money' },
  { key: 'impressions', label: 'Gösterim', format: 'number' },
  { key: 'clicks', label: 'Tıklama', format: 'number' },
  { key: 'ctr', label: 'Tıklama oranı (CTR)', format: 'percent' },
  { key: 'cpc', label: 'Tıklama başı maliyet', format: 'money' },
  { key: 'storeOrders', label: 'Mağaza siparişi', format: 'number' },
] as const satisfies readonly { key: string; label: string; format: MetricFormat }[];

export type BuiltinKpi = (typeof BUILTIN_KPIS)[number]['key'];
export const BUILTIN_KPI_KEYS = new Set<string>(BUILTIN_KPIS.map((k) => k.key));

/** Formüllerde kullanılabilen hazır değişkenler (dönem toplamları) */
export const FORMULA_VARIABLES: { key: string; label: string }[] = [
  { key: 'spend', label: 'Harcama' },
  { key: 'revenue', label: 'Dönüşüm değeri' },
  { key: 'conversions', label: 'Dönüşüm' },
  { key: 'impressions', label: 'Gösterim' },
  { key: 'clicks', label: 'Tıklama' },
];
const RESERVED = new Set([...FORMULA_VARIABLES.map((v) => v.key), ...BUILTIN_KPIS.map((k) => k.key)]);

/** Özel metrik anahtarı hazır bir metrikle çakışmasın: "clicks" → "clicks_ozel" */
export function safeCustomKey(key: string): string {
  return RESERVED.has(key) ? `${key}_ozel` : key;
}

export function parseKpiKeys(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string').slice(0, 24) : null;
  } catch {
    return null;
  }
}

export function formatMetric(value: number | null, format: string, money: (v: number | null, d?: number) => string): string {
  if (value === null) return '—';
  const n = (d: number) => value.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  if (format === 'money') return money(value, Math.abs(value) < 100 ? 2 : 0);
  if (format === 'percent') return `%${n(2)}`;
  if (format === 'ratio') return `${n(2)}x`;
  return Number.isInteger(value) ? n(0) : n(2);
}
