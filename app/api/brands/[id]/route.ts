export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { brandToJson, errorResponse, requireUser } from '@/lib/brand';
import { validateBrandInput } from '@/lib/brand-select';

/** PATCH /api/brands/:id — ad, site, sektör, logo, para birimi; `archived: true/false` ile arşivle/geri al */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const parsed = validateBrandInput(body, true);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const brand = await prisma.brand.findFirst({ where: { id, userId: user.userId } });
    if (!brand) return NextResponse.json({ error: 'Marka bulunamadı' }, { status: 404 });

    let archivedAt: Date | null | undefined;
    if (typeof body?.archived === 'boolean') {
      if (body.archived && !brand.archivedAt) {
        const others = await prisma.brand.count({ where: { userId: user.userId, archivedAt: null, id: { not: id } } });
        if (!others) return NextResponse.json({ error: 'Son aktif marka arşivlenemez. Önce başka bir marka ekleyin.' }, { status: 400 });
      }
      archivedAt = body.archived ? brand.archivedAt ?? new Date() : null;
    }

    const updated = await prisma.brand.update({ where: { id }, data: { ...parsed.data, archivedAt } });
    return NextResponse.json(brandToJson(updated));
  } catch (error) {
    return errorResponse(error);
  }
}
