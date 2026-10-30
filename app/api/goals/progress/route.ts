export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { goalProgress } from '@/lib/report/goal-progress';

export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;

  const rows = await goalProgress(ctx.brandId, { activeOnly: false });
  return NextResponse.json(rows.map(({ id, currentValue, percentage }) => ({ id, currentValue, percentage })));
}
