export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoMetricsInRange } from '@/lib/demo-data';

/** Kullanıcının yüklü reklam verisinin ilk ve son tarihi (veri yoksa null). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  if (session.user.id === 'admin-demo-user') {
    const dates = demoMetricsInRange().map((m) => m.date).sort();
    return NextResponse.json({ start: dates[0] ?? null, end: dates[dates.length - 1] ?? null });
  }

  try {
    const agg = await prisma.dailyMetric.aggregate({
      where: { userId: session.user.id },
      _min: { date: true },
      _max: { date: true },
    });
    const iso = (d: Date | null) => (d ? d.toISOString().split('T')[0] : null);
    return NextResponse.json({ start: iso(agg._min.date), end: iso(agg._max.date) });
  } catch {
    return NextResponse.json({ start: null, end: null });
  }
}
