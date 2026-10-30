export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { validateTiming } from '@/lib/uptime/stats';

/** PATCH /api/uptime/monitors/:id { name?, is_active?, interval_seconds?, timeout_seconds? } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const monitor = await prisma.uptimeMonitor.findFirst({ where: { id, brandId: ctx.brandId } });
  if (!monitor) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; isActive?: boolean; intervalSeconds?: number; timeoutSeconds?: number } = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: 'Ad gereklidir' }, { status: 400 });
    data.name = name;
  }
  if (typeof body?.is_active === 'boolean') data.isActive = body.is_active;
  if (body?.interval_seconds !== undefined || body?.timeout_seconds !== undefined) {
    const timing = validateTiming(body?.interval_seconds ?? monitor.intervalSeconds, body?.timeout_seconds ?? monitor.timeoutSeconds);
    if ('error' in timing) return NextResponse.json({ error: timing.error }, { status: 400 });
    data.intervalSeconds = timing.interval;
    data.timeoutSeconds = timing.timeout;
  }
  await prisma.uptimeMonitor.update({ where: { id }, data });
  return NextResponse.json({ message: 'Monitör güncellendi' });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const deleted = await prisma.uptimeMonitor.deleteMany({ where: { id, brandId: ctx.brandId } });
  if (!deleted.count) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });
  return NextResponse.json({ message: 'Monitör silindi' });
}
