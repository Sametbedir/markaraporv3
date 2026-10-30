/**
 * Bir markanın bir takvim ayına ait raporu (sunucuda, doğrudan veritabanından).
 * Müşteri sayfası bunu kullanır; tarayıcıya yalnızca bu özet gider, ham kayıtlar gitmez.
 */

import { prisma } from '@/lib/prisma';
import { storeOrderWhere } from '@/lib/store-orders';
import type { CampaignPerformance } from '@/lib/types';
import { activeCampaigns, hasActivity, kpis, platformBreakdown, type PlatformRow, type ReportKpis, type ReportTotals } from './metrics';
import { monthRange, previousMonth } from './months';
import { computeExtras, type ExtraMetric } from '@/lib/metrics/extra';
import { parseKpiKeys } from '@/lib/metrics/catalog';

export type BrandMonthReport = {
  month: string;
  start: string;
  end: string;
  current: ReportKpis | null;
  previous: ReportKpis | null;
  trend: { date: string; spend: number; conversionValue: number }[];
  platforms: PlatformRow[];
  campaigns: CampaignPerformance[];
  /** Tek para birimi varsa o; birden fazlaysa null (karışık para birimi uyarısı gösterilir) */
  currency: string | null;
  mixedCurrencies: boolean;
  /** Markanın seçtiği KPI'lar (sıralı); null ise varsayılan set gösterilir */
  kpiKeys: string[] | null;
  /** Markaya özel ve formül metrikleri */
  extra: ExtraMetric[];
};

async function customSums(brandId: string, start: string, end: string): Promise<Record<string, number>> {
  const rows = await prisma.customMetricValue.groupBy({
    by: ['key'],
    where: { brandId, date: { gte: utc(start), lte: utc(end) } },
    _sum: { value: true },
  });
  return Object.fromEntries(rows.filter((r) => r._sum.value !== null).map((r) => [r.key, r._sum.value as number]));
}

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function totals(brandId: string, start: string, end: string): Promise<ReportTotals> {
  const [m, orders] = await Promise.all([
    prisma.dailyMetric.aggregate({
      where: { brandId, date: { gte: utc(start), lte: utc(end) } },
      _sum: { spend: true, revenue: true, conversions: true, impressions: true, clicks: true },
    }),
    prisma.order.count({
      where: { brandId, ...storeOrderWhere, orderDate: { gte: utc(start), lt: new Date(utc(end).getTime() + 86400000) } },
    }),
  ]);
  return {
    spend: m._sum.spend ?? 0,
    conversionValue: m._sum.revenue ?? 0,
    conversions: m._sum.conversions ?? 0,
    impressions: m._sum.impressions ?? 0,
    clicks: m._sum.clicks ?? 0,
    storeOrders: orders > 0 ? orders : null,
  };
}

/** Verisi olan aylar (yeniden eskiye, en fazla 24). */
export async function availableMonths(brandId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ m: string }[]>`
    SELECT DISTINCT to_char(date, 'YYYY-MM') AS m FROM daily_metrics
    WHERE brand_id = ${brandId} ORDER BY m DESC LIMIT 24`;
  return rows.map((r) => r.m);
}

export async function buildBrandMonthReport(
  brand: { id: string; currency: string; reportKpis: string | null },
  month: string
): Promise<BrandMonthReport> {
  const brandId = brand.id;
  const fallbackCurrency = brand.currency;
  const { start, end } = monthRange(month);
  const prev = monthRange(previousMonth(month));
  const range = { gte: utc(start), lte: utc(end) };

  const [defs, customCur, customPrev] = await Promise.all([
    prisma.metricDefinition.findMany({ where: { brandId }, orderBy: { createdAt: 'asc' } }),
    customSums(brandId, start, end),
    customSums(brandId, prev.start, prev.end),
  ]);

  const [cur, prevTotals, daily, byCampaign, currencies] = await Promise.all([
    totals(brandId, start, end),
    totals(brandId, prev.start, prev.end),
    prisma.dailyMetric.groupBy({
      by: ['date'],
      where: { brandId, date: range },
      _sum: { spend: true, revenue: true },
      orderBy: { date: 'asc' },
    }),
    prisma.dailyMetric.groupBy({
      by: ['campaignId', 'platform'],
      where: { brandId, date: range },
      _sum: { spend: true, revenue: true, conversions: true, impressions: true, clicks: true },
    }),
    prisma.dailyMetric.findMany({
      where: { brandId, date: range, currency: { not: null } },
      distinct: ['currency'],
      select: { currency: true },
    }),
  ]);

  const names = new Map(
    (await prisma.campaign.findMany({
      where: { brandId, id: { in: byCampaign.map((c) => c.campaignId).filter((id): id is string => !!id) } },
      select: { id: true, name: true },
    })).map((c) => [c.id, c.name])
  );

  const campaigns: CampaignPerformance[] = byCampaign.map((c) => {
    const spend = c._sum.spend ?? 0;
    const revenue = c._sum.revenue ?? 0;
    const impressions = c._sum.impressions ?? 0;
    const clicks = c._sum.clicks ?? 0;
    return {
      campaign_id: c.campaignId ?? `${c.platform}|-`,
      campaign_name: (c.campaignId && names.get(c.campaignId)) || 'Kampanya adı yok',
      platform: c.platform,
      impressions,
      clicks,
      spend,
      conversions: c._sum.conversions ?? 0,
      revenue,
      roas: spend ? revenue / spend : 0,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpc: clicks ? spend / clicks : 0,
      data_source_label: '',
    };
  });

  const active = activeCampaigns(campaigns);
  const codes = currencies.map((c) => c.currency!).filter(Boolean);

  return {
    month,
    start,
    end,
    current: hasActivity(cur) ? kpis(cur) : null,
    previous: hasActivity(prevTotals) ? kpis(prevTotals) : null,
    trend: daily.map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      spend: d._sum.spend ?? 0,
      conversionValue: d._sum.revenue ?? 0,
    })),
    platforms: platformBreakdown(active),
    campaigns: active,
    currency: codes.length === 1 ? codes[0] : codes.length === 0 ? fallbackCurrency : null,
    mixedCurrencies: codes.length > 1,
    kpiKeys: parseKpiKeys(brand.reportKpis),
    extra: computeExtras(
      defs,
      { totals: hasActivity(cur) ? cur : null, custom: customCur },
      { totals: hasActivity(prevTotals) ? prevTotals : null, custom: customPrev }
    ),
  };
}
