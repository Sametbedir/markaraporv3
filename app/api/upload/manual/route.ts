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
    const userId = session.user.id;

    // Check if this is the single-form submission from the UI
    // Fields: date, platform, campaign, adGroup, adName, spend, revenue, impressions, clicks, newCustomers, returningCustomers
    let rows: any[] = [];
    let title = body.title || 'Manuel Veri Girişi';
    let year = Number(body.year) || new Date().getFullYear();

    if (body.date || body.spend !== undefined || body.revenue !== undefined || body.campaign) {
      // Single entry form
      const dateStr = body.date || new Date().toISOString().split('T')[0];
      const platformStr = body.platform || 'Manuel Giriş';
      const campaignName = body.campaign?.trim() || `${platformStr} Kampanyası`;
      const adGroupName = body.adGroup?.trim() || '';
      const adName = body.adName?.trim() || '';
      const spend = parseUniversalNumber(body.spend);
      const revenue = parseUniversalNumber(body.revenue);
      const impressions = Math.max(0, Math.round(parseUniversalNumber(body.impressions)));
      const clicks = Math.max(0, Math.round(parseUniversalNumber(body.clicks)));
      const newCust = Math.max(0, Math.round(parseUniversalNumber(body.newCustomers)));
      const retCust = Math.max(0, Math.round(parseUniversalNumber(body.returningCustomers)));
      const orders = newCust + retCust > 0 ? (newCust + retCust) : (revenue > 0 && spend > 0 ? Math.max(1, Math.round(revenue / (revenue > 1000 ? 500 : 100))) : 0);
      const roas = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;

      rows = [{
        period: dateStr,
        date: dateStr,
        spend,
        revenue,
        impressions,
        clicks,
        orders,
        roas,
        platform: platformStr,
        campaign: campaignName,
        adGroup: adGroupName,
        adName: adName,
        newCustomers: newCust,
        returningCustomers: retCust,
      }];
      title = campaignName || `${platformStr} Verisi`;
      if (dateStr.includes('-')) {
        year = parseInt(dateStr.split('-')[0]) || year;
      }
    } else if (Array.isArray(body.rows) && body.rows.length > 0) {
      rows = body.rows;
    } else {
      return NextResponse.json({ error: 'En az bir veri satırı veya alanı girmelisiniz.' }, { status: 400 });
    }

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
      const periodStr = String(r.date || r.period || `Ay ${i + 1}`).trim();
      const spend = parseUniversalNumber(r.spend);
      const revenue = parseUniversalNumber(r.revenue);
      const orders = Math.max(0, Math.round(parseUniversalNumber(r.orders)));
      const basket = parseUniversalNumber(r.basket);
      const followers = Math.max(0, Math.round(parseUniversalNumber(r.followers)));

      const userRoas = parseUniversalNumber(r.roas);
      const roas = userRoas > 0 ? userRoas : spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
      const aov = orders > 0 ? Math.round(revenue / orders) : 0;

      const userImpr = parseUniversalNumber(r.impressions);
      const userClicks = parseUniversalNumber(r.clicks);
      const dImpr = userImpr > 0 ? Math.round(userImpr) : Math.round(spend * 25);
      const dClicks = userClicks > 0 ? Math.round(userClicks) : Math.round(spend * 1.5);

      const platform = r.platform || 'Manuel Giriş';
      const campaignName = r.campaign || `Kampanya ${i + 1}`;

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

      totalSpend += spend;
      totalRevenue += revenue;
      totalOrders += orders;
      totalBasket += basket;
      totalFollowers += followers;
      totalImpressions += dImpr;
      totalClicks += dClicks;

      const start = dateRange?.start || (periodStr.match(/^\d{4}-\d{2}-\d{2}$/) ? periodStr : `${year}-01-01`);
      const end = dateRange?.end || start;
      if (start < overallStart) overallStart = start;
      if (end > overallEnd) overallEnd = end;

      normalizedRows.push({
        date: start,
        monthName,
        platform,
        campaign: campaignName,
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

    if (overallStart > overallEnd) {
      overallStart = `${year}-01-01`;
      overallEnd = `${year}-12-31`;
    }

    const avgRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
    const avgAov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const avgCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    const trend = normalizedRows.map((r) => ({
      date: r.date,
      spend: r.spend,
      revenue: r.revenue,
      orders: r.orders,
      impressions: r.impressions,
      clicks: r.clicks,
      roas: r.roas,
    }));

    const campaigns = normalizedRows.map((r, idx) => ({
      campaign_id: `manual-camp-${idx + 1}`,
      campaign_name: r.campaign || `Kampanya ${idx + 1}`,
      platform: r.platform || 'Manuel Giriş',
      spend: r.spend,
      revenue: r.revenue,
      conversions: r.orders,
      roas: r.roas,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.impressions > 0 ? Number(((r.clicks / r.impressions) * 100).toFixed(2)) : 2.5,
      cpc: r.clicks > 0 ? Number((r.spend / r.clicks).toFixed(2)) : 0,
      data_source_label: 'Manuel Giriş',
    }));

    const channels = [
      {
        channel: normalizedRows[0]?.platform || 'Manuel Giriş',
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
      trend,
      campaigns,
      channels,
      monthlyBreakdown,
    };

    try {
      const firstRow = normalizedRows[0];
      const campName = firstRow?.campaign || 'Manuel Reklam Kampanyası';
      const campPlatform = firstRow?.platform || 'Manuel Giriş';

      const defaultCampaign =
        (await prisma.campaign.findFirst({
          where: { userId, name: campName },
        })) ??
        (await prisma.campaign.create({
          data: {
            userId,
            name: campName,
            platform: campPlatform,
            source: 'upload',
            dataSourceLabel: 'Manuel Giriş',
          },
        }));

      if (normalizedRows.length > 0) {
        await prisma.dailyMetric.createMany({
          data: normalizedRows.map((r) => ({
            userId,
            campaignId: defaultCampaign.id,
            date: new Date(`${r.date}T00:00:00.000Z`),
            platform: r.platform || campPlatform,
            spend: r.spend,
            revenue: r.revenue,
            impressions: r.impressions,
            clicks: r.clicks,
            conversions: r.orders,
            ctr: r.impressions > 0 ? Number(((r.clicks / r.impressions) * 100).toFixed(2)) : 2.5,
            cpc: r.clicks > 0 ? Number((r.spend / Math.max(1, r.clicks)).toFixed(2)) : 0,
            roas: r.roas,
            source: 'upload',
            dataSourceLabel: 'Manuel Giriş',
          })),
          skipDuplicates: true,
        });

        if (totalOrders > 0) {
          await prisma.order.createMany({
            data: normalizedRows
              .filter((r) => r.orders > 0)
              .map((r, i) => ({
                userId,
                orderNumber: `MANUAL-${Date.now()}-${i}`,
                totalPrice: r.revenue,
                channel: r.platform || campPlatform,
                source: 'upload',
                status: 'confirmed',
                itemCount: Math.max(1, Math.round(r.orders)),
                orderDate: new Date(`${r.date}T00:00:00.000Z`),
              })),
            skipDuplicates: true,
          });
        }
      }

      try {
        await (prisma as any).uploadLog.create({
          data: {
            userId,
            fileName: title,
            fileType: 'MANUEL',
            importedRows: normalizedRows.length,
            dateStart: new Date(`${overallStart}T00:00:00.000Z`),
            dateEnd: new Date(`${overallEnd}T00:00:00.000Z`),
            platforms: JSON.stringify([campPlatform]),
            status: 'success',
          },
        });
      } catch {}
    } catch (dbErr) {
      console.warn('Veritabanına manuel veri yazılırken uyarı:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Veri başarıyla yüklendi!',
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
