export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BRAND_COOKIE, errorResponse, requireUser } from '@/lib/brand';

/** POST /api/brands/active { id } — aktif markayı değiştirir (yalnızca kullanıcının kendi markası) */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? '');

  try {
    const brand = await prisma.brand.findFirst({ where: { id, userId: user.userId, archivedAt: null } });
    if (!brand) return NextResponse.json({ error: 'Marka bulunamadı' }, { status: 404 });
    const res = NextResponse.json({ active_id: brand.id });
    res.cookies.set(BRAND_COOKIE, brand.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
