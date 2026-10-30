/**
 * Müşteri raporu için ölçülmüş metrikler ve basit türetilmiş oranlar.
 *
 * Kurallar:
 * - Payda 0 ise oran hesaplanmaz (null). "0" ile "hesaplanamadı" karıştırılmaz.
 * - Önceki dönem değeri 0 veya yoksa yüzde değişim null'dır.
 * - "Dönüşüm değeri" reklam platformunun bildirdiği değerdir; mağaza cirosu değildir.
 */

import type { CampaignPerformance, DashboardSummary } from '@/lib/types';

export type ReportTotals = {
  spend: number;
  conversionValue: number;
  conversions: number;
  impressions: number;
  clicks: number;
  storeOrders: number | null;
};

export type ReportKpis = ReportTotals & {
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
  cpc: number | null;
};

export const safeDivide = (a: number, b: number): number | null => (b ? a / b : null);

export function totalsFromSummary(s: DashboardSummary | null): ReportTotals | null {
  if (!s) return null;
  return {
    spend: s.total_spend ?? 0,
    conversionValue: s.total_revenue ?? 0,
    conversions: s.total_conversions ?? 0,
    impressions: s.total_impressions ?? 0,
    clicks: s.total_clicks ?? 0,
    storeOrders: s.has_store_orders ? s.total_orders : null,
  };
}

export function kpis(t: ReportTotals): ReportKpis {
  return {
    ...t,
    roas: safeDivide(t.conversionValue, t.spend),
    cpa: safeDivide(t.spend, t.conversions),
    ctr: (() => {
      const r = safeDivide(t.clicks, t.impressions);
      return r === null ? null : r * 100;
    })(),
    cpc: safeDivide(t.spend, t.clicks),
  };
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function hasActivity(t: ReportTotals | null): boolean {
  return !!t && (t.spend > 0 || t.conversionValue > 0 || t.impressions > 0 || t.clicks > 0 || t.conversions > 0);
}

/** Seçili dönemle aynı uzunlukta, hemen önceki dönem (YYYY-MM-DD). */
export function previousPeriod(start: string, end: string): { start: string; end: string } {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevEnd = new Date(s.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(prevStart), end: iso(prevEnd) };
}

export type PlatformRow = {
  platform: string;
  spend: number;
  conversionValue: number;
  conversions: number;
  roas: number | null;
  spendShare: number | null;
};

export function platformBreakdown(campaigns: CampaignPerformance[]): PlatformRow[] {
  const map = new Map<string, { spend: number; conversionValue: number; conversions: number }>();
  for (const c of campaigns) {
    const row = map.get(c.platform) ?? { spend: 0, conversionValue: 0, conversions: 0 };
    row.spend += c.spend ?? 0;
    row.conversionValue += c.revenue ?? 0;
    row.conversions += c.conversions ?? 0;
    map.set(c.platform, row);
  }
  const totalSpend = [...map.values()].reduce((a, r) => a + r.spend, 0);
  return [...map.entries()]
    .map(([platform, r]) => ({
      platform,
      ...r,
      roas: safeDivide(r.conversionValue, r.spend),
      spendShare: (() => {
        const share = safeDivide(r.spend, totalSpend);
        return share === null ? null : share * 100;
      })(),
    }))
    .sort((a, b) => b.spend - a.spend);
}

/** Dönemde hiç hareketi olmayan kampanyaları çıkarır, harcamaya göre sıralar. */
export function activeCampaigns(campaigns: CampaignPerformance[]): CampaignPerformance[] {
  return campaigns
    .filter((c) => (c.spend ?? 0) > 0 || (c.revenue ?? 0) > 0 || (c.impressions ?? 0) > 0 || (c.conversions ?? 0) > 0)
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
}
