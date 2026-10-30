// Örnek tablolar gerçek dışa aktarımların başlık adlarıyla hazırlanmıştır; değerler uydurmadır.
import { describe, expect, it } from 'vitest';
import { parseAdReport } from '@/lib/import/ad-report';
import { parseDelimited } from '@/lib/import/csv';

const csv = (text: string) => parseDelimited(text.trim());
const codes = (r: ReturnType<typeof parseAdReport>) => r.warnings.map((w) => w.code);

describe('Meta dışa aktarımı', () => {
  it('İngilizce başlıklarda oran sütunlarını harcama/sipariş sanmaz', () => {
    const r = parseAdReport(csv(`
Reporting starts,Reporting ends,Campaign name,Cost per result,Results,Amount spent (TRY),Purchases conversion value,Purchases,Impressions,Reach,Link clicks
2026-10-01,2026-10-01,Yaz,125,12,1500,6000,12,50000,30000,900
`));
    expect(r.ok).toBe(true);
    expect(r.currency).toBe('TRY');
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      date: '2026-10-01', dateEnd: null, campaign: 'Yaz',
      spend: 1500, conversionValue: 6000, conversions: 12, impressions: 50000, reach: 30000, clicks: 900,
    });
    expect(r.unmappedColumns).toEqual(expect.arrayContaining(['Cost per result', 'Results']));
  });

  it('Türkçe başlıkları ve Türkçe sayı biçimini okur', () => {
    const r = parseAdReport(csv(`
Raporlama başlangıcı;Raporlama bitişi;Kampanya adı;Harcanan tutar (TRY);Satın almalar dönüşüm değeri;Satın almalar;Gösterimler
01.10.2026;01.10.2026;Kış;1.234,56;5.000,00;7;12.345
`));
    expect(r.rows[0]).toMatchObject({ date: '2026-10-01', spend: 1234.56, conversionValue: 5000, conversions: 7, impressions: 12345 });
    expect(r.decimalStyle).toBe('comma');
  });

  it('kampanya adı boş özet satırını atlar', () => {
    const r = parseAdReport(csv(`
Reporting starts,Campaign name,Amount spent (TRY)
2026-10-01,,3000
2026-10-01,A,1000
2026-10-01,B,2000
`));
    expect(r.rows.map((x) => x.spend)).toEqual([1000, 2000]);
    expect(codes(r)).toContain('empty_campaign');
  });
});

describe('Google Ads dışa aktarımı', () => {
  it('başlık öncesi açıklama satırlarını ve toplam satırını atlar', () => {
    const r = parseAdReport(csv(`
Campaign report
"October 1, 2026 - October 2, 2026"
Day,Campaign,Currency code,Cost,Conv. value,Conversions,Impr.,Clicks,Cost / conv.
2026-10-01,Marka,TRY,"1,000.50","4,000.00",20,"30,000","1,200",50.03
2026-10-02,Marka,TRY,500,2000,10,15000,600,50
Total: Account,,TRY,"1,500.50","6,000.00",30,"45,000","1,800",50.02
`));
    expect(r.ok).toBe(true);
    expect(r.headerRowNumber).toBe(3);
    expect(r.decimalStyle).toBe('dot');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ spend: 1000.5, conversionValue: 4000, conversions: 20, impressions: 30000, clicks: 1200 });
    expect(codes(r)).toContain('total_row');
    expect(r.dateStart).toBe('2026-10-01');
    expect(r.dateEnd).toBe('2026-10-02');
  });

  it('adı "Total" ile başlayan gerçek kampanyayı atlamaz', () => {
    const r = parseAdReport(csv(`
Day,Campaign,Cost
2026-10-01,Total Look Kampanyası,100
`));
    expect(r.rows).toHaveLength(1);
  });
});

describe('eksik ve hatalı veri', () => {
  it('boş hücreleri eksik bırakır, 0 yazmaz', () => {
    const r = parseAdReport(csv(`
tarih;harcama;ciro;gösterim
2026-10-01;100;;
2026-10-02;0;0;0
`));
    expect(r.rows[0]).toMatchObject({ spend: 100, conversionValue: null, impressions: null });
    expect(r.rows[1]).toMatchObject({ spend: 0, conversionValue: 0, impressions: 0 });
  });

  it('dosyada hiç olmayan alanları eksik alan olarak raporlar', () => {
    const r = parseAdReport(csv(`
tarih;harcama
2026-10-01;100
`));
    expect(r.missingFields).toEqual(['conversionValue', 'conversions', 'impressions', 'clicks', 'reach']);
    expect(r.rows[0].conversionValue).toBeNull();
  });

  it('negatif sayaçları eksik sayar, negatif harcamayı uyararak korur', () => {
    const r = parseAdReport(csv(`
tarih;harcama;gösterim;tıklama
2026-10-01;-50;-10;5
`));
    expect(r.rows[0]).toMatchObject({ spend: -50, impressions: null, clicks: 5 });
    expect(codes(r)).toEqual(expect.arrayContaining(['negative_spend', 'negative_impressions']));
  });

  it('okunamayan sayıyı eksik sayar ve uyarır', () => {
    const r = parseAdReport(csv(`
tarih;harcama
2026-10-01;yüz lira
2026-10-02;100
`));
    expect(r.rows.map((x) => x.spend)).toEqual([100]);
    expect(codes(r)).toEqual(expect.arrayContaining(['invalid_spend', 'empty_metrics']));
  });

  it('tarihi okunamayan satırları atlar ve satır numarasını bildirir', () => {
    const r = parseAdReport(csv(`
tarih;harcama
32.13.2026;100
2026-10-02;100
`));
    expect(r.rows).toHaveLength(1);
    expect(r.warnings.find((w) => w.code === 'bad_date')?.rows).toEqual([2]);
  });

  it('para birimi yoksa TRY varsaymaz', () => {
    const r = parseAdReport(csv(`
tarih;harcama
2026-10-01;100
`));
    expect(r.currency).toBeNull();
    expect(codes(r)).toContain('currency_missing');
  });

  it('karışık para birimli dosyayı reddeder', () => {
    const r = parseAdReport(csv(`
Day,Campaign,Currency code,Cost
2026-10-01,A,TRY,100
2026-10-01,B,USD,10
`));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/birden fazla para birimi/);
    expect(r.rows).toHaveLength(0);
  });

  it('başlık bulunamazsa anlaşılır hata verir', () => {
    const r = parseAdReport(csv(`
ürün;stok
A;5
`));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/Başlık satırı bulunamadı/);
  });
});

describe('yinelenen satırlar', () => {
  it('aynı gün ve kampanyaya ait satırları toplar', () => {
    const r = parseAdReport(csv(`
Day,Campaign,Ad set,Cost,Conversions
2026-10-01,A,Set 1,100,2
2026-10-01,A,Set 2,50,
2026-10-01,B,Set 1,70,1
`));
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ campaign: 'A', spend: 150, conversions: 2, sourceRows: [2, 3] });
    expect(r.mergedRowCount).toBe(1);
    expect(codes(r)).toEqual(expect.arrayContaining(['merged', 'partial_merge']));
  });

  it('platform farklıysa birleştirmez', () => {
    const r = parseAdReport(csv(`
tarih;platform;kampanya;harcama
2026-10-01;Meta;A;100
2026-10-01;Google;A;100
`));
    expect(r.rows).toHaveLength(2);
  });
});
