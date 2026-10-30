import { describe, expect, it } from 'vitest';
import { detectSeparator, parseDelimited } from '@/lib/import/csv';

describe('parseDelimited', () => {
  it('noktalı virgül, virgül ve sekmeyi ayırt eder', () => {
    expect(detectSeparator('a;b;c\n1;2;3')).toBe(';');
    expect(detectSeparator('a,b,c\n1,2,3')).toBe(',');
    expect(detectSeparator('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('tırnak içindeki ayraçları bölmez', () => {
    expect(parseDelimited('tarih;harcama\n"2026-10-05";"1.234,56"')).toEqual([
      ['tarih', 'harcama'],
      ['2026-10-05', '1.234,56'],
    ]);
    expect(parseDelimited('date,cost\n2026-10-05,"1,234.56"')).toEqual([
      ['date', 'cost'],
      ['2026-10-05', '1,234.56'],
    ]);
  });

  it('BOM ve boş satırları temizler', () => {
    expect(parseDelimited('﻿a,b\r\n\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('başlıktan önce tek sütunlu başlık satırları olsa da ayracı bulur', () => {
    expect(detectSeparator('Kampanya raporu\n1 Ekim - 31 Ekim\nGün,Kampanya,Maliyet\n2026-10-01,A,10')).toBe(',');
  });
});
