/** Markanın özel ve formül metriklerini dönem toplamlarından hesaplar (veritabanı yok; test edilebilir). */

import type { ReportTotals } from '@/lib/report/metrics';
import { evaluate, parseFormula } from './formula';
import { FORMULA_VARIABLES } from './catalog';

export type MetricDef = { key: string; label: string; kind: string; formula: string | null; format: string };

export type ExtraMetric = {
  key: string;
  label: string;
  format: string;
  kind: 'custom' | 'formula';
  formula: string | null;
  value: number | null;
  previous: number | null;
};

function variables(t: ReportTotals | null, custom: Record<string, number>): Record<string, number | null> {
  if (!t) return { ...custom };
  return { spend: t.spend, revenue: t.conversionValue, conversions: t.conversions, impressions: t.impressions, clicks: t.clicks, ...custom };
}

export function computeExtras(
  defs: MetricDef[],
  current: { totals: ReportTotals | null; custom: Record<string, number> },
  previous: { totals: ReportTotals | null; custom: Record<string, number> }
): ExtraMetric[] {
  const allowed = new Set([...FORMULA_VARIABLES.map((v) => v.key), ...defs.filter((d) => d.kind === 'custom').map((d) => d.key)]);
  const cur = variables(current.totals, current.custom);
  const prev = variables(previous.totals, previous.custom);

  return defs.map((d) => {
    if (d.kind === 'formula') {
      const parsed = d.formula ? parseFormula(d.formula, allowed) : { error: 'boş' };
      const ok = 'expr' in parsed;
      return {
        key: d.key, label: d.label, format: d.format, kind: 'formula', formula: d.formula,
        value: ok && current.totals ? evaluate(parsed.expr, cur) : null,
        previous: ok && previous.totals ? evaluate(parsed.expr, prev) : null,
      };
    }
    return {
      key: d.key, label: d.label, format: d.format, kind: 'custom', formula: null,
      // Dosyada o ay hiç değer yoksa "0" değil "veri yok"
      value: d.key in current.custom ? current.custom[d.key] : null,
      previous: d.key in previous.custom ? previous.custom[d.key] : null,
    };
  });
}
