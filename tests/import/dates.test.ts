import { describe, expect, it } from 'vitest';
import { parseDate } from '@/lib/import/dates';

describe('parseDate', () => {
  it('yaygın biçimleri okur', () => {
    expect(parseDate('2026-10-05')).toBe('2026-10-05');
    expect(parseDate('2026-10-05T00:00:00Z')).toBe('2026-10-05');
    expect(parseDate('05.10.2026')).toBe('2026-10-05');
    expect(parseDate('5/10/2026')).toBe('2026-10-05');
    expect(parseDate('5 Ekim 2026')).toBe('2026-10-05');
    expect(parseDate('5 Ağustos 2026')).toBe('2026-08-05');
    expect(parseDate('Oct 5, 2026')).toBe('2026-10-05');
  });

  it('belirsiz tarihi GÜN/AY okur, ikinci sayı 12den büyükse AY/GÜN okur', () => {
    expect(parseDate('03/04/2026')).toBe('2026-04-03');
    expect(parseDate('04/25/2026')).toBe('2026-04-25');
  });

  it('takvimde olmayan veya boş tarihleri reddeder', () => {
    expect(parseDate('31.02.2026')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('Toplam')).toBeNull();
  });

  it('Excel seri numarasını tarihe çevirir, makul olmayan sayıları reddeder', () => {
    expect(parseDate(46277)).toBe('2026-09-12');
    expect(parseDate(150)).toBeNull();
    expect(parseDate(46277.5)).toBeNull();
  });

  it('Excel Date nesnesinde yerel günü kullanır', () => {
    expect(parseDate(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});
