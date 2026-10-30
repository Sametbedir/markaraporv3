export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { userId, brandId } = ctx;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.ikasStoreUrl || !user?.ikasAccessToken) {
    return NextResponse.json({ error: 'iKas ayarları yapılandırılmamış' }, { status: 400 });
  }

  try {
    const endpoint = `https://${user.ikasStoreUrl}/api/admin/graphql`;

    const query = `{
      listOrder(pagination: { page: 1, limit: 50 }) {
        data {
          id
          createdAt
          totalPrice
          orderLineItems { quantity }
          status
        }
      }
    }`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.ikasAccessToken}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `iKas API hatası: ${res.status} - ${text.substring(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const orders = data?.data?.listOrder?.data ?? [];
    let imported = 0;

    for (const o of orders) {
      const existing = await prisma.order.findFirst({
        where: { brandId, externalId: String(o.id), channel: 'ikas' },
      });
      if (existing) continue;

      await prisma.order.create({
        data: {
          userId,
          brandId,
          externalId: String(o.id),
          totalPrice: Number(o.totalPrice ?? 0),
          channel: 'ikas',
          source: 'api',
          status: String(o.status ?? 'confirmed').toLowerCase(),
          itemCount: (o.orderLineItems ?? []).reduce((s: number, li: any) => s + (li.quantity ?? 0), 0),
          orderDate: new Date(o.createdAt),
        },
      });
      imported++;
    }

    return NextResponse.json({ message: `iKas: ${imported} sipariş içe aktarıldı`, imported });
  } catch (err: any) {
    console.error('iKas sync error:', err);
    return NextResponse.json({ error: `iKas senkronizasyon hatası: ${err?.message?.substring(0, 200)}` }, { status: 500 });
  }
}
