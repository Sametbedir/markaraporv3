export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user?.ticimaxApiKey) {
    return NextResponse.json({ error: 'Ticimax ayarları yapılandırılmamış' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.ticimax.cloud/orders', {
      headers: {
        'X-API-Key': user.ticimaxApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Ticimax API hatası: ${res.status} - ${text.substring(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const orders = Array.isArray(data) ? data : data?.orders ?? data?.data ?? [];
    let imported = 0;

    for (const o of orders) {
      const extId = String(o.id ?? o.orderId ?? o.order_id ?? '');
      if (!extId) continue;

      const existing = await prisma.order.findFirst({
        where: { userId: session.user.id, externalId: extId, channel: 'ticimax' },
      });
      if (existing) continue;

      await prisma.order.create({
        data: {
          userId: session.user.id,
          externalId: extId,
          orderNumber: String(o.orderNumber ?? o.order_number ?? ''),
          totalPrice: Number(o.totalPrice ?? o.total_price ?? o.total ?? 0),
          channel: 'ticimax',
          source: 'api',
          status: String(o.status ?? 'confirmed').toLowerCase(),
          itemCount: Number(o.itemCount ?? o.item_count ?? 0),
          orderDate: new Date(o.createdAt ?? o.created_at ?? o.orderDate ?? new Date()),
        },
      });
      imported++;
    }

    return NextResponse.json({ message: `Ticimax: ${imported} sipariş içe aktarıldı`, imported });
  } catch (err: any) {
    console.error('Ticimax sync error:', err);
    return NextResponse.json({ error: `Ticimax senkronizasyon hatası: ${err?.message?.substring(0, 200)}` }, { status: 500 });
  }
}
