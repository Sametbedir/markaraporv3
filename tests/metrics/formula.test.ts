import { describe, expect, it } from 'vitest';
import { evaluate, parseFormula } from '@/lib/metrics/formula';
import { computeExtras } from '@/lib/metrics/extra';
import { formatMetric, safeCustomKey } from '@/lib/metrics/catalog';

const allowed = new Set(['spend', 'revenue', 'clicks', 'leads']);
const calc = (f: string, v: Record<string, number | null>) => {
  const p = parseFormula(f, allowed);
  if ('error' in p) throw new Error(p.error);
  return evaluate(p.expr, v);
};

describe('formül', () => {
  it('öncelik, parantez ve eksi işareti', () => {
    expect(calc('spend + clicks * 2', { spend: 10, clicks: 3 })).toBe(16);
    expect(calc('(spend + clicks) * 2', { spend: 10, clicks: 3 })).toBe(26);
    expect(calc('-spend + 5', { spend: 10 })).toBe(-5);
    expect(calc('revenue / spend * 100', { revenue: 300, spend: 100 })).toBe(300);
  });
  it('sıfıra bölme ve eksik değişken null (0 değil)', () => {
    expect(calc('spend / leads', { spend: 100, leads: 0 })).toBeNull();
    expect(calc('spend / leads', { spend: 100, leads: null })).toBeNull();
    expect(calc('spend / leads', { spend: 100 })).toBeNull();
  });
  it('bilinmeyen değişken, kod ve bozuk sözdizimini reddeder', () => {
    expect(parseFormula('spend / sepet', allowed)).toEqual({ error: 'Bilinmeyen metrik: "sepet"' });
    expect(parseFormula('process.exit()', allowed)).toHaveProperty('error');
    expect(parseFormula('spend; alert(1)', allowed)).toHaveProperty('error');
    expect(parseFormula('(spend + 1', allowed)).toEqual({ error: 'Kapanmayan parantez.' });
    expect(parseFormula('spend +', allowed)).toHaveProperty('error');
    expect(parseFormula('2 * 3', allowed)).toEqual({ error: 'Formül en az bir metrik içermeli.' });
    expect(parseFormula('', allowed)).toEqual({ error: 'Formül boş.' });
  });
});

describe('özel ve formül metrikleri', () => {
  const totals = { spend: 1000, conversionValue: 3000, conversions: 10, impressions: 50000, clicks: 800, storeOrders: null };
  const defs = [
    { key: 'leads', label: 'Lead', kind: 'custom', formula: null, format: 'number' },
    { key: 'f_cpl', label: 'Lead başı maliyet', kind: 'formula', formula: 'spend / leads', format: 'money' },
  ];
  it('dönem toplamlarından hesaplar; önceki dönemde veri yoksa null', () => {
    const [leads, cpl] = computeExtras(defs, { totals, custom: { leads: 40 } }, { totals: null, custom: {} });
    expect(leads).toMatchObject({ value: 40, previous: null });
    expect(cpl).toMatchObject({ value: 25, previous: null });
  });
  it('o ay özel metrik değeri yoksa 0 değil null', () => {
    const [leads, cpl] = computeExtras(defs, { totals, custom: {} }, { totals, custom: { leads: 20 } });
    expect(leads.value).toBeNull();
    expect(cpl.value).toBeNull();
    expect(cpl.previous).toBe(50);
  });
  it('biçimler ve anahtar çakışması', () => {
    const money = (v: number | null) => `₺${v}`;
    expect(formatMetric(25, 'money', money)).toBe('₺25');
    expect(formatMetric(1.5, 'ratio', money)).toBe('1,50x');
    expect(formatMetric(12.345, 'percent', money)).toBe('%12,35');
    expect(formatMetric(null, 'number', money)).toBe('—');
    expect(safeCustomKey('clicks')).toBe('clicks_ozel');
    expect(safeCustomKey('leads')).toBe('leads');
  });
});
