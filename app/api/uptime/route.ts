export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { validateMonitorUrl } from '@/lib/safe-url';

export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? body?.monitor_id ?? '');
  if (!id) return NextResponse.json({ error: 'Monitör kimliği gereklidir' }, { status: 400 });

  const monitor = await prisma.uptimeMonitor.findFirst({
    where: { id, brandId },
  });
  if (!monitor) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeoutSeconds * 1000);

    const safeUrl = await validateMonitorUrl(monitor.url);
    const response = await fetch(safeUrl, {
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'MarkaRapor-UptimeMonitor/1.0' },
    });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

    const status = response.status >= 200 && response.status < 400 ? 'up' : response.status >= 500 ? 'down' : 'warning';

    const check = await prisma.uptimeCheck.create({
      data: {
        monitorId: monitor.id,
        status,
        statusCode: response.status,
        responseTimeMs: elapsed,
      },
    });

    return NextResponse.json({
      status: check.status,
      status_code: check.statusCode,
      response_time_ms: check.responseTimeMs,
      checked_at: check.checkedAt?.toISOString?.(),
    });
  } catch (err: any) {
    const check = await prisma.uptimeCheck.create({
      data: {
        monitorId: monitor.id,
        status: 'down',
        errorType: err?.name === 'AbortError' ? 'timeout' : 'connection_error',
        errorMessage: err?.name === 'AbortError' ? 'Zaman aşımı' : 'Bağlantı kurulamadı',
      },
    });

    return NextResponse.json({
      status: check.status,
      error_type: check.errorType,
      error_message: check.errorMessage,
      checked_at: check.checkedAt?.toISOString?.(),
    });
  }
}
