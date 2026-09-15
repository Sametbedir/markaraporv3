import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin account for app access
  const adminEmail = 'admin@markarapor.com';
  const adminPassword = 'Admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin',
      hashedPassword,
      companyName: 'MarkaRapor Admin',
      isAdmin: true,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: 'Admin',
      hashedPassword,
      companyName: 'MarkaRapor Admin',
      isAdmin: true,
      isActive: true,
      commissionRateTrendyol: 18,
      commissionRateHepsiburada: 15,
      commissionRateShopify: 3,
      commissionRateIkas: 4,
      commissionRateTicimax: 5,
      shippingCostPerOrder: 25,
      returnRate: 8,
      productCogsRate: 35,
    },
  });

  // Seed some campaigns
  const campaigns = [
    { name: 'Meta - Yaz Kampanyası', platform: 'meta', status: 'active', dailyBudget: 500 },
    { name: 'Google - Marka Arama', platform: 'google', status: 'active', dailyBudget: 300 },
    { name: 'TikTok - Video Reklamlar', platform: 'tiktok', status: 'paused', dailyBudget: 200 },
  ];

  for (const c of campaigns) {
    await prisma.campaign.upsert({
      where: { id: `seed-${c.platform}` },
      update: {},
      create: {
        id: `seed-${c.platform}`,
        userId: user.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        dailyBudget: c.dailyBudget,
        source: 'seed',
        dataSourceLabel: 'Seed Verisi',
      },
    });
  }

  // Seed daily metrics for last 30 days
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 86400000);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];

    for (const platform of ['meta', 'google', 'tiktok']) {
      const spend = Math.round((Math.random() * 400 + 100) * 100) / 100;
      const impressions = Math.floor(Math.random() * 50000 + 5000);
      const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.01));
      const conversions = Math.floor(clicks * (Math.random() * 0.08 + 0.02));
      const revenue = Math.round(conversions * (Math.random() * 200 + 80) * 100) / 100;
      const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
      const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
      const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;

      await prisma.dailyMetric.upsert({
        where: { id: `seed-${platform}-${dateStr}` },
        update: {},
        create: {
          id: `seed-${platform}-${dateStr}`,
          userId: user.id,
          campaignId: `seed-${platform}`,
          date,
          platform,
          impressions,
          clicks,
          spend,
          conversions,
          revenue,
          ctr,
          cpc,
          roas,
          source: 'seed',
          dataSourceLabel: 'Seed Verisi',
        },
      });
    }
  }

  // Seed orders
  const channels = ['Shopify', 'Trendyol', 'Hepsiburada', 'iKas'];
  for (let i = 0; i < 60; i++) {
    const date = new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000);
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const total = Math.round((Math.random() * 500 + 50) * 100) / 100;

    await prisma.order.upsert({
      where: { id: `seed-order-${i}` },
      update: {},
      create: {
        id: `seed-order-${i}`,
        userId: user.id,
        orderNumber: `ORD-${1000 + i}`,
        totalPrice: total,
        channel,
        source: 'seed',
        status: 'confirmed',
        itemCount: Math.floor(Math.random() * 5) + 1,
        orderDate: date,
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
