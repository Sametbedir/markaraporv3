export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { validateMonitorUrl } from '@/lib/safe-url';

export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brandId } = ctx;

  const monitors = await prisma.uptimeMonitor.findMany({
    where: { brandId },
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = (monitors ?? []).map((m: any) => {
    const lastCheck = m.checks?.[0] ?? null;
    return {
      id: m.id,
      name: m.name,
      url: m.url,
      interval_seconds: m.intervalSeconds,
      timeout_seconds: m.timeoutSeconds,
      is_active: m.isActive,
      current: lastCheck ? {
        status: lastCheck.status,
        status_code: lastCheck.statusCode,
        response_time_ms: lastCheck.responseTimeMs,
        error_message: lastCheck.errorMessage,
        checked_at: lastCheck.checkedAt?.toISOString?.(),
      } : null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const { name, url, interval_seconds = 300, timeout_seconds = 15 } = body ?? {};

  if (!name || !url) {
    return NextResponse.json({ error: 'Ad ve URL gereklidir' }, { status: 400 });
  }

  if (Number(interval_seconds) < 60 || Number(interval_seconds) > 86400 || Number(timeout_seconds) < 1 || Number(timeout_seconds) > 60) {
    return NextResponse.json({ error: 'Minimum kontrol aralığı 60 saniyedir' }, { status: 400 });
  }

  const rawUrl = String(url).trim();
  let monitorUrl: string;
  try {
    monitorUrl = await validateMonitorUrl(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Geçersiz URL' }, { status: 400 });
  }

  const monitor = await prisma.uptimeMonitor.create({
    data: {
      userId: ctx.userId,
      brandId: ctx.brandId,
      name: String(name).trim(),
      url: monitorUrl,
      intervalSeconds: Number(interval_seconds),
      timeoutSeconds: Number(timeout_seconds),
    },
  });

  // Do initial check
  let checkResult: any = null;
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout_seconds * 1000);
    
    const response = await fetch(monitorUrl, {
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'MarkaRapor-UptimeMonitor/1.0' },
    });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

    const status = response.status >= 200 && response.status < 400 ? 'up' : response.status >= 500 ? 'down' : 'warning';

    checkResult = await prisma.uptimeCheck.create({
      data: {
        monitorId: monitor.id,
        status,
        statusCode: response.status,
        responseTimeMs: elapsed,
      },
    });
  } catch {
    checkResult = await prisma.uptimeCheck.create({
      data: {
        monitorId: monitor.id,
        status: 'down',
        errorType: 'connection_error',
        errorMessage: 'Bağlantı kurulamadı',
      },
    });
  }

  return NextResponse.json({
    monitor: {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
    },
    result: checkResult,
  });
}
