import { describe, expect, it } from 'vitest';
import { campaignTable, comparisonRows, funnel, weeklyBreakdown } from '@/lib/report/insights';
import { kpis, platformBreakdown } from '@/lib/report/metrics';
import { moneyFormatter } from '@/lib/report/format';
import type { BrandMonthReport } from '@/lib/report/brand-report';
import type { CampaignPerformance } from '@/lib/types';

const camp = (name: string, spend: number, revenue: number, conversions: number): CampaignPerformance => ({
  campaign_id: name, campaign_name: name, platform: 'Meta Ads', impressions: 0, clicks: 10, spend, conversions, revenue,
  roas: 0, ctr: 0, cpc: 0, data_source_label: '',
});
const money = moneyFormatter('TRY');

function report(over: Partial<BrandMonthReport> = {}): BrandMonthReport {
  const campaigns = [camp('A', 600, 2400, 6), camp('B', 400, 800, 4)];
  return {
    month: '2026-09', start: '2026-09-01', end: '2026-09-30',
    current: kpis({ spend: 1000, conversionValue: 3200, conversions: 10, impressions: 20000, clicks: 400, storeOrders: null }),
    previous: kpis({ spend: 800, conversionValue: 2400, conversions: 8, impressions: 16000, clicks: 300, storeOrders: null }),
    trend: Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, spend: 10, conversionValue: 30, conversions: 1, clicks: 5, impressions: 100 })),
    platforms: platformBreakdown(campaigns), campaigns, currency: 'TRY', mixedCurrencies: false, kpiKeys: null,
    extra: [
      { key: 'sepeteeklemeler', label: 'Sepete eklemeler', format: 'number', kind: 'custom', formula: null, value: 80, previous: 60 },
      { key: 'dmciro', label: 'DM cirosu', format: 'money', kind: 'custom', formula: null, value: 5000, previous: null },
      { key: 'bos', label: 'Boş', format: 'number', kind: 'custom', formula: null, value: null, previous: null },
    ],
    ...over,
  };
}

describe('ay karşılaştırması', () => {
  it('türetilmiş metrikler ve özel metrikler; değeri olmayan özel metrik gösterilmez', () => {
    const rows = comparisonRows(report(), money);
    const get = (l: string) => rows.find((r) => r.label.startsWith(l))!;
    expect(get('Reklam harcaması')).toMatchObject({ current: '₺1.000', previous: '₺800', change: 25 });
    expect(get('Ortalama sepet').current).toBe('₺320');
    expect(get('Dönüşüm oranı').current).toBe('%2,50');
    expect(get('Sepete eklemeler')).toMatchObject({ current: '80', previous: '60' });
    expect(get('DM cirosu')).toMatchObject({ current: '₺5.000', previous: '—', change: null });
    expect(rows.find((r) => r.label === 'Boş')).toBeUndefined();
  });
  it('önceki ay yoksa değişim null', () => {
    expect(comparisonRows(report({ previous: null }), money).every((r) => r.change === null || r.label === 'Sepete eklemeler')).toBe(true);
  });
});

describe('satış hunisi', () => {
  it('adımlar ve bir önceki adıma göre oran; olmayan adım atlanır', () => {
    expect(funnel(report())).toEqual([
      { label: 'Gösterim', value: 20000, rate: null },
      { label: 'Tıklama', value: 400, rate: 2 },
      { label: 'Sepete ekleme', value: 80, rate: 20 },
      { label: 'Satın alma (platform)', value: 10, rate: 12.5 },
    ]);
  });
});

describe('haftalık kırılım', () => {
  it('1–7 … 29–30 haftaları', () => {
    const w = weeklyBreakdown(report());
    expect(w.map((x) => x.label)).toEqual(['1–7 Eyl', '8–14 Eyl', '15–21 Eyl', '22–28 Eyl', '29–30 Eyl']);
    expect(w[0]).toMatchObject({ spend: 70, conversionValue: 210, conversions: 7, roas: 3, cpa: 10 });
    expect(w[4]).toMatchObject({ spend: 20, conversions: 2 });
  });
  it('eski yayınlarda dönüşüm yoksa dönüşüm sütunları null', () => {
    const r = report({ trend: [{ date: '2026-09-01', spend: 10, conversionValue: 20 }, { date: '2026-09-09', spend: 5, conversionValue: 5 }] });
    expect(weeklyBreakdown(r)[0]).toMatchObject({ conversions: null, cpa: null, roas: 2 });
  });
});

describe('kampanya tablosu', () => {
  it('ilk N ayrı, kalanlar "Diğer" satırında toplanır; pay ve dönüşüm başı maliyet', () => {
    const list = [camp('A', 500, 1000, 5), camp('B', 300, 300, 0), camp('C', 150, 300, 3), camp('D', 50, 100, 1)];
    const t = campaignTable(list, 2);
    expect(t.rows.map((r) => [r.name, r.share, r.cpa])).toEqual([['A', 50, 100], ['B', 30, null]]);
    expect(t.other).toMatchObject({ name: 'Diğer 2 kampanya', spend: 200, share: 20, conversions: 4, cpa: 50, roas: 2 });
    expect(campaignTable(list, 10).other).toBeNull();
  });
});
