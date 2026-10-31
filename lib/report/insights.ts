/**
 * Rapor belgesi için türetilmiş tablolar: ay karşılaştırması, satış hunisi, haftalık kırılım,
 * platform ve kampanya özetleri. Yalnızca rapordaki ölçülmüş değerlerden hesaplanır; payda 0 ise oran null.
 */

import type { BrandMonthReport } from './brand-report';
import type { Money } from './format';
import { percentChange, safeDivide } from './metrics';
import { formatMetric } from '@/lib/metrics/catalog';
import type { CampaignPerformance } from '@/lib/types';

/* ── Ay karşılaştırması ── */

export type ComparisonRow = {
  label: string;
  current: string;
  previous: string;
  change: number | null;
  lowerIsBetter?: boolean;
  neutral?: boolean;
};

export function comparisonRows(r: BrandMonthReport, money: Money): ComparisonRow[] {
  const c = r.current;
  if (!c) return [];
  const p = r.previous;
  const row = (label: string, cur: number | null, prev: number | null, format: string, opts: Partial<ComparisonRow> = {}): ComparisonRow => ({
    label,
    current: formatMetric(cur, format, money),
    previous: p ? formatMetric(prev, format, money) : '—',
    change: p ? percentChange(cur, prev) : null,
    ...opts,
  });
  const rows = [
    row('Reklam harcaması', c.spend, p?.spend ?? null, 'money', { neutral: true }),
    row('Dönüşüm değeri', c.conversionValue, p?.conversionValue ?? null, 'money'),
    row('ROAS', c.roas, p?.roas ?? null, 'ratio'),
    row('Dönüşüm', c.conversions, p?.conversions ?? null, 'number'),
    row('Dönüşüm başı maliyet', c.cpa, p?.cpa ?? null, 'money', { lowerIsBetter: true }),
    row('Ortalama sepet (dönüşüm değeri ÷ dönüşüm)', safeDivide(c.conversionValue, c.conversions), p ? safeDivide(p.conversionValue, p.conversions) : null, 'money'),
    row('Gösterim', c.impressions, p?.impressions ?? null, 'number'),
    row('Tıklama', c.clicks, p?.clicks ?? null, 'number'),
    row('Tıklama oranı (CTR)', c.ctr, p?.ctr ?? null, 'percent'),
    row('Tıklama başı maliyet', c.cpc, p?.cpc ?? null, 'money', { lowerIsBetter: true }),
    row('Dönüşüm oranı (dönüşüm ÷ tıklama)', pct(c.conversions, c.clicks), p ? pct(p.conversions, p.clicks) : null, 'percent'),
  ];
  if (c.storeOrders !== null) rows.push(row('Mağaza siparişi', c.storeOrders, p?.storeOrders ?? null, 'number'));
  for (const e of r.extra ?? []) {
    if (e.value === null && e.previous === null) continue;
    rows.push({
      label: e.label,
      current: formatMetric(e.value, e.format, money),
      previous: p || e.previous !== null ? formatMetric(e.previous, e.format, money) : '—',
      change: percentChange(e.value, e.previous),
      neutral: true,
    });
  }
  return rows;
}

function pct(a: number, b: number): number | null {
  const r = safeDivide(a, b);
  return r === null ? null : r * 100;
}

/* ── Satış hunisi ── */

const ADD_TO_CART_KEYS = ['sepeteeklemeler', 'sepeteekleme', 'addstocart', 'addtocart', 'sepeteeklemelerwebsitesi'];
const CHECKOUT_KEYS = ['baslatilanalisverisler', 'odemebaslatma', 'odemebaslatmalar', 'checkoutsinitiated', 'initiatedcheckouts'];

export type FunnelStep = { label: string; value: number; rate: number | null };

