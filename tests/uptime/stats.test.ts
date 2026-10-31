import { describe, expect, it } from 'vitest';
import { findIncidents, formatDuration, monitorAlerts, sslState, validateTiming, windowStats, type CheckPoint } from '@/lib/uptime/stats';
import { checkHttp, classifyStatus, describeNetworkError } from '@/lib/uptime/check';
import { isDue } from '@/lib/uptime/scheduler';

const t0 = new Date('2026-10-30T10:00:00Z');
const at = (min: number) => new Date(t0.getTime() + min * 60000);
const c = (min: number, status: string, ms: number | null = 200, err: string | null = null): CheckPoint => ({ status, checkedAt: at(min), responseTimeMs: ms, errorMessage: err });

describe('istatistik', () => {
  it('erişilebilirlik yüzdesi ve ortalama yanıt (yalnızca başarılı kontroller)', () => {
    const s = windowStats([c(0, 'up', 100), c(5, 'down', null), c(10, 'up', 300), c(15, 'warning', 50)], at(0));
    expect(s).toEqual({ percent: 50, avgResponseMs: 200, checks: 4 });
  });
  it('kontrol yoksa yüzde null (0 değil)', () => {
    expect(windowStats([c(0, 'up')], at(10))).toEqual({ percent: null, avgResponseMs: null, checks: 0 });
  });
});

describe('kesintiler', () => {
  it('art arda erişilemeyen kontrolleri tek kesinti sayar; ilk başarılı kontrolde biter', () => {
    const list = findIncidents([c(0, 'up'), c(5, 'down', null, 'Zaman aşımı'), c(10, 'down', null), c(15, 'up'), c(20, 'down', null, 'DNS')], at(30));
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ startedAt: at(20), endedAt: null, durationMs: 10 * 60000, checks: 1, reason: 'DNS' });
    expect(list[1]).toMatchObject({ startedAt: at(5), endedAt: at(15), durationMs: 10 * 60000, checks: 2, reason: 'Zaman aşımı' });
  });
  it('4xx uyarısı kesinti sayılmaz', () => {
    expect(findIncidents([c(0, 'warning'), c(5, 'up')])).toEqual([]);
  });
  it('süre biçimi', () => {
    expect(formatDuration(30_000)).toBe('1 dakikadan kısa');
    expect(formatDuration(45 * 60000)).toBe('45 dk');
    expect(formatDuration(125 * 60000)).toBe('2 sa 5 dk');
    expect(formatDuration(26 * 3600000)).toBe('1 gün 2 sa');
  });
});

describe('SSL ve uyarılar', () => {
  const now = new Date('2026-10-30T00:00:00Z');
  it('sertifika durumu', () => {
    expect(sslState(new Date('2027-01-30T00:00:00Z'), null, now)).toEqual({ state: 'ok', daysLeft: 92 });
    expect(sslState(new Date('2026-11-10T00:00:00Z'), null, now)).toEqual({ state: 'expiring', daysLeft: 11 });
    expect(sslState(new Date('2026-10-01T00:00:00Z'), 'x', now).state).toBe('expired');
    expect(sslState(new Date('2027-01-30T00:00:00Z'), 'self signed', now).state).toBe('invalid');
    expect(sslState(null, null, now)).toEqual({ state: 'unknown', daysLeft: null });
  });
  const base = { id: 'm', name: 'Mağaza', isActive: true, url: 'https://ornek.test', lastStatus: 'up', lastError: null, sslError: null };
  it('erişilemeyen site ve yaklaşan SSL bitişi uyarı üretir; duraklatılan monitör üretmez', () => {
    expect(monitorAlerts({ ...base, lastStatus: 'down', lastError: 'DNS', ssl: { state: 'ok', daysLeft: 90 } })).toEqual([
      { monitorId: 'm', name: 'Mağaza', level: 'critical', message: 'Erişilemiyor: DNS' },
    ]);
    expect(monitorAlerts({ ...base, ssl: { state: 'expiring', daysLeft: 5 } })[0]).toMatchObject({ level: 'warning', message: 'SSL sertifikasının bitmesine 5 gün kaldı' });
    expect(monitorAlerts({ ...base, isActive: false, lastStatus: 'down', ssl: { state: 'expired', daysLeft: -3 } })).toEqual([]);
    expect(monitorAlerts({ ...base, url: 'http://ornek.test', ssl: { state: 'unknown', daysLeft: null } })).toEqual([]);
  });
});

describe('kontrol', () => {
  it('HTTP durum sınıflaması', () => {
    expect([200, 301, 404, 500, 503].map(classifyStatus)).toEqual(['up', 'up', 'warning', 'down', 'down']);
  });
  it('ağ hatalarını anlaşılır mesaja çevirir', () => {
    expect(describeNetworkError({ name: 'TimeoutError' }).errorType).toBe('timeout');
    expect(describeNetworkError({ cause: { code: 'ENOTFOUND' } }).errorMessage).toBe('Alan adı çözümlenemedi (DNS)');
    expect(describeNetworkError({ cause: { code: 'CERT_HAS_EXPIRED' } }).errorType).toBe('ssl');
  });
  it('yerel/özel ağ adresine istek atmaz (SSRF)', async () => {
    const r = await checkHttp('http://127.0.0.1:5432', 2);
    expect(r).toMatchObject({ status: 'down', errorType: 'invalid_url' });
  });
  it('çözümlenemeyen alan adı "erişilemiyor (DNS)" sayılır, geçersiz adres değil', async () => {
    const r = await checkHttp('https://bu-alan-adi-kesinlikle-yok-markarapor.invalid', 2);
    expect(r).toMatchObject({ status: 'down', errorType: 'dns', errorMessage: 'Alan adı çözümlenemedi (DNS)' });
  });
  it('zamanlama: vadesi gelen ve gelmeyen monitör', () => {
    expect(isDue({ lastCheckedAt: null, intervalSeconds: 300 }, t0)).toBe(true);
    expect(isDue({ lastCheckedAt: at(-4), intervalSeconds: 300 }, t0)).toBe(false);
    expect(isDue({ lastCheckedAt: at(-5), intervalSeconds: 300 }, t0)).toBe(true);
  });
  it('aralık ve zaman aşımı doğrulaması', () => {
    expect(validateTiming(300, 15)).toEqual({ interval: 300, timeout: 15 });
    expect(validateTiming(30, 15)).toHaveProperty('error');
    expect(validateTiming(60, 60)).toHaveProperty('error');
    expect(validateTiming('abc', 10)).toHaveProperty('error');
  });
});
