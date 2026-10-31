/**
 * Manuel veri girişinin doğrulanması (veritabanı yok; test edilebilir).
 *
 * - Tüm alanlar isteğe bağlıdır; boş alan "eksik" kalır, 0 yazılmaz. En az bir değer gerekir.
 * - Sayılar Türkçe (1.234,56) veya İngilizce (1234.56) yazılabilir.
 * - Özel metrikler (sepet tutarı, DM cirosu…) markanın metrik tanımlarına eklenir; anahtar,
 *   dosya yüklemesindeki aynı adlı sütunla eşleşir (ör. "Sepete eklemeler").
 */

import { parseDate } from './dates';
import { detectDecimalStyle, parseNumber } from './numbers';
import { normalizeHeader } from './headers';
import { METRIC_FORMATS, type MetricFormat, guessFormat, safeCustomKey } from '../metrics/catalog';

export const STANDARD_MANUAL_FIELDS = [
  { key: 'spend', label: 'Reklam harcaması', integer: false },
  { key: 'conversionValue', label: 'Dönüşüm değeri (reklam platformu)', integer: false },
  { key: 'conversions', label: 'Dönüşüm / satın alma (reklam platformu)', integer: false },
  { key: 'impressions', label: 'Gösterim', integer: true },
  { key: 'clicks', label: 'Tıklama', integer: true },
  { key: 'reach', label: 'Erişim', integer: true },
] as const;
type StandardKey = (typeof STANDARD_MANUAL_FIELDS)[number]['key'];

export const MAX_RANGE_DAYS = 366;
const MAX_CUSTOM = 60;
const FORMATS = new Set<string>(METRIC_FORMATS.map((f) => f.value));

export type ManualEntry = {
  date: string;
  /** Dönem toplamı girildiyse bitiş tarihi; tek gün için null */
  endDate: string | null;
  platform: string;
  campaign: string;
  metrics: Record<StandardKey, number | null>;
  custom: { key: string; label: string; format: MetricFormat; value: number }[];
};

export function manualMetricKey(label: string): string {
  const key = normalizeHeader(label).key.slice(0, 40);
  if (!key) return '';
  return safeCustomKey(/^[a-z]/.test(key) ? key : `m${key}`);
}

function readNumber(raw: unknown, label: string, integer: boolean): { value: number | null; error?: string } {
  const text = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim();
  if (!text) return { value: null };
  const parsed = parseNumber(text, detectDecimalStyle([text]) ?? 'comma');
  if (parsed.invalid || parsed.value === null) return { value: null, error: `"${label}" okunamadı.` };
  if (parsed.value < 0) return { value: null, error: `"${label}" negatif olamaz.` };
  return { value: integer ? Math.round(parsed.value) : parsed.value };
}

export function validateManualEntry(body: any): { entry: ManualEntry } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Geçersiz istek.' };

  const date = parseDate(String(body.date ?? ''));
  if (!date) return { error: 'Geçerli bir tarih girin.' };
  let endDate: string | null = null;
  if (body.endDate) {
    endDate = parseDate(String(body.endDate));
    if (!endDate) return { error: 'Bitiş tarihi geçersiz.' };
    if (endDate < date) return { error: 'Bitiş tarihi başlangıçtan önce olamaz.' };
    const days = (Date.parse(endDate) - Date.parse(date)) / 86400000 + 1;
    if (days > MAX_RANGE_DAYS) return { error: 'Dönem en fazla 1 yıl olabilir.' };
    if (endDate === date) endDate = null;
  }

  const errors: string[] = [];
  const metrics = {} as Record<StandardKey, number | null>;
  const raw = { ...body.metrics };
  // Eski istemciler "revenue" gönderir
  if (raw.conversionValue === undefined && body.revenue !== undefined) raw.conversionValue = body.revenue;
  for (const f of STANDARD_MANUAL_FIELDS) {
    const r = readNumber(raw[f.key] ?? body[f.key], f.label, f.integer);
    if (r.error) errors.push(r.error);
    metrics[f.key] = r.value;
  }

  const custom: ManualEntry['custom'] = [];
  const seen = new Set<string>();
  const items = Array.isArray(body.custom) ? body.custom.slice(0, MAX_CUSTOM) : [];
  for (const item of items) {
    const label = String(item?.label ?? '').trim().slice(0, 60);
    const valueText = String(item?.value ?? '').trim();
    if (!valueText) continue; // boş bırakılan alan kaydedilmez
    if (!label) {
      errors.push('Değeri girilen bir metriğin adı boş.');
      continue;
    }
    const key = item?.key ? manualMetricKey(String(item.key)) : manualMetricKey(label);
    if (!key) {
      errors.push(`"${label}" için geçerli bir ad yazın.`);
      continue;
    }
    if (seen.has(key)) {
      errors.push(`"${label}" iki kez girilmiş.`);
      continue;
    }
    const r = readNumber(valueText, label, false);
    if (r.error) {
      errors.push(r.error);
      continue;
    }
    seen.add(key);
    const format = FORMATS.has(String(item?.format)) ? (String(item.format) as MetricFormat) : guessFormat(label);
    custom.push({ key, label, format, value: r.value! });
  }

  if (errors.length) return { error: errors.join(' ') };
  if (Object.values(metrics).every((v) => v === null) && custom.length === 0) {
    return { error: 'En az bir değer girin.' };
  }

  const platform = String(body.platform ?? '').trim().slice(0, 60) || 'Manuel Giriş';
  const campaign = String(body.campaign ?? '').trim().slice(0, 120) || `${platform} (manuel)`;
  return { entry: { date, endDate, platform, campaign, metrics, custom } };
}
