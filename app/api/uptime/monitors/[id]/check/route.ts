export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { checkToJson, runMonitorCheck } from '@/lib/uptime/check';

/** POST /api/uptime/monitors/:id/check — şimdi kontrol et (SSL dahil) */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const monitor = await prisma.uptimeMonitor.findFirst({ where: { id, brandId: ctx.brandId } });
  if (!monitor) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });
  return NextResponse.json(checkToJson(await runMonitorCheck(monitor, { forceSsl: true })));
}
