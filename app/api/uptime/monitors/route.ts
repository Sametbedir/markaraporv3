export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { validateMonitorUrl } from '@/lib/safe-url';
import { checkToJson, runMonitorCheck } from '@/lib/uptime/check';
import { monitorSummaries } from '@/lib/uptime/summary';
import { validateTiming } from '@/lib/uptime/stats';

/** GET /api/uptime/monitors — aktif markanın monitörleri; 24 saat/7 gün/30 gün istatistik, SSL, kesintiler */
export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(await monitorSummaries(ctx.brandId));
}

/** POST /api/uptime/monitors { name, url, interval_seconds, timeout_seconds } — ekler ve hemen kontrol eder */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim().slice(0, 80);
  const rawUrl = String(body?.url ?? '').trim();
  if (!name || !rawUrl) return NextResponse.json({ error: 'Ad ve URL gereklidir' }, { status: 400 });

  const timing = validateTiming(body?.interval_seconds ?? 300, body?.timeout_seconds ?? 15);
  if ('error' in timing) return NextResponse.json({ error: timing.error }, { status: 400 });

  let url: string;
  try {
    url = await validateMonitorUrl(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Geçersiz URL' }, { status: 400 });
  }

  const monitor = await prisma.uptimeMonitor.create({
    data: { userId: ctx.userId, brandId: ctx.brandId, name, url, intervalSeconds: timing.interval, timeoutSeconds: timing.timeout },
  });
  const check = await runMonitorCheck(monitor, { forceSsl: true });
  return NextResponse.json({ monitor: { id: monitor.id, name: monitor.name, url: monitor.url }, result: checkToJson(check) }, { status: 201 });
}
