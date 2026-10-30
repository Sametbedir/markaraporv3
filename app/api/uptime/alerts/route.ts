export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { monitorSummaries } from '@/lib/uptime/summary';

/** GET /api/uptime/alerts — aktif markanın şu anki uyarıları (erişilemeyen site, SSL bitişi) */
export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const monitors = await monitorSummaries(ctx.brandId, { activeOnly: true });
  return NextResponse.json({ alerts: monitors.flatMap((m) => m.alerts) });
}
