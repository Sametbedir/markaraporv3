/**
 * Rapordan otomatik, yalnızca ölçülmüş verilere dayanan gözlemler.
 * Tahmin veya yorum üretmez: her cümle rapordaki bir sayıya karşılık gelir.
 */

import type { BrandMonthReport } from './brand-report';
import { percentChange } from './metrics';

type Money = (v: number | null, digits?: number) => string;

const pct = (v: number) => `%${Math.abs(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
const x = (v: number) => `${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;

/** Bu paydan küçük kampanyalar "en iyi/en zayıf" seçiminde dikkate alınmaz (tek siparişlik gürültü) */
const MIN_SPEND_SHARE = 0.05;

export function reportHighlights(r: BrandMonthReport, money: Money): string[] {
  const c = r.current;
  if (!c) return [];
  const p = r.previous;
  const out: string[] = [];

  if (!p) {
    out.push('Önceki ay için veri olmadığından aylık karşılaştırma yapılmadı.');
  } else {
    const spend = percentChange(c.spend, p.spend);
    if (spend !== null && Math.abs(spend) >= 0.1) {
      out.push(`Reklam harcaması önceki aya göre ${pct(spend)} ${spend > 0 ? 'arttı' : 'azaldı'} (${money(p.spend)} → ${money(c.spend)}).`);
    }
    const value = percentChange(c.conversionValue, p.conversionValue);
    if (value !== null && Math.abs(value) >= 0.1) {
      out.push(`Platformların bildirdiği dönüşüm değeri ${pct(value)} ${value > 0 ? 'arttı' : 'azaldı'} (${money(p.conversionValue)} → ${money(c.conversionValue)}).`);
    }
    if (c.roas !== null && p.roas !== null && Math.abs(c.roas - p.roas) >= 0.01) {
      out.push(`ROAS ${x(p.roas)} seviyesinden ${x(c.roas)} seviyesine ${c.roas > p.roas ? 'yükseldi' : 'geriledi'}.`);
    }
    if (c.cpa !== null && p.cpa !== null) {
      const cpa = percentChange(c.cpa, p.cpa);
      if (cpa !== null && Math.abs(cpa) >= 0.1) {
        out.push(`Dönüşüm başı maliyet ${pct(cpa)} ${cpa > 0 ? 'arttı' : 'azaldı'} (${money(p.cpa, 2)} → ${money(c.cpa, 2)}).`);
      }
    }
  }

  const top = r.platforms[0];
  if (top && r.platforms.length > 1 && top.spendShare !== null) {
    out.push(
      `Harcamanın ${pct(top.spendShare)} kısmı ${top.platform} üzerinden yapıldı` +
        (top.roas !== null ? ` (ROAS ${x(top.roas)}).` : '.')
    );
  }

  const totalSpend = c.spend;
  const eligible = r.campaigns.filter((k) => totalSpend > 0 && k.spend / totalSpend >= MIN_SPEND_SHARE && k.spend > 0);
  if (eligible.length >= 2) {
    const byRoas = [...eligible].sort((a, b) => b.revenue / b.spend - a.revenue / a.spend);
    const best = byRoas[0];
    const worst = byRoas[byRoas.length - 1];
    out.push(`Harcaması kayda değer kampanyalar içinde en yüksek ROAS: "${best.campaign_name}" (${x(best.revenue / best.spend)}).`);
    if (worst !== best) {
      out.push(`En düşük ROAS: "${worst.campaign_name}" (${x(worst.revenue / worst.spend)}, harcama ${money(worst.spend)}).`);
    }
  }

  return out;
}
