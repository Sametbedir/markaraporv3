import { describe, expect, it } from 'vitest';
import { detectDecimalStyle, parseNumber } from '@/lib/import/numbers';

const v = (raw: unknown, style?: 'comma' | 'dot') => parseNumber(raw, style).value;

describe('parseNumber', () => {
  it('Türkçe ve İngilizce biçimleri okur', () => {
    expect(v('1.234,56')).toBe(1234.56);
    expect(v('1,234.56')).toBe(1234.56);
    expect(v('2.449.050')).toBe(2449050);
    expect(v('2,449,050')).toBe(2449050);
    expect(v('12,5')).toBe(12.5);
    expect(v('0.75')).toBe(0.75);
    expect(v('0,125')).toBe(0.125);
  });

  it('para birimi, yüzde ve boşlukları temizler', () => {
    expect(v('₺ 3.200,00')).toBe(3200);
    expect(v('3.200,00 TL')).toBe(3200);
    expect(v('$1,500.25')).toBe(1500.25);
    expect(v('1 234,5')).toBe(1234.5);
    expect(v('3,5%')).toBe(3.5);
  });

  it('boş hücreleri 0 değil eksik (null) sayar', () => {
    for (const raw of ['', '   ', '-', '—', 'n/a', 'N/A', null, undefined]) {
      const r = parseNumber(raw);
      expect(r.value).toBeNull();
      expect(r.invalid).toBe(false);
    }
  });

  it('gerçek sıfırı korur', () => {
    expect(v('0')).toBe(0);
    expect(v(0)).toBe(0);
    expect(v('0,00')).toBe(0);
  });

  it('negatif değerleri okur', () => {
    expect(v('-250')).toBe(-250);
    expect(v('-1.234,5')).toBe(-1234.5);
    expect(v('(1.234,50)')).toBe(-1234.5);
  });

  it('okunamayan değerleri işaretler ve 0 yapmaz', () => {
    for (const raw of ['abc', '12a', '1.2.3,4,5', '1,23,45']) {
      const r = parseNumber(raw);
      expect(r.value).toBeNull();
      expect(r.invalid).toBe(true);
    }
    expect(parseNumber(Number.NaN).invalid).toBe(true);
  });

  it('belirsiz "1.500" değerini dosya stiline göre okur ve işaretler', () => {
    expect(parseNumber('1.500', 'comma')).toEqual({ value: 1500, invalid: false, ambiguous: true });
    expect(parseNumber('1.500', 'dot')).toEqual({ value: 1.5, invalid: false, ambiguous: true });
    expect(parseNumber('1,500', 'dot').value).toBe(1500);
    expect(parseNumber('1,500', 'comma').value).toBe(1.5);
  });
});

describe('detectDecimalStyle', () => {
  it('kesin ipuçlarından stili bulur', () => {
    expect(detectDecimalStyle(['1.234,56', '12,5'])).toBe('comma');
    expect(detectDecimalStyle(['1,234.56', '0.75'])).toBe('dot');
  });
  it('yalnızca belirsiz değerler varsa karar vermez', () => {
    expect(detectDecimalStyle(['1.500', '2.000', '15'])).toBeNull();
  });
});
