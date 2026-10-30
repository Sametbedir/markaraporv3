/**
 * Uptime istatistikleri, kesintiler ve uyarılar (veritabanı yok; test edilebilir).
 *
 * - Erişilebilirlik yüzdesi = "çalışıyor" kontroller ÷ tüm kontroller. "Uyarı" (4xx) çalışmıyor sayılır.
 * - Kesinti: art arda "erişilemiyor" kontrollerinden oluşan dönem; ilk "çalışıyor" kontrolüyle biter.
 *   Bitiş, kesintiden sonraki ilk başarılı kontrolün zamanıdır (gerçek süre en fazla bir aralık kadar sapabilir).
 */

export type CheckPoint = { status: string; checkedAt: Date; responseTimeMs: number | null; errorMessage: string | null };

export type Incident = {
  startedAt: Date;
  /** null ise kesinti sürüyor */
  endedAt: Date | null;
  durationMs: number;
  checks: number;
  reason: string | null;
};

export type WindowStats = { percent: number | null; avgResponseMs: number | null; checks: number };

export function windowStats(checks: CheckPoint[], since: Date): WindowStats {
  const inWindow = checks.filter((c) => c.checkedAt >= since);
  if (!inWindow.length) return { percent: null, avgResponseMs: null, checks: 0 };
  const up = inWindow.filter((c) => c.status === 'up');
  const times = up.map((c) => c.responseTimeMs).filter((t): t is number => t !== null);
  return {
    percent: (up.length / inWindow.length) * 100,
    avgResponseMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    checks: inWindow.length,
  };
}

/** `checks` eskiden yeniye sıralı olmalı. Sonuç yeniden eskiye döner. */
export function findIncidents(checks: CheckPoint[], now = new Date()): Incident[] {
  const out: Incident[] = [];
  let open: Incident | null = null;
  for (const c of checks) {
    if (c.status === 'down') {
      if (!open) open = { startedAt: c.checkedAt, endedAt: null, durationMs: 0, checks: 0, reason: c.errorMessage };
      open.checks++;
    } else if (c.status === 'up' && open) {
      open.endedAt = c.checkedAt;
      open.durationMs = c.checkedAt.getTime() - open.startedAt.getTime();
      out.push(open);
      open = null;
    }
  }
  if (open) {
    open.durationMs = now.getTime() - open.startedAt.getTime();
    out.push(open);
  }
  return out.reverse();
}

export const SSL_WARN_DAYS = 30;

export type SslState = { state: 'ok' | 'expiring' | 'expired' | 'invalid' | 'unknown'; daysLeft: number | null };

export function sslState(expiresAt: Date | null, error: string | null, now = new Date()): SslState {
  if (!expiresAt) return { state: error ? 'invalid' : 'unknown', daysLeft: null };
  const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 86400000);
  if (expiresAt <= now) return { state: 'expired', daysLeft };
  if (error) return { state: 'invalid', daysLeft };
  return { state: daysLeft < SSL_WARN_DAYS ? 'expiring' : 'ok', daysLeft };
}

export type Alert = { monitorId: string; name: string; level: 'critical' | 'warning'; message: string };

export function monitorAlerts(
  m: { id: string; name: string; isActive: boolean; url: string; lastStatus: string | null; lastError: string | null; ssl: SslState; sslError: string | null }
): Alert[] {
  if (!m.isActive) return [];
  const alerts: Alert[] = [];
  if (m.lastStatus === 'down') alerts.push({ monitorId: m.id, name: m.name, level: 'critical', message: `Erişilemiyor${m.lastError ? `: ${m.lastError}` : ''}` });
  else if (m.lastStatus === 'warning') alerts.push({ monitorId: m.id, name: m.name, level: 'warning', message: m.lastError ?? 'Sunucu hata kodu döndürüyor' });
  if (m.url.startsWith('https://')) {
    if (m.ssl.state === 'expired') alerts.push({ monitorId: m.id, name: m.name, level: 'critical', message: 'SSL sertifikasının süresi dolmuş' });
    else if (m.ssl.state === 'invalid') alerts.push({ monitorId: m.id, name: m.name, level: 'critical', message: m.sslError ?? 'SSL sertifikası geçersiz' });
    else if (m.ssl.state === 'expiring') alerts.push({ monitorId: m.id, name: m.name, level: 'warning', message: `SSL sertifikasının bitmesine ${m.ssl.daysLeft} gün kaldı` });
  }
  return alerts;
}

export function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return '1 dakikadan kısa';
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa ${min % 60} dk`;
  return `${Math.floor(h / 24)} gün ${h % 24} sa`;
}

/** Kontrol aralığı 60 sn–1 gün, zaman aşımı 1–60 sn ve aralıktan kısa. */
export function validateTiming(interval: unknown, timeout: unknown): { interval: number; timeout: number } | { error: string } {
  const i = Number(interval);
  const t = Number(timeout);
  if (!Number.isInteger(i) || i < 60 || i > 86400) return { error: 'Kontrol aralığı 60 saniye ile 1 gün arasında olmalı.' };
  if (!Number.isInteger(t) || t < 1 || t > 60) return { error: 'Zaman aşımı 1–60 saniye arasında olmalı.' };
  if (t >= i) return { error: 'Zaman aşımı kontrol aralığından kısa olmalı.' };
  return { interval: i, timeout: t };
}
