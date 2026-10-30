export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';
import { checkToJson, runMonitorCheck } from '@/lib/uptime/check';

/** POST /api/uptime { id } — eski istemciler için; /api/uptime/monitors/:id/check ile aynı */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? body?.monitor_id ?? '');
  if (!id) return NextResponse.json({ error: 'Monitör kimliği gereklidir' }, { status: 400 });
  const monitor = await prisma.uptimeMonitor.findFirst({ where: { id, brandId: ctx.brandId } });
  if (!monitor) return NextResponse.json({ error: 'Monitör bulunamadı' }, { status: 404 });
  return NextResponse.json(checkToJson(await runMonitorCheck(monitor, { forceSsl: true })));
}
