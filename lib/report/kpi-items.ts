/** Rapor belgesi ve müşteri sayfası için gösterilecek KPI kartları (markanın seçimine göre). */

import type { BrandMonthReport } from './brand-report';
import type { Money } from './format';
import { formatMetric } from '@/lib/metrics/catalog';

export type KpiItem = {
  key: string;
  label: string;
  value: string;
  cur: number | null;
  prev: number | null;
  lowerIsBetter?: boolean;
  /** Artış/azalış tek başına iyi ya da kötü sayılmaz (harcama, özel metrikler) */
  neutral?: boolean;
  hint: string;
};

export const DOCUMENT_DEFAULT_KPIS = ['spend', 'conversionValue', 'roas', 'conversions', 'cpa', 'impressions', 'clicks', 'ctr', 'cpc', 'storeOrders'];
export const PORTAL_DEFAULT_KPIS = ['spend', 'conversionValue', 'roas', 'conversions', 'cpa', 'ctr', 'storeOrders'];

export function reportKpiItems(r: BrandMonthReport, money: Money, defaults: string[]): KpiItem[] {
  const c = r.current;
  if (!c) return [];
  const p = r.previous;
  const n = (v: number | null) => formatMetric(v, 'number', money);

  const builtin: Record<string, () => KpiItem | null> = {
    spend: () => ({ key: 'spend', label: 'Reklam harcaması', value: money(c.spend), cur: c.spend, prev: p?.spend ?? null, neutral: true, hint: 'Dönemdeki toplam reklam harcaması' }),
    conversionValue: () => ({ key: 'conversionValue', label: 'Dönüşüm değeri', value: money(c.conversionValue), cur: c.conversionValue, prev: p?.conversionValue ?? null, hint: 'Reklam platformlarının bildirdiği satış değeri' }),
    roas: () => ({ key: 'roas', label: 'ROAS', value: formatMetric(c.roas, 'ratio', money), cur: c.roas, prev: p?.roas ?? null, hint: 'Dönüşüm değeri ÷ harcama' }),
    conversions: () => ({ key: 'conversions', label: 'Dönüşüm', value: n(c.conversions), cur: c.conversions, prev: p?.conversions ?? null, hint: 'Platformların bildirdiği satın alma' }),
    cpa: () => ({ key: 'cpa', label: 'Dönüşüm başı maliyet', value: money(c.cpa, 2), cur: c.cpa, prev: p?.cpa ?? null, lowerIsBetter: true, hint: 'Harcama ÷ dönüşüm' }),
    impressions: () => ({ key: 'impressions', label: 'Gösterim', value: n(c.impressions), cur: c.impressions, prev: p?.impressions ?? null, hint: 'Reklamların gösterilme sayısı' }),
    clicks: () => ({ key: 'clicks', label: 'Tıklama', value: n(c.clicks), cur: c.clicks, prev: p?.clicks ?? null, hint: 'Reklam tıklamaları' }),
    ctr: () => ({ key: 'ctr', label: 'Tıklama oranı (CTR)', value: formatMetric(c.ctr, 'percent', money), cur: c.ctr, prev: p?.ctr ?? null, hint: 'Tıklama ÷ gösterim' }),
    cpc: () => ({ key: 'cpc', label: 'Tıklama başı maliyet', value: money(c.cpc, 2), cur: c.cpc, prev: p?.cpc ?? null, lowerIsBetter: true, hint: 'Harcama ÷ tıklama' }),
    storeOrders: () =>
      c.storeOrders === null ? null : { key: 'storeOrders', label: 'Mağaza siparişi', value: n(c.storeOrders), cur: c.storeOrders, prev: p?.storeOrders ?? null, hint: 'Mağazadan gelen sipariş sayısı' },
  };

  const extraItem = (key: string): KpiItem | null => {
    const e = r.extra.find((x) => x.key === key);
    if (!e) return null;
    return {
      key: e.key,
      label: e.label,
      value: formatMetric(e.value, e.format, money),
      cur: e.value,
      prev: e.previous,
      neutral: true,
      hint: e.kind === 'formula' ? `Formül: ${e.formula}` : 'Markaya özel metrik (dosyadan)',
    };
  };

  const keys = r.kpiKeys ?? [...defaults, ...r.extra.filter((e) => e.value !== null).map((e) => e.key)];
  return keys.map((k) => (builtin[k] ? builtin[k]() : extraItem(k))).filter((x): x is KpiItem => x !== null);
}
