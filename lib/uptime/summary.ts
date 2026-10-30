/** Monitörlerin özet görünümü: uygulamadaki Uptime sayfası, uyarılar ve müşteri sayfası bunu kullanır. */

import { prisma } from '@/lib/prisma';
import { checkToJson } from './check';
import { type Alert, findIncidents, monitorAlerts, sslState, windowStats } from './stats';

const DAY = 86400000;

export async function monitorSummaries(brandId: string, { activeOnly = false } = {}) {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY);
  const monitors = await prisma.uptimeMonitor.findMany({
    where: { brandId, ...(activeOnly ? { isActive: true } : {}) },
    include: {
      checks: {
        where: { checkedAt: { gte: since } },
        orderBy: { checkedAt: 'asc' },
        select: { status: true, checkedAt: true, responseTimeMs: true, errorMessage: true, statusCode: true, errorType: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return monitors.map((m) => {
    const checks = m.checks;
    const last = checks[checks.length - 1] ?? null;
    const ssl = sslState(m.sslExpiresAt, m.sslError, now);
    const alerts: Alert[] = monitorAlerts({
      id: m.id, name: m.name, isActive: m.isActive, url: m.url,
      lastStatus: last?.status ?? null, lastError: last?.errorMessage ?? null, ssl, sslError: m.sslError,
    });
    return {
      id: m.id,
      name: m.name,
      url: m.url,
      interval_seconds: m.intervalSeconds,
      timeout_seconds: m.timeoutSeconds,
      is_active: m.isActive,
      current: last ? checkToJson(last) : null,
      stats: {
        day: windowStats(checks, new Date(now.getTime() - DAY)),
        week: windowStats(checks, new Date(now.getTime() - 7 * DAY)),
        month: windowStats(checks, since),
      },
      ssl: {
        ...ssl,
        expires_at: m.sslExpiresAt?.toISOString() ?? null,
        issuer: m.sslIssuer,
        error: m.sslError,
        checked_at: m.sslCheckedAt?.toISOString() ?? null,
      },
      incidents: findIncidents(checks, now).slice(0, 20).map((i) => ({
        started_at: i.startedAt.toISOString(),
        ended_at: i.endedAt?.toISOString() ?? null,
        duration_ms: i.durationMs,
        checks: i.checks,
        reason: i.reason,
      })),
      // Grafik için son 48 kontrolün yanıt süresi
      recent: checks.slice(-48).map((c) => ({ t: c.checkedAt.toISOString(), ms: c.responseTimeMs, status: c.status })),
      alerts,
    };
  });
}

export type MonitorSummary = Awaited<ReturnType<typeof monitorSummaries>>[number];

/** Müşteri sayfası için sade özet (hata ayrıntısı ve iç alanlar yok). */
export type PortalUptime = {
  id: string;
  name: string;
  url: string;
  status: string | null;
  checkedAt: string | null;
  uptimePercent: number | null;
  avgResponseMs: number | null;
  checks: number;
  incidents: number;
  downtimeMs: number;
  sslState: string;
  sslDaysLeft: number | null;
};

export async function portalUptime(brandId: string): Promise<PortalUptime[]> {
  const list = await monitorSummaries(brandId, { activeOnly: true });
  return list.map((m) => ({
    id: m.id,
    name: m.name,
    url: m.url,
    status: m.current?.status ?? null,
    checkedAt: m.current?.checked_at ?? null,
    uptimePercent: m.stats.month.percent,
    avgResponseMs: m.stats.month.avgResponseMs,
    checks: m.stats.month.checks,
    incidents: m.incidents.length,
    downtimeMs: m.incidents.reduce((a, i) => a + i.duration_ms, 0),
    sslState: m.url.startsWith('https://') ? m.ssl.state : 'none',
    sslDaysLeft: m.ssl.daysLeft,
  }));
}
