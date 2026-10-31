/**
 * Tek bir monitörün HTTP ve SSL kontrolü. Elle "Kontrol Et", monitör oluşturma ve arka plan
 * zamanlayıcısı aynı fonksiyonu kullanır; sonuç UptimeCheck olarak kaydedilir.
 */

import tls from 'node:tls';
import type { UptimeMonitor } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DnsLookupError, validateMonitorUrl } from '@/lib/safe-url';

const SSL_RECHECK_MS = 12 * 60 * 60 * 1000;
const USER_AGENT = 'MarkaRapor-UptimeMonitor/1.0';

export type HttpResult = {
  status: 'up' | 'down' | 'warning';
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: string | null;
  errorMessage: string | null;
};

/** 2xx/3xx çalışıyor, 5xx erişilemiyor, 4xx uyarı (sayfa var ama hata dönüyor). */
export function classifyStatus(code: number): HttpResult['status'] {
  if (code >= 200 && code < 400) return 'up';
  if (code >= 500) return 'down';
  return 'warning';
}

/** Ağ hatasını kullanıcıya anlaşılır bir mesaja çevirir. */
export function describeNetworkError(err: any): { errorType: string; errorMessage: string } {
  const code = String(err?.cause?.code ?? err?.code ?? '');
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return { errorType: 'timeout', errorMessage: 'Zaman aşımı: site belirlenen sürede yanıt vermedi' };
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return { errorType: 'dns', errorMessage: 'Alan adı çözümlenemedi (DNS)' };
  if (code === 'ECONNREFUSED') return { errorType: 'refused', errorMessage: 'Bağlantı reddedildi' };
  if (code === 'ECONNRESET') return { errorType: 'reset', errorMessage: 'Bağlantı karşı taraftan kesildi' };
  if (/CERT|SSL|TLS/i.test(code)) return { errorType: 'ssl', errorMessage: 'SSL sertifikası geçersiz veya süresi dolmuş' };
  return { errorType: 'connection_error', errorMessage: 'Bağlantı kurulamadı' };
}

export async function checkHttp(url: string, timeoutSeconds: number): Promise<HttpResult> {
  let safeUrl: string;
  try {
    safeUrl = await validateMonitorUrl(url);
  } catch (e: any) {
    if (e instanceof DnsLookupError) {
      return { status: 'down', statusCode: null, responseTimeMs: null, errorType: 'dns', errorMessage: 'Alan adı çözümlenemedi (DNS)' };
    }
    return { status: 'down', statusCode: null, responseTimeMs: null, errorType: 'invalid_url', errorMessage: e?.message ?? 'Geçersiz adres' };
  }
  const started = Date.now();
  try {
    const res = await fetch(safeUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
    });
    const elapsed = Date.now() - started;
    // Gövdeyi okumadan bağlantıyı bırak
    res.body?.cancel().catch(() => {});
    const status = classifyStatus(res.status);
    return {
      status,
      statusCode: res.status,
      responseTimeMs: elapsed,
      errorType: status === 'up' ? null : 'http_status',
      errorMessage: status === 'up' ? null : `Sunucu ${res.status} döndürdü`,
    };
  } catch (err) {
    return { status: 'down', statusCode: null, responseTimeMs: null, ...describeNetworkError(err) };
  }
}

export type SslResult = { expiresAt: Date | null; issuer: string | null; error: string | null };

/** Sertifikayı okur; geçersiz olsa da bitiş tarihini döndürür (hata ayrıca belirtilir). */
export function checkSsl(url: string, timeoutSeconds: number): Promise<SslResult> {
  const { hostname, port } = new URL(url);
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: Number(port) || 443, servername: hostname, rejectUnauthorized: false, timeout: timeoutSeconds * 1000 });
    const done = (r: SslResult) => {
      socket.destroy();
      resolve(r);
    };
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      if (!cert?.valid_to) return done({ expiresAt: null, issuer: null, error: 'Sertifika okunamadı' });
      const issuer = (cert.issuer?.O as string | undefined) ?? (cert.issuer?.CN as string | undefined) ?? null;
      const error = socket.authorized ? null : `Sertifika doğrulanamadı (${String(socket.authorizationError ?? 'bilinmeyen')})`;
      done({ expiresAt: new Date(cert.valid_to), issuer, error });
    });
    socket.once('timeout', () => done({ expiresAt: null, issuer: null, error: 'SSL bağlantısı zaman aşımına uğradı' }));
    socket.once('error', () => done({ expiresAt: null, issuer: null, error: 'SSL bağlantısı kurulamadı' }));
  });
}

/** Kontrolü yapar ve kaydeder. SSL, https adreslerde 12 saatte bir (veya `forceSsl` ile) yenilenir. */
export async function runMonitorCheck(monitor: UptimeMonitor, { forceSsl = false } = {}) {
  const http = await checkHttp(monitor.url, monitor.timeoutSeconds);
  const now = new Date();

  const wantsSsl =
    monitor.url.startsWith('https://') &&
    http.errorType !== 'invalid_url' &&
    http.errorType !== 'dns' &&
    (forceSsl || !monitor.sslCheckedAt || now.getTime() - monitor.sslCheckedAt.getTime() > SSL_RECHECK_MS);
  const ssl = wantsSsl ? await checkSsl(monitor.url, monitor.timeoutSeconds) : null;

  const [check] = await prisma.$transaction([
    prisma.uptimeCheck.create({ data: { monitorId: monitor.id, ...http, checkedAt: now } }),
    prisma.uptimeMonitor.update({
      where: { id: monitor.id },
      data: {
        lastCheckedAt: now,
        ...(ssl ? { sslExpiresAt: ssl.expiresAt, sslIssuer: ssl.issuer, sslError: ssl.error, sslCheckedAt: now } : {}),
      },
    }),
  ]);
  return check;
}

export function checkToJson(c: { status: string; statusCode: number | null; responseTimeMs: number | null; errorType: string | null; errorMessage: string | null; checkedAt: Date }) {
  return {
    status: c.status,
    status_code: c.statusCode,
    response_time_ms: c.responseTimeMs,
    error_type: c.errorType,
    error_message: c.errorMessage,
    checked_at: c.checkedAt.toISOString(),
  };
}
