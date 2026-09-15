export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { validateMonitorUrl } from '@/lib/safe-url';
import { demoMonitors } from '@/lib/demo-data';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const { id } = await params;
  if (session.user.id === 'admin-demo-user') {
    const monitor = demoMonitors.find((item) => item.id === id);
    if (!monitor) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });
    const started = Date.now();
    try {
      const safeUrl = await validateMonitorUrl(monitor.url);
      const response = await fetch(safeUrl, { redirect: 'manual', signal: AbortSignal.timeout(monitor.timeout_seconds * 1000) });
      monitor.current = { status: response.status < 400 ? 'up' : response.status >= 500 ? 'down' : 'warning', status_code: response.status, response_time_ms: Date.now() - started, checked_at: new Date().toISOString() };
    } catch {
      monitor.current = { status: 'down', error_message: 'Bağlantı kurulamadı', checked_at: new Date().toISOString() };
    }
    return NextResponse.json(monitor.current);
  }
  const monitor = await prisma.uptimeMonitor.findFirst({ where: { id, userId: session.user.id } });
  if (!monitor) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeoutSeconds * 1000);
    const safeUrl = await validateMonitorUrl(monitor.url);
    const response = await fetch(safeUrl, { signal: controller.signal, redirect: 'manual', headers: { 'User-Agent': 'MarkaRapor-UptimeMonitor/1.0' } });
    clearTimeout(timeoutId);
    const status = response.status >= 200 && response.status < 400 ? 'up' : response.status >= 500 ? 'down' : 'warning';
    const check = await prisma.uptimeCheck.create({ data: { monitorId: monitor.id, status, statusCode: response.status, responseTimeMs: Date.now() - startTime } });
    return NextResponse.json({ status: check.status, status_code: check.statusCode, response_time_ms: check.responseTimeMs, checked_at: check.checkedAt.toISOString() });
  } catch (error: any) {
    const check = await prisma.uptimeCheck.create({ data: { monitorId: monitor.id, status: 'down', errorType: error?.name === 'AbortError' ? 'timeout' : 'connection_error', errorMessage: 'Bağlantı kurulamadı' } });
    return NextResponse.json({ status: check.status, error_type: check.errorType, error_message: check.errorMessage, checked_at: check.checkedAt.toISOString() });
  }
}