/** Gösterim → tıklama → sepete ekleme → ödeme başlatma → satın alma. Değeri olmayan adım atlanır. */
export function funnel(r: BrandMonthReport): FunnelStep[] {
  const c = r.current;
  if (!c) return [];
  const extra = (keys: string[]) => r.extra?.find((e) => e.kind === 'custom' && keys.includes(e.key) && e.value !== null)?.value ?? null;
  const raw: [string, number | null][] = [
    ['Gösterim', c.impressions || null],
    ['Tıklama', c.clicks || null],
    ['Sepete ekleme', extra(ADD_TO_CART_KEYS)],
    ['Ödeme başlatma', extra(CHECKOUT_KEYS)],
    ['Satın alma (platform)', c.conversions || null],
  ];
  const steps: FunnelStep[] = [];
  for (const [label, value] of raw) {
    if (value === null) continue;
    const prev = steps[steps.length - 1];
    steps.push({ label, value, rate: prev ? pct(value, prev.value) : null });
  }
  return steps;
}

/* ── Haftalık kırılım ── */

export type WeekRow = {
  label: string;
  spend: number;
  conversionValue: number;
  conversions: number | null;
  roas: number | null;
  cpa: number | null;
};

/** Ayın günlerini 1–7, 8–14, 15–21, 22–28, 29–son olarak gruplar. */
export function weeklyBreakdown(r: BrandMonthReport): WeekRow[] {
  if (!r.current || !r.trend.length) return [];
  const hasConversions = r.trend.some((d) => d.conversions !== undefined);
  const lastDay = Number(r.end.slice(8, 10));
  const monthName = new Date(`${r.start}T00:00:00Z`).toLocaleDateString('tr-TR', { month: 'short', timeZone: 'UTC' });
  const rows: WeekRow[] = [];
  for (let from = 1; from <= lastDay; from += 7) {
    const to = Math.min(from + 6, lastDay);
    const days = r.trend.filter((d) => {
      const day = Number(d.date.slice(8, 10));
      return day >= from && day <= to;
    });
    const spend = days.reduce((a, d) => a + d.spend, 0);
    const conversionValue = days.reduce((a, d) => a + d.conversionValue, 0);
    const conversions = hasConversions ? days.reduce((a, d) => a + (d.conversions ?? 0), 0) : null;
    if (!days.length) continue;
    rows.push({
      label: `${from}–${to} ${monthName}`,
      spend,
      conversionValue,
      conversions,
      roas: safeDivide(conversionValue, spend),
      cpa: conversions === null ? null : safeDivide(spend, conversions),
    });
  }
  return rows;
}

/* ── Kampanyalar: ilk N + "Diğer" ── */

export type CampaignRow = {
  name: string;
  platform: string;
  spend: number;
  share: number | null;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
};

export function campaignTable(campaigns: CampaignPerformance[], limit = 20): { rows: CampaignRow[]; other: CampaignRow | null; total: number } {
  const totalSpend = campaigns.reduce((a, c) => a + c.spend, 0);
  const toRow = (name: string, platform: string, list: CampaignPerformance[]): CampaignRow => {
    const spend = list.reduce((a, c) => a + c.spend, 0);
    const revenue = list.reduce((a, c) => a + c.revenue, 0);
    const conversions = list.reduce((a, c) => a + c.conversions, 0);
    const share = safeDivide(spend, totalSpend);
    return {
      name, platform, spend, revenue, conversions,
      clicks: list.reduce((a, c) => a + c.clicks, 0),
      share: share === null ? null : share * 100,
      roas: safeDivide(revenue, spend),
      cpa: safeDivide(spend, conversions),
    };
  };
  const rows = campaigns.slice(0, limit).map((c) => toRow(c.campaign_name, c.platform, [c]));
  const rest = campaigns.slice(limit);
  return { rows, other: rest.length ? toRow(`Diğer ${rest.length} kampanya`, '—', rest) : null, total: campaigns.length };
}

/** Platform başına tıklama ve dönüşüm başı maliyet (platform tablosu için) */
export function platformExtras(campaigns: CampaignPerformance[]): Map<string, { clicks: number; cpa: number | null }> {
  const map = new Map<string, { clicks: number; spend: number; conversions: number }>();
  for (const c of campaigns) {
    const m = map.get(c.platform) ?? { clicks: 0, spend: 0, conversions: 0 };
    m.clicks += c.clicks;
    m.spend += c.spend;
    m.conversions += c.conversions;
    map.set(c.platform, m);
  }
  return new Map([...map].map(([k, v]) => [k, { clicks: v.clicks, cpa: safeDivide(v.spend, v.conversions) }]));
}
