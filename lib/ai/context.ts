/**
 * AI'ya gönderilen veri özeti. Yalnızca toplu sayılar gider: müşteri adı, e-posta, sipariş
 * ayrıntısı veya marka adı gönderilmez (ücretsiz katmanda Google veriyi ürün geliştirmede kullanabilir).
 * Tüm oranlar burada hesaplanır; model hesap yapmak zorunda kalmaz ve sayı uydurmaz.
 */

import type { BrandMonthReport } from '@/lib/report/brand-report';
import { safeDivide, percentChange } from '@/lib/report/metrics';
import { campaignTable, funnel, weeklyBreakdown } from '@/lib/report/insights';

const r2 = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);

export function reportToAiContext(r: BrandMonthReport) {
  const c = r.current;
  const p = r.previous;
  if (!c) return null;
  const totals = (k: NonNullable<BrandMonthReport['current']>) => ({
    harcama: r2(k.spend),
    donusum_degeri: r2(k.conversionValue),
    roas: r2(k.roas),
    donusum: r2(k.conversions),
    donusum_basi_maliyet: r2(k.cpa),
    ortalama_sepet: r2(safeDivide(k.conversionValue, k.conversions)),
    gosterim: k.impressions,
    tiklama: k.clicks,
    tiklama_orani_yuzde: r2(k.ctr),
    tiklama_basi_maliyet: r2(k.cpc),
    donusum_orani_yuzde: r2((safeDivide(k.conversions, k.clicks) ?? NaN) * 100),
    magaza_siparisi: k.storeOrders,
  });
  const change = (a: number | null, b: number | null) => r2(percentChange(a, b));
  const camps = campaignTable(r.campaigns, 15);

  return {
    donem: { baslangic: r.start, bitis: r.end },
    para_birimi: r.currency ?? 'karışık (dönüştürülmedi)',
    bu_donem: totals(c),
    onceki_donem: p ? totals(p) : 'veri yok',
    degisim_yuzde: p
      ? {
          harcama: change(c.spend, p.spend),
          donusum_degeri: change(c.conversionValue, p.conversionValue),
          roas: change(c.roas, p.roas),
          donusum: change(c.conversions, p.conversions),
          donusum_basi_maliyet: change(c.cpa, p.cpa),
          tiklama_orani: change(c.ctr, p.ctr),
          tiklama_basi_maliyet: change(c.cpc, p.cpc),
        }
      : 'önceki dönem verisi yok',
    platformlar: r.platforms.map((x) => ({ platform: x.platform, harcama: r2(x.spend), harcama_payi_yuzde: r2(x.spendShare), donusum: r2(x.conversions), donusum_degeri: r2(x.conversionValue), roas: r2(x.roas) })),
    kampanyalar_harcamaya_gore: camps.rows.map((k) => ({ ad: k.name, platform: k.platform, harcama: r2(k.spend), pay_yuzde: r2(k.share), donusum: r2(k.conversions), donusum_basi_maliyet: r2(k.cpa), donusum_degeri: r2(k.revenue), roas: r2(k.roas) })),
    diger_kampanyalar: camps.other ? { adet: camps.total - camps.rows.length, harcama: r2(camps.other.spend), roas: r2(camps.other.roas) } : null,
    haftalik: weeklyBreakdown(r).map((w) => ({ hafta: w.label, harcama: r2(w.spend), donusum_degeri: r2(w.conversionValue), roas: r2(w.roas), donusum: w.conversions, donusum_basi_maliyet: r2(w.cpa) })),
    satis_hunisi: funnel(r).map((f) => ({ adim: f.label, deger: f.value, onceki_adima_gore_yuzde: r2(f.rate) })),
    ozel_metrikler: (r.extra ?? [])
      .filter((e) => e.value !== null || e.previous !== null)
      .map((e) => ({ ad: e.label, bicim: e.format, tur: e.kind === 'formula' ? `formül: ${e.formula}` : 'markaya özel', bu_donem: r2(e.value), onceki_donem: r2(e.previous) })),
    notlar: [
      'donusum ve donusum_degeri reklam platformlarının bildirdiğidir; mağaza cirosu değildir.',
      'Değeri null olan alan veride yoktur; 0 değildir.',
    ],
  };
}
