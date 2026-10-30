/**
 * Arka plan uptime zamanlayıcısı: uygulama (Node sunucusu) açıkken her monitörü kendi aralığında kontrol eder.
 *
 * - instrumentation.ts tarafından sunucu açılışında bir kez başlatılır; geliştirme modunda
 *   yeniden yüklemelerde ikinci kopya açılmaz (globalThis bayrağı).
 * - Sunucu kapalıyken kontrol yapılmaz; açılınca vadesi geçen monitörler hemen kontrol edilir.
 * - Kapatmak için .env: UPTIME_SCHEDULER="off"
 */

import { prisma } from '@/lib/prisma';
import { runMonitorCheck } from './check';

const TICK_MS = 30_000;
const BATCH = 20;
const CONCURRENCY = 5;
const RETENTION_DAYS = 90;
const CLEANUP_EVERY_MS = 24 * 60 * 60 * 1000;

type State = { timer: NodeJS.Timeout | null; running: boolean; lastCleanup: number };
const g = globalThis as typeof globalThis & { markaRaporUptime?: State };

/** Hiç kontrol edilmemiş veya son kontrolün üzerinden aralığı kadar geçmiş */
export function isDue(m: { lastCheckedAt: Date | null; intervalSeconds: number }, now: Date): boolean {
  return !m.lastCheckedAt || now.getTime() - m.lastCheckedAt.getTime() >= m.intervalSeconds * 1000;
}

/** Vadesi gelen monitörler, en uzun süredir kontrol edilmeyenden başlayarak */
export async function dueMonitors(now = new Date()) {
  const candidates = await prisma.uptimeMonitor.findMany({
    where: { isActive: true, brand: { archivedAt: null } },
    orderBy: { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
    take: BATCH * 5,
  });
  return candidates
    .filter((m) => isDue(m, now))
    .slice(0, BATCH);
}

async function tick(state: State) {
  if (state.running) return; // önceki tur bitmeden yenisi başlamaz
  state.running = true;
  try {
    const due = await dueMonitors();
    for (let i = 0; i < due.length; i += CONCURRENCY) {
      await Promise.all(
        due.slice(i, i + CONCURRENCY).map((m) =>
          runMonitorCheck(m).catch((e) => console.error(`[uptime] ${m.name} kontrol edilemedi:`, e?.message ?? e))
        )
      );
    }
    if (Date.now() - state.lastCleanup > CLEANUP_EVERY_MS) {
      state.lastCleanup = Date.now();
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000);
      await prisma.uptimeCheck.deleteMany({ where: { checkedAt: { lt: cutoff } } });
    }
  } catch (e: any) {
    // Veritabanı geçici olarak erişilemezse bir sonraki turda tekrar denenir
    console.error('[uptime] zamanlayıcı turu başarısız:', e?.message ?? e);
  } finally {
    state.running = false;
  }
}

export function startUptimeScheduler() {
  if (process.env.UPTIME_SCHEDULER === 'off') return;
  if (!process.env.DATABASE_URL) {
    console.warn('[uptime] DATABASE_URL tanımlı değil; otomatik kontroller başlatılmadı.');
    return;
  }
  if (g.markaRaporUptime?.timer) return;
  const state: State = { timer: null, running: false, lastCleanup: 0 };
  g.markaRaporUptime = state;
  state.timer = setInterval(() => void tick(state), TICK_MS);
  state.timer.unref?.();
  // Açılıştan kısa süre sonra ilk tur
  setTimeout(() => void tick(state), 5_000).unref?.();
  console.log('[uptime] otomatik kontroller başladı (30 sn\'de bir vadesi gelen monitörler kontrol edilir).');
}
