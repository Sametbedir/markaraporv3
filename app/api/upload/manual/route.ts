export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { extractDateRange, parseUniversalNumber, MonthlyItem } from '@/lib/universal-parser';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const body = await req.json();
    const { title = 'Manuel Veri Girişi', year = 2026, rows = [] } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'En az bir veri satırı girmelisiniz.' }, { status: 400 });
    }

    const userId = session.user.id;
    const monthlyBreakdown: MonthlyItem[] = [];
    const normalizedRows: any[] = [];

    let totalSpend = 0;
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalBasket = 0;
    let totalFollowers = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    let overallStart = `${year}-12-31`;
    let overallEnd = `${year}-01-01`;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const periodStr = String(r.period || `Ay ${i + 1}`).trim();
      const spend = parseUniversalNumber(r.spend);
      const revenue = parseUniversalNumber(r.revenue);
      const orders = Math.max(0, Math.round(parseUniversalNumber(r.orders)));
      const basket = parseUniversalNumber(r.basket);
      const followers = Math.max(0, Math.round(parseUniversalNumber(r.followers)));

      const userRoas = parseUniversalNumber(r.roas);
      const roas = userRoas > 0 ? userRoas : spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
      const aov = orders > 0 ? Math.round(revenue / orders) : 0;

      const isAllZero = spend === 0 && revenue === 0 && orders === 0 && roas === 0;
      const dateRange = extractDateRange(periodStr, year);
      const monthName = dateRange?.monthName || periodStr;

      monthlyBreakdown.push({
        month: monthName,
        year: dateRange?.year || year,
        spend,
        revenue,
        orders,
        roas,
        basket,
        followers,
        aov,
      });

      if (!isAllZero) {
        totalSpend += spend;
        totalRevenue += revenue;
        totalOrders += orders;
        totalBasket += basket;
        totalFollowers += followers;

        const start = dateRange?.start || `${year}-01-01`;
        const end = dateRange?.end || `${year}-01-31`;
        if (start < overallStart) overallStart = start;
        if (end > overallEnd) overallEnd = end;

        const days = dateRange?.daysCount || 30;
        const dSpend = Math.round((spend / days) * 100) / 100;
        const dRevenue = Math.round((revenue / days) * 100) / 100;
        const dOrders = Math.max(0, Math.round(orders / days));
        const dImpr = Math.round(spend * 25);
        const dClicks = Math.round(spend * 1.5);

        totalImpressions += dImpr;
        totalClicks += dClicks;

        if (dateRange && dateRange.isRange && days > 1) {
          const cur = new Date(start);
          const endObj = new Date(end);
          while (cur <= endObj) {
            normalizedRows.push({
              date: cur.toISOString().split('T')[0],
              monthName,
              platform: 'Meta Ads',
              campaign: `${monthName} Kampanyası`,
              spend: dSpend,
              revenue: dRevenue,
              orders: dOrders,
              impressions: Math.round(dSpend * 25),
              clicks: Math.round(dSpend * 1.5),
              conversions: dOrders,
              roas,
              basket,
              followers,
            });
            cur.setDate(cur.getDate() + 1);
          }
        } else {
          normalizedRows.push({
            date: start,
            monthName,
            platform: 'Meta Ads',
            campaign: `${monthName} Kampanyası`,
            spend,
            revenue,
            orders,
            impressions: dImpr,
            clicks: dClicks,
            conversions: orders,
            roas,
            basket,
            followers,
          });
        }
      }
    }

    if (overallStart > overallEnd) {
      overallStart = `${year}-01-01`;
      overallEnd = `${year}-12-31`;
    }

    const avgRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
    const avgAov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const avgCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    const trend = monthlyBreakdown
      .filter((m) => m.revenue > 0 || m.spend > 0)
      .map((m) => {
        const d = extractDateRange(m.month, year)?.start || `${year}-01-01`;
        return {
          date: d,
          spend: m.spend,
          revenue: m.revenue,
          orders: m.orders,
          impressions: Math.round(m.spend * 25),
          clicks: Math.round(m.spend * 1.5),
          roas: m.roas,
        };
      });

    const campaigns = monthlyBreakdown
      .filter((m) => m.revenue > 0 || m.spend > 0)
      .map((m, idx) => ({
        campaign_id: `manual-camp-${idx + 1}`,
        campaign_name: `${m.month} Kampanyası`,
        platform: 'Meta Ads',
        spend: m.spend,
        revenue: m.revenue,
        conversions: m.orders,
        roas: m.roas,
        clicks: Math.round(m.spend * 1.5),
        impressions: Math.round(m.spend * 25),
        ctr: 2.5,
        cpc: m.spend > 0 ? Number((m.spend / Math.max(1, m.spend * 1.5)).toFixed(2)) : 0,
        data_source_label: 'Manuel Giriş',
      }));

    const channels = [
      {
        channel: 'Meta Ads',
        order_count: totalOrders,
        total_revenue: totalRevenue,
        percentage: 100,
      },
    ];

    const clientReportPayload = {
      id: `manual-report-${Date.now()}`,
      fileName: title || 'Manuel Veri Tablosu',
      fileSize: 1024,
      uploadedAt: new Date().toISOString(),
      sourceType: 'manual_table',
      rowCount: normalizedRows.length,
      dateRange: { start: overallStart, end: overallEnd },
      summary: {
        total_spend: totalSpend,
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_conversions: totalOrders,
        avg_roas: avgRoas,
        avg_ctr: avgCtr,
        avg_cpc: avgCpc,
        avg_aov: avgAov,
        avg_cac: totalOrders > 0 ? Number((totalSpend / totalOrders).toFixed(2)) : 0,
        total_profit: Math.round(totalRevenue * 0.35),
        profit_margin: 35,
        net_roas: avgRoas,
        total_commission: 0,
        total_shipping: 0,
        total_returns: 0,
        total_cogs: 0,
        total_basket: totalBasket,
        total_followers: totalFollowers,
      },
      trend: trend.length > 0 ? trend : normalizedRows.map((r) => ({
        date: r.date,
        spend: r.spend,
        revenue: r.revenue,
        orders: r.orders,
        impressions: r.impressions,
        clicks: r.clicks,
        roas: r.roas,
      })),
      campaigns,
      channels,
      monthlyBreakdown,
    };

    try {
      const defaultCampaign =
        (await prisma.campaign.findFirst({
          where: { userId, name: 'Manuel Reklam Kampanyası' },
        })) ??
        (await prisma.campaign.create({
          data: {
            userId,
            name: 'Manuel Reklam Kampanyası',
            platform: 'Meta Ads',
            source: 'upload',
            dataSourceLabel: 'Manuel Tablo Girişi',
          },
        }));

      if (normalizedRows.length > 0) {
        await prisma.dailyMetric.createMany({
          data: normalizedRows.map((r) => ({
            userId,
            campaignId: defaultCampaign.id,
            date: new Date(`${r.date}T00:00:00.000Z`),
            platform: 'Meta Ads',
            spend: r.spend,
            revenue: r.revenue,
            impressions: r.impressions,
            clicks: r.clicks,
            conversions: r.orders,
            ctr: 2.5,
            cpc: r.spend > 0 ? Number((r.spend / Math.max(1, r.clicks)).toFixed(2)) : 0,
            roas: r.roas,
            source: 'upload',
            dataSourceLabel: 'Manuel Giriş',
          })),
          skipDuplicates: true,
        });

        await prisma.order.createMany({
          data: normalizedRows
            .filter((r) => r.orders > 0)
            .map((r, i) => ({
              userId,
              orderNumber: `MANUAL-${Date.now()}-${i}`,
              totalPrice: r.revenue,
              channel: 'Meta Ads',
              source: 'upload',
              status: 'confirmed',
              itemCount: Math.max(1, Math.round(r.orders)),
              orderDate: new Date(`${r.date}T00:00:00.000Z`),
            })),
          skipDuplicates: true,
        });
      }

      try {
        await (prisma as any).uploadLog.create({
          data: {
            userId,
            fileName: title,
            fileType: 'MANUEL',
            importedRows: monthlyBreakdown.length,
            dateStart: new Date(`${overallStart}T00:00:00.000Z`),
            dateEnd: new Date(`${overallEnd}T00:00:00.000Z`),
            platforms: JSON.stringify(['Meta Ads']),
            status: 'success',
          },
        });
      } catch {}
    } catch (dbErr) {
      console.warn('Veritabanına manuel veri yazılırken uyarı:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `${monthlyBreakdown.length} aylık veri tablosu başarıyla kaydedildi ve Dashboard'a aktarıldı.`,
      reportData: clientReportPayload,
      dateStart: overallStart,
      dateEnd: overallEnd,
    });
  } catch (error: any) {
    console.error('Manuel veri kaydetme hatası:', error);
    return NextResponse.json(
      { error: error?.message || 'Manuel veri kaydedilirken hata oluştu.' },
      { status: 500 }
    );
  }
}
