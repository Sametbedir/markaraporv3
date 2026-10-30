export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BRAND_COOKIE, BrandError, brandToJson, errorResponse, requireBrand, requireUser, resolveActiveBrand } from '@/lib/brand';
import { validateBrandInput } from '@/lib/brand-select';

/** GET /api/brands — kullanıcının tüm markaları (arşivlenenler dahil) ve aktif marka */
export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  try {
    // Tüm markalar arşivdeyse aktif marka yoktur; liste yine döner ki geri alınabilsin
    let activeId: string | null = null;
    try {
      activeId = (await resolveActiveBrand(user.userId)).id;
    } catch (error) {
      if (!(error instanceof BrandError && error.status === 409)) throw error;
    }
    const brands = await prisma.brand.findMany({ where: { userId: user.userId }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ active_id: activeId, brands: brands.map(brandToJson) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/brands — yeni marka oluşturur ve aktif marka yapar */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const parsed = validateBrandInput(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    // Kullanıcının ilk markası değilse eski kayıtlar zaten varsayılan markaya taşınmıştır;
    // ilk markaysa önce varsayılan marka oluşturulsun ki markasız veri sahipsiz kalmasın.
    const ctx = await requireBrand();
    if (ctx instanceof NextResponse && ctx.status !== 409) return ctx;

    const brand = await prisma.brand.create({ data: { userId: user.userId, name: parsed.data.name!, ...parsed.data } });
    const res = NextResponse.json(brandToJson(brand), { status: 201 });
    res.cookies.set(BRAND_COOKIE, brand.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
