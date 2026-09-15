export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoGoals } from '@/lib/demo-data';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const { id } = await params;

  if (session.user.id === 'admin-demo-user') {
    const index = demoGoals.findIndex((goal) => goal.id === id);
    if (index < 0) return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
    demoGoals.splice(index, 1);
    return NextResponse.json({ message: 'Hedef silindi' });
  }

  const deleted = await prisma.goal.deleteMany({ where: { id, userId: session.user.id } });
  if (!deleted.count) return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
  return NextResponse.json({ message: 'Hedef silindi' });
}