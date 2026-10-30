import { describe, expect, it } from 'vitest';
import { parseSnapshot, serializeSnapshot, splitLines, type ReportDocumentData } from '@/lib/report/document';
import { reportHighlights } from '@/lib/report/highlights';
import { fileSlug, moneyFormatter } from '@/lib/report/format';
import { kpis, platformBreakdown } from '@/lib/report/metrics';
import type { BrandMonthReport } from '@/lib/report/brand-report';
import type { CampaignPerformance } from '@/lib/types';

const camp = (name: string, platform: string, spend: number, revenue: number): CampaignPerformance => ({
  campaign_id: name, campaign_name: name, platform, impressions: 0, clicks: 0, spend, conversions: 0, revenue,
  roas: spend ? revenue / spend : 0, ctr: 0, cpc: 0, data_source_label: '',
});

function report(over: Partial<BrandMonthReport> = {}): BrandMonthReport {
  const campaigns = [camp('A', 'Meta Ads', 700, 2800), camp('B', 'Google Ads', 280, 560), camp('Minik', 'Meta Ads', 20, 400)];
  return {
    month: '2026-09', start: '2026-09-01', end: '2026-09-30',
    current: kpis({ spend: 1000, conversionValue: 3760, conversions: 40, impressions: 10000, clicks: 500, storeOrders: null }),
    previous: kpis({ spend: 800, conversionValue: 2400, conversions: 30, impressions: 9000, clicks: 450, storeOrders: null }),
    trend: [], platforms: platformBreakdown(campaigns), campaigns,
    currency: 'TRY', mixedCurrencies: false, ...over,
  };
}

const money = moneyFormatter('TRY');

describe('reportHighlights', () => {
  it('değişimleri ölçülen sayılarla yazar', () => {
    const h = reportHighlights(report(), money);
    expect(h[0]).toBe('Reklam harcaması önceki aya göre %25 arttı (₺800 → ₺1.000).');
    expect(h.some((l) => l.startsWith('ROAS 3,00x seviyesinden 3,76x seviyesine yükseldi'))).toBe(true);
    expect(h.some((l) => l.includes('Meta Ads üzerinden'))).toBe(true);
  });
  it('payı %5 altındaki kampanyayı en iyi seçmez (gürültü)', () => {
    const h = reportHighlights(report(), money);
    expect(h.find((l) => l.includes('en yüksek ROAS'))).toContain('"A"');
    expect(h.join(' ')).not.toContain('Minik');
    expect(h.find((l) => l.startsWith('En düşük ROAS'))).toContain('"B"');
  });
  it('önceki ay yoksa karşılaştırma uydurmaz', () => {
    const h = reportHighlights(report({ previous: null }), money);
    expect(h[0]).toBe('Önceki ay için veri olmadığından aylık karşılaştırma yapılmadı.');
    expect(h.join(' ')).not.toMatch(/arttı|azaldı/);
  });
  it('veri yoksa boş', () => {
    expect(reportHighlights(report({ current: null }), money)).toEqual([]);
  });
});

describe('belge', () => {
  it('aksiyon satırlarını madde işaretlerinden temizler', () => {
    expect(splitLines('- Bir\n\n• İki\n3) Üç\n  * Dört  \n')).toEqual(['Bir', 'İki', 'Üç', 'Dört']);
  });
  it('yayın JSON gidiş-dönüşü; bozuk veya eski sürüm null', () => {
    const doc: ReportDocumentData = { brand: { name: 'X', logoUrl: null }, preparedBy: 'Ajans', report: report(), summary: 's', actions: 'a', publishedAt: '2026-10-01T00:00:00.000Z' };
    expect(parseSnapshot(serializeSnapshot(doc))).toEqual(doc);
    expect(parseSnapshot('{bozuk')).toBeNull();
    expect(parseSnapshot(JSON.stringify({ version: 999, document: doc }))).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
  });
  it('dosya adı Türkçe karakterden arınır', () => {
    expect(fileSlug('Örnek Işık Şirketi & Co.')).toBe('ornek-isik-sirketi-co');
    expect(fileSlug('***')).toBe('rapor');
  });
});
