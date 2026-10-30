export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { brand } = ctx;

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  }

  return NextResponse.json({
    name: user.name,
    company_name: user.companyName,
    website: user.website,
    industry: user.industry,
    has_meta_access_token: Boolean(user.metaAccessToken),
    meta_ad_account_id: user.metaAdAccountId ?? '',
    has_google_ads_refresh_token: Boolean(user.googleAdsRefreshToken),
    google_ads_customer_id: user.googleAdsCustomerId ?? '',
    has_tiktok_access_token: Boolean(user.tiktokAccessToken),
    tiktok_advertiser_id: user.tiktokAdvertiserId ?? '',
    shopify_shop_url: user.shopifyShopUrl ?? '',
    has_shopify_access_token: Boolean(user.shopifyAccessToken),
    ga4_property_id: user.ga4PropertyId ?? '',
    ga4_client_email: user.ga4ClientEmail ?? '',
    ikas_store_url: user.ikasStoreUrl ?? '',
    has_ikas_access_token: Boolean(user.ikasAccessToken),
    has_ticimax_api_key: Boolean(user.ticimaxApiKey),
    ticimax_store_id: user.ticimaxStoreId ?? '',
    commission_rate_trendyol: brand.commissionRateTrendyol,
    commission_rate_hepsiburada: brand.commissionRateHepsiburada,
    commission_rate_shopify: brand.commissionRateShopify,
    commission_rate_ikas: brand.commissionRateIkas,
    commission_rate_ticimax: brand.commissionRateTicimax,
    shipping_cost_per_order: brand.shippingCostPerOrder,
    return_rate: brand.returnRate,
    product_cogs_rate: brand.productCogsRate,
    // Gider yapısı aktif markaya aittir
    brand_id: brand.id,
    brand_name: brand.name,
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const secret = (value: unknown) => {
    const text = String(value ?? '');
    return text.trim() ? text : undefined;
  };

  // Boş veya sayı olmayan oran 0'a çevrilmez; alan güncellenmez
  const rate = (value: unknown) => {
    if (value === undefined || value === null || String(value).trim() === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  try {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        name: body.name ?? undefined,
        companyName: body.company_name ?? undefined,
        website: body.website ?? undefined,
        industry: body.industry ?? undefined,
        metaAccessToken: secret(body.meta_access_token),
        metaAdAccountId: body.meta_ad_account_id ?? undefined,
        googleAdsRefreshToken: secret(body.google_ads_refresh_token),
        googleAdsCustomerId: body.google_ads_customer_id ?? undefined,
        tiktokAccessToken: secret(body.tiktok_access_token),
        tiktokAdvertiserId: body.tiktok_advertiser_id ?? undefined,
        shopifyShopUrl: body.shopify_shop_url ?? undefined,
        shopifyAccessToken: secret(body.shopify_access_token),
        ga4PropertyId: body.ga4_property_id ?? undefined,
        ga4ClientEmail: body.ga4_client_email ?? undefined,
        ikasStoreUrl: body.ikas_store_url ?? undefined,
        ikasAccessToken: secret(body.ikas_access_token),
        ticimaxApiKey: secret(body.ticimax_api_key),
        ticimaxStoreId: body.ticimax_store_id ?? undefined,
      },
    });

    await prisma.brand.update({
      where: { id: ctx.brandId },
      data: {
        commissionRateTrendyol: rate(body.commission_rate_trendyol),
        commissionRateHepsiburada: rate(body.commission_rate_hepsiburada),
        commissionRateShopify: rate(body.commission_rate_shopify),
        commissionRateIkas: rate(body.commission_rate_ikas),
        commissionRateTicimax: rate(body.commission_rate_ticimax),
        shippingCostPerOrder: rate(body.shipping_cost_per_order),
        returnRate: rate(body.return_rate),
        productCogsRate: rate(body.product_cogs_rate),
      },
    });

    return NextResponse.json({ message: `Ayarlar güncellendi (gider yapısı: ${ctx.brand.name})` });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Ayarlar güncellenirken hata oluştu' }, { status: 500 });
  }
}
