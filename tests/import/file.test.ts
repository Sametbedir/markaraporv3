// Gerçek Excel dosyaları SheetJS ile bellekte üretilip okuyucudan geçirilir.
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseUploadedFile } from '@/lib/import/file';

function workbook(sheets: Record<string, unknown[][]>, bookType: 'xlsx' | 'biff8' = 'xlsx'): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), name);
  }
  const out = XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer;
  return out;
}

const META_TR = [
  ['Gün', 'Kampanya adı', 'Harcanan tutar (TRY)', 'Satın almalar dönüşüm değeri', 'Satın almalar', 'Gösterimler'],
  [new Date(2026, 8, 12), 'Kış', 1234.56, 5000, 7, 12345],
  [new Date(2026, 8, 13), 'Kış', 800, null, null, 9000],
];

describe('Excel okuma', () => {
  it('xlsx: tarih hücreleri, sayılar ve boş hücreler doğru okunur', async () => {
    const { report, sheetName } = await parseUploadedFile(workbook({ Rapor: META_TR }), 'xlsx');
    expect(report.ok).toBe(true);
    expect(sheetName).toBe('Rapor');
    expect(report.currency).toBe('TRY');
    expect(report.rows).toEqual([
      expect.objectContaining({ date: '2026-09-12', campaign: 'Kış', spend: 1234.56, conversionValue: 5000, conversions: 7, impressions: 12345 }),
      expect.objectContaining({ date: '2026-09-13', spend: 800, conversionValue: null, conversions: null, impressions: 9000 }),
    ]);
  });

  it('eski .xls (BIFF8) biçimi okunur', async () => {
    const { report } = await parseUploadedFile(workbook({ Rapor: META_TR }, 'biff8'), 'xls');
    expect(report.ok).toBe(true);
    expect(report.rows.map((r) => r.date)).toEqual(['2026-09-12', '2026-09-13']);
    expect(report.rows[0].spend).toBe(1234.56);
  });

  it('metin olarak saklanmış Türkçe sayılar ve biçimsiz seri numarası tarihler okunur', async () => {
    const { report } = await parseUploadedFile(
      workbook({ Sayfa1: [['Tarih', 'Kampanya', 'Harcama', 'Ciro'], [46277, 'A', '1.234,56', '5.000,00'], ['13.09.2026', 'A', '800', '']] }),
      'xlsx'
    );
    expect(report.rows).toEqual([
      expect.objectContaining({ date: '2026-09-12', spend: 1234.56, conversionValue: 5000 }),
      expect.objectContaining({ date: '2026-09-13', spend: 800, conversionValue: null }),
    ]);
  });

  it('başlıktan önceki açıklama satırlarını atlar', async () => {
    const { report } = await parseUploadedFile(
      workbook({ Rapor: [['Kampanya raporu'], ['1 Eylül 2026 - 30 Eylül 2026'], ['Day', 'Campaign', 'Cost', 'Conv. value'], ['2026-09-01', 'A', 100, 400]] }),
      'xlsx'
    );
    expect(report.headerRowNumber).toBe(3);
    expect(report.rows[0]).toMatchObject({ date: '2026-09-01', spend: 100, conversionValue: 400 });
  });

  it('veri içermeyen sayfayı atlayıp uygun sayfayı bulur', async () => {
    const { report, sheetName, extraWarnings } = await parseUploadedFile(
      workbook({ Kapak: [['Müşteri: X'], ['Hazırlayan: Y']], Veri: META_TR }),
      'xlsx'
    );
    expect(report.ok).toBe(true);
    expect(sheetName).toBe('Veri');
    expect(extraWarnings).toEqual([]);
  });

  it('birden çok uygun sayfa varsa yalnızca ilkini alır ve uyarır', async () => {
    const { sheetName, extraWarnings } = await parseUploadedFile(workbook({ Eylul: META_TR, Ekim: META_TR }), 'xlsx');
    expect(sheetName).toBe('Eylul');
    expect(extraWarnings[0]).toMatch(/yalnızca "Eylul"/);
  });

  it('Excel olmayan dosyada çökmeden anlaşılır hata döner', async () => {
    const junk = new TextEncoder().encode('bu bir excel dosyası değil').buffer as ArrayBuffer;
    const { report } = await parseUploadedFile(junk, 'xlsx');
    expect(report.ok).toBe(false);
    expect(report.errors[0]).toMatch(/Başlık satırı bulunamadı/);
  });

  it('boş çalışma kitabında başlık bulunamadı hatası döner', async () => {
    const { report } = await parseUploadedFile(workbook({ Bos: [[]] }), 'xlsx');
    expect(report.ok).toBe(false);
    expect(report.errors[0]).toMatch(/Başlık satırı bulunamadı/);
  });
});

describe('CSV kodlaması', () => {
  it('Windows-1254 (Türkçe Excel) CSV başlıklarını doğru okur', async () => {
    // "Gösterim" ve "Tıklama" Windows-1254 baytlarıyla: ö=0xF6, ı=0xFD
    const text = 'Tarih;Harcama;Gösterim;Tıklama\n2026-09-01;100;1000;50\n';
    const bytes = Uint8Array.from(text, (ch) => (ch === 'ö' ? 0xf6 : ch === 'ı' ? 0xfd : ch.charCodeAt(0)));
    const { report } = await parseUploadedFile(bytes.buffer, 'csv');
    expect(report.rows[0]).toMatchObject({ spend: 100, impressions: 1000, clicks: 50 });
  });

  it('UTF-8 BOM içeren CSV okunur', async () => {
    const bytes = new TextEncoder().encode('﻿tarih,harcama,gösterim\n2026-09-01,100,1000\n');
    const { report } = await parseUploadedFile(bytes.buffer as ArrayBuffer, 'csv');
    expect(report.rows[0]).toMatchObject({ spend: 100, impressions: 1000 });
  });
});
