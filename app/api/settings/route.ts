export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { demoSettings } from '@/lib/demo-data';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  if (session.user.id === 'admin-demo-user') return NextResponse.json(demoSettings);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
    commission_rate_trendyol: user.commissionRateTrendyol,
    commission_rate_hepsiburada: user.commissionRateHepsiburada,
    commission_rate_shopify: user.commissionRateShopify,
    commission_rate_ikas: user.commissionRateIkas,
    commission_rate_ticimax: user.commissionRateTicimax,
    shipping_cost_per_order: user.shippingCostPerOrder,
    return_rate: user.returnRate,
    product_cogs_rate: user.productCogsRate,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const body = await req.json();
  const secret = (value: unknown) => {
    const text = String(value ?? '');
    return text.trim() ? text : undefined;
  };

  if (session.user.id === 'admin-demo-user') {
    Object.assign(demoSettings, body, { updated_at: new Date().toISOString() });
    return NextResponse.json({ message: 'Ayarlar demo modunda kaydedildi', storage: 'demo-memory' });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
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
        commissionRateTrendyol: body.commission_rate_trendyol !== undefined ? Number(body.commission_rate_trendyol) : undefined,
        commissionRateHepsiburada: body.commission_rate_hepsiburada !== undefined ? Number(body.commission_rate_hepsiburada) : undefined,
        commissionRateShopify: body.commission_rate_shopify !== undefined ? Number(body.commission_rate_shopify) : undefined,
        commissionRateIkas: body.commission_rate_ikas !== undefined ? Number(body.commission_rate_ikas) : undefined,
        commissionRateTicimax: body.commission_rate_ticimax !== undefined ? Number(body.commission_rate_ticimax) : undefined,
        shippingCostPerOrder: body.shipping_cost_per_order !== undefined ? Number(body.shipping_cost_per_order) : undefined,
        returnRate: body.return_rate !== undefined ? Number(body.return_rate) : undefined,
        productCogsRate: body.product_cogs_rate !== undefined ? Number(body.product_cogs_rate) : undefined,
      },
    });

    return NextResponse.json({ message: 'Ayarlar güncellendi' });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Ayarlar güncellenirken hata oluştu' }, { status: 500 });
  }
}
