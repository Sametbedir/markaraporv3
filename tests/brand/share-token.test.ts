import { describe, expect, it } from 'vitest';
import { generateShareToken, hashShareToken, isWellFormedToken, linkState, parseExpiry, parseSections } from '@/lib/share-token';
import { isMonth, monthRange, previousMonth } from '@/lib/report/months';

describe('müşteri linki anahtarı', () => {
  it('her seferinde farklı, 43 karakterlik base64url anahtar üretir', () => {
    const tokens = new Set(Array.from({ length: 200 }, generateShareToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(isWellFormedToken(t)).toBe(true);
  });
  it('özet anahtarın kendisini içermez ve sabittir', () => {
    const t = generateShareToken();
    expect(hashShareToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(t)).toBe(hashShareToken(t));
    expect(hashShareToken(t)).not.toContain(t);
  });
  it('biçimi bozuk anahtarları reddeder', () => {
    for (const bad of ['', 'kisa', '../../etc/passwd', `${'a'.repeat(42)}!`, 'a'.repeat(44)]) expect(isWellFormedToken(bad)).toBe(false);
  });
});

describe('bölümler', () => {
  it('yalnızca bilinen bölümleri sabit sırada kabul eder', () => {
    expect(parseSections(['uptime', 'report', 'ayarlar', 'upload'])).toEqual(['report', 'uptime']);
    expect(parseSections('["goals"]')).toEqual(['goals']);
    expect(parseSections('bozuk')).toEqual([]);
    expect(parseSections(null)).toEqual([]);
  });
});

describe('link durumu', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  it('iptal, süre dolumu, aktif', () => {
    expect(linkState({ revokedAt: now, expiresAt: null }, now)).toBe('revoked');
    expect(linkState({ revokedAt: null, expiresAt: new Date('2026-10-30T11:00:00Z') }, now)).toBe('expired');
    expect(linkState({ revokedAt: null, expiresAt: new Date('2026-11-01T00:00:00Z') }, now)).toBe('active');
    expect(linkState({ revokedAt: null, expiresAt: null }, now)).toBe('active');
  });
  it('bitiş tarihi günün sonuna kadar geçerli; geçmiş ve bozuk tarih reddedilir', () => {
    const r = parseExpiry('2026-10-30', now);
    expect('value' in r && r.value?.toISOString()).toBe('2026-10-30T20:59:59.000Z');
    expect(parseExpiry('2026-10-29', now)).toHaveProperty('error');
    expect(parseExpiry('30.10.2026', now)).toHaveProperty('error');
    expect(parseExpiry('', now)).toEqual({ value: null });
  });
});

describe('aylar', () => {
  it('ay aralığı, artık yıl ve önceki ay', () => {
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('2026-09')).toBe(true);
    expect(isMonth(['2026-09'])).toBe(false);
  });
});
