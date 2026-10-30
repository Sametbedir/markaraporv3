import { describe, expect, it } from 'vitest';
import { activeCampaigns, hasActivity, kpis, percentChange, platformBreakdown, previousPeriod, safeDivide } from '@/lib/report/metrics';
import type { CampaignPerformance } from '@/lib/types';

const camp = (p: Partial<CampaignPerformance>): CampaignPerformance => ({
  campaign_id: 'x', campaign_name: 'x', platform: 'Meta', impressions: 0, clicks: 0, spend: 0,
  conversions: 0, revenue: 0, roas: 0, ctr: 0, cpc: 0, data_source_label: '', ...p,
});

describe('rapor metrikleri', () => {
  it('sıfıra bölmede 0 değil null döner', () => {
    expect(safeDivide(10, 0)).toBeNull();
    const k = kpis({ spend: 0, conversionValue: 500, conversions: 0, impressions: 0, clicks: 0, storeOrders: null });
    expect(k).toMatchObject({ roas: null, cpa: null, ctr: null, cpc: null });
  });

  it('oranları açık formüllerle hesaplar', () => {
    const k = kpis({ spend: 1000, conversionValue: 4000, conversions: 20, impressions: 50000, clicks: 1000, storeOrders: 15 });
    expect(k.roas).toBe(4);
    expect(k.cpa).toBe(50);
    expect(k.ctr).toBe(2);
    expect(k.cpc).toBe(1);
  });

  it('önceki dönem 0 veya yoksa yüzde değişim hesaplanmaz', () => {
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(100, null)).toBeNull();
    expect(percentChange(null, 100)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it('aynı uzunlukta önceki dönemi bulur (ay ve yıl geçişleri dahil)', () => {
    expect(previousPeriod('2026-09-01', '2026-09-30')).toEqual({ start: '2026-08-02', end: '2026-08-31' });
    expect(previousPeriod('2026-01-01', '2026-01-07')).toEqual({ start: '2025-12-25', end: '2025-12-31' });
    expect(previousPeriod('2026-03-01', '2026-03-01')).toEqual({ start: '2026-02-28', end: '2026-02-28' });
  });

  it('platform kırılımını toplar ve harcama payını hesaplar', () => {
    const rows = platformBreakdown([
      camp({ platform: 'Meta', spend: 300, revenue: 900, conversions: 3 }),
      camp({ platform: 'Google', spend: 100, revenue: 0 }),
      camp({ platform: 'Meta', spend: 300, revenue: 300, conversions: 1 }),
    ]);
    expect(rows).toEqual([
      { platform: 'Meta', spend: 600, conversionValue: 1200, conversions: 4, roas: 2, spendShare: (600 / 700) * 100 },
      { platform: 'Google', spend: 100, conversionValue: 0, conversions: 0, roas: 0, spendShare: (100 / 700) * 100 },
    ]);
  });

  it('harcaması olmayan platformda ROAS ve pay hesaplanmaz', () => {
    expect(platformBreakdown([camp({ platform: 'TikTok', revenue: 50 })])[0]).toMatchObject({ roas: null, spendShare: null });
  });

  it('hareketsiz kampanyaları çıkarır', () => {
    const list = activeCampaigns([camp({ campaign_name: 'boş' }), camp({ campaign_name: 'a', spend: 5 }), camp({ campaign_name: 'b', spend: 10 })]);
    expect(list.map((c) => c.campaign_name)).toEqual(['b', 'a']);
  });

  it('veri yoksa hareket yok sayılır', () => {
    expect(hasActivity(null)).toBe(false);
    expect(hasActivity({ spend: 0, conversionValue: 0, conversions: 0, impressions: 0, clicks: 0, storeOrders: null })).toBe(false);
  });
});
