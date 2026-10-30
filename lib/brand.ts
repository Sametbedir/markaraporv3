/**
 * Aktif marka ve yetki kontrolü.
 *
 * Her API isteği `requireBrand()` ile başlar: oturum kontrol edilir, çerezdeki marka bu kullanıcıya
 * aitse o seçilir, değilse kullanıcının ilk markası kullanılır. Böylece bir markanın verisi
 * başka bir hesaba hiçbir yoldan dönmez; sorgular `brandId` ile filtrelenir.
 *
 * Kullanıcının hiç markası yoksa (ilk giriş veya eski hesap) "Markam" oluşturulur ve markasız
 * eski kayıtlar ona taşınır. Hiçbir veri silinmez.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Brand, Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { pickBrand } from '@/lib/brand-select';

export const BRAND_COOKIE = 'mr_brand';

export type BrandContext = { userId: string; brandId: string; brand: Brand };

const LEGACY_TABLES = [
  'campaign', 'dailyMetric', 'order', 'manualEntry', 'uploadLog', 'goal', 'uptimeMonitor', 'simulationResult',
] as const;

/** Markasız eski kayıtları verilen markaya bağlar. Aynı işlem tekrar çalışırsa etkisizdir. */
async function adoptLegacyRows(tx: Prisma.TransactionClient, userId: string, brandId: string) {
  for (const table of LEGACY_TABLES) {
    await (tx[table] as any).updateMany({ where: { userId, brandId: null }, data: { brandId } });
  }
}

async function createDefaultBrand(userId: string): Promise<Brand> {
  return prisma.$transaction(async (tx) => {
    // Aynı anda gelen iki istek iki ayrı varsayılan marka oluşturmasın
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const existing = await tx.brand.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (existing) return existing;

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new BrandError(401, 'Oturum geçersiz. Lütfen çıkış yapıp tekrar giriş yapın.');

    const brand = await tx.brand.create({
      data: {
        userId,
        name: user.companyName?.trim() || 'Markam',
        website: user.website,
        industry: user.industry,
        commissionRateTrendyol: user.commissionRateTrendyol,
        commissionRateHepsiburada: user.commissionRateHepsiburada,
        commissionRateShopify: user.commissionRateShopify,
        commissionRateIkas: user.commissionRateIkas,
        commissionRateTicimax: user.commissionRateTicimax,
        shippingCostPerOrder: user.shippingCostPerOrder,
        returnRate: user.returnRate,
        productCogsRate: user.productCogsRate,
      },
    });
    await adoptLegacyRows(tx, userId, brand.id);
    return brand;
  }, { timeout: 60_000 });
}

export class BrandError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Kullanıcının aktif markası; hiç markası yoksa varsayılanı oluşturur. */
export async function resolveActiveBrand(userId: string): Promise<Brand> {
  const jar = await cookies();
  const brands = await prisma.brand.findMany({ where: { userId, archivedAt: null }, orderBy: { createdAt: 'asc' } });
  const picked = pickBrand(brands, jar.get(BRAND_COOKIE)?.value);
  if (picked) return picked;

  // Tüm markaları arşivlenmişse yenisini kendiliğinden açmayız
  const archived = await prisma.brand.count({ where: { userId } });
  if (archived) throw new BrandError(409, 'Aktif marka yok. Markalar sayfasından bir markayı geri alın veya yeni marka ekleyin.');
  return createDefaultBrand(userId);
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof BrandError) return NextResponse.json({ error: error.message }, { status: error.status });
  if ((error as any)?.name === 'PrismaClientInitializationError') {
    return NextResponse.json(
      { error: 'Veritabanına bağlanılamadı. .env dosyasındaki DATABASE_URL ayarını kontrol edin.' },
      { status: 503 }
    );
  }
  throw error;
}

/** Oturum + aktif marka; başarısızsa doğrudan döndürülecek yanıt. */
export async function requireBrand(): Promise<BrandContext | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  try {
    const brand = await resolveActiveBrand(userId);
    return { userId, brandId: brand.id, brand };
  } catch (error) {
    return errorResponse(error);
  }
}

/** Yalnızca oturum gereken (marka seçmeyen) uç noktalar için. */
export async function requireUser(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  return { userId };
}

/** Markanın gider yapısı; kâr hesaplarında kullanılır. */
export function brandCosts(brand: Brand) {
  const commissions = [
    brand.commissionRateTrendyol, brand.commissionRateHepsiburada, brand.commissionRateShopify,
    brand.commissionRateIkas, brand.commissionRateTicimax,
  ];
  return {
    avgCommission: commissions.reduce((a, b) => a + b, 0) / commissions.length,
    shippingCostPerOrder: brand.shippingCostPerOrder,
    returnRate: brand.returnRate,
    productCogsRate: brand.productCogsRate,
  };
}

export function brandToJson(b: Brand) {
  return {
    id: b.id,
    name: b.name,
    website: b.website,
    industry: b.industry,
    logo_url: b.logoUrl,
    currency: b.currency,
    archived: b.archivedAt !== null,
    created_at: b.createdAt.toISOString(),
  };
}
