import { describe, expect, it } from 'vitest';
import { applyTemplate, mappingFromRoles, previewTable, templateFromColumns } from '@/lib/import/preview';
import { parseAdReport } from '@/lib/import/ad-report';
import { parseDelimited } from '@/lib/import/csv';

const csv = (text: string) => parseDelimited(text.trim());
const role = (p: ReturnType<typeof previewTable>, header: string) => p!.columns.find((c) => c.header === header)!.role;

describe('önizleme önerileri', () => {
  const table = csv(`
Tarih;Kampanya;Harcama;Potansiyel müşteriler;Mesajlar;Sonuç başı maliyet;CTR (%);Not
01.10.2026;A;100;4;2;25;1,2;deneme
02.10.2026;A;200;6;3;33,3;1,4;
`);
  const p = previewTable(table);

  it('bilinen alanları eşler, sayısal sütunları özel metrik önerir, oranları önermez', () => {
    expect(p).not.toBeNull();
    expect(role(p, 'Tarih')).toEqual({ kind: 'field', field: 'date' });
    expect(role(p, 'Harcama')).toEqual({ kind: 'field', field: 'spend' });
    expect(role(p, 'Potansiyel müşteriler')).toEqual({ kind: 'custom', key: 'potansiyelmusteriler', label: 'Potansiyel müşteriler' });
    expect(role(p, 'Mesajlar')).toMatchObject({ kind: 'custom', key: 'mesajlar' });
    expect(role(p, 'Sonuç başı maliyet')).toEqual({ kind: 'ignore' });
    expect(role(p, 'CTR (%)')).toEqual({ kind: 'ignore' });
    expect(role(p, 'Not')).toEqual({ kind: 'ignore' });
    expect(p!.rows).toHaveLength(2);
  });

  it('onaylanan eşlemeyle özel metrikleri toplayarak okur', () => {
    const m = mappingFromRoles(p!.headerRowIndex, p!.columns.map((c) => ({ index: c.index, role: c.role })));
    if ('error' in m) throw new Error(m.error);
    const r = parseAdReport([...table, ['02.10.2026', 'A', '50', '1', '', '', '', '']], { mapping: m });
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[1]).toMatchObject({ spend: 250, custom: { potansiyelmusteriler: 7, mesajlar: 3 } });
    expect(r.customColumns.map((c) => c.key)).toEqual(['potansiyelmusteriler', 'mesajlar']);
  });

  it('tanınmayan başlıklı dosya elle eşlemeyle okunur', () => {
    const t = csv(`
Gün bilgisi,Reklam,Para,Lead
2026-10-01,X,"1,500.00",3
`);
    expect(parseAdReport(t).ok).toBe(false);
    const prev = previewTable(t)!;
    expect(prev.headerRowIndex).toBe(0);
    const m = mappingFromRoles(0, [
      { index: 0, role: { kind: 'field', field: 'date' } },
      { index: 1, role: { kind: 'field', field: 'campaign' } },
      { index: 2, role: { kind: 'field', field: 'spend' } },
      { index: 3, role: { kind: 'custom', key: 'lead', label: 'Lead' } },
    ]);
    if ('error' in m) throw new Error(m.error);
    const r = parseAdReport(t, { mapping: m });
    expect(r.rows[0]).toMatchObject({ date: '2026-10-01', campaign: 'X', spend: 1500, custom: { lead: 3 } });
  });

  it('eşleme hataları', () => {
    expect(mappingFromRoles(0, [
      { index: 0, role: { kind: 'field', field: 'spend' } },
      { index: 1, role: { kind: 'field', field: 'spend' } },
    ])).toEqual({ error: 'Aynı alan birden fazla sütuna atanmış.' });
    expect(mappingFromRoles(0, [
      { index: 0, role: { kind: 'custom', key: 'a', label: 'Lead' } },
      { index: 1, role: { kind: 'custom', key: 'a', label: 'Lead 2' } },
    ])).toHaveProperty('error');
    const r = parseAdReport(csv('a,b\n1,2'), { mapping: { headerRowIndex: 0, fields: { spend: 0 }, custom: [] } });
    expect(r.errors[0]).toContain('tarih sütunu');
  });

  it('şablon başlık adına göre uygulanır ve aynı biçimin imzası sabittir', () => {
    const changed = p!.columns.map((c) => (c.header === 'Mesajlar' ? { ...c, role: { kind: 'ignore' as const } } : c));
    const again = applyTemplate(previewTable(table)!.columns, templateFromColumns(changed));
    expect(again.find((c) => c.header === 'Mesajlar')!.role).toEqual({ kind: 'ignore' });
    expect(previewTable(table)!.signature).toBe(p!.signature);
  });
});

describe('Türkçe Google Ads ve TikTok', () => {
  it('Türkçe Google Ads dışa aktarımını ve para birimi kodunu tanır', () => {
    const r = parseAdReport(csv(`
Gün;Kampanya;Para birimi kodu;Maliyet;Dönüş. değeri;Dönüşümler;Gösterim;Tıklama
01.10.2026;Marka;TRY;1.000,50;4.000,00;20;30.000;1.200
`));
    expect(r.ok).toBe(true);
    expect(r.currency).toBe('TRY');
    expect(r.rows[0]).toMatchObject({ platform: 'Google Ads', spend: 1000.5, conversionValue: 4000, conversions: 20, clicks: 1200 });
  });
  it('TikTok Ads dışa aktarımını tanır', () => {
    const r = parseAdReport(csv(`
By Day,Campaign name,Cost,Impressions,Clicks (Destination),Complete Payment,Total Complete Payment Value
2026-10-01,Yaz,100,5000,80,4,600
`));
    expect(r.ok).toBe(true);
    expect(r.rows[0]).toMatchObject({ platform: 'TikTok Ads', spend: 100, clicks: 80, conversions: 4, conversionValue: 600 });
  });
});
