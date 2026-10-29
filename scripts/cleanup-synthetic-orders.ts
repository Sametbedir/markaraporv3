/**
 * Eski reklam dosyası yüklemelerinin ürettiği yapay siparişleri (orders.source = 'upload') temizler.
 *
 * Varsayılan: KURU ÇALIŞTIRMA — hiçbir şey silinmez, yalnızca kaç kayıt silineceği yazılır.
 *   npx tsx --require dotenv/config scripts/cleanup-synthetic-orders.ts
 *
 * Gerçekten silmek için (önce Supabase yedeği alın):
 *   npx tsx --require dotenv/config scripts/cleanup-synthetic-orders.ts --apply
 */
import { PrismaClient } from '@prisma/client';
import { LEGACY_SYNTHETIC_ORDER_SOURCE } from '../lib/store-orders';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const where = { source: LEGACY_SYNTHETIC_ORDER_SOURCE };

  const byUser = await prisma.order.groupBy({
    by: ['userId'],
    where,
    _count: { id: true },
    _sum: { totalPrice: true },
    _min: { orderDate: true },
    _max: { orderDate: true },
  });

  if (!byUser.length) {
    console.log('Yapay sipariş bulunamadı. Yapılacak bir şey yok.');
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: byUser.map((u) => u.userId) } },
    select: { id: true, email: true },
  });
  const emailOf = new Map(users.map((u) => [u.id, u.email]));

  let total = 0;
  for (const u of byUser) {
    total += u._count.id;
    console.log(
      `${emailOf.get(u.userId) ?? u.userId}: ${u._count.id} sipariş, toplam ${Math.round(u._sum.totalPrice ?? 0)} ` +
        `(${u._min.orderDate?.toISOString().slice(0, 10)} – ${u._max.orderDate?.toISOString().slice(0, 10)})`
    );
  }

  if (!apply) {
    console.log(`\nKURU ÇALIŞTIRMA: ${total} yapay sipariş silinecekti. Silmek için --apply ekleyin.`);
    return;
  }

  const deleted = await prisma.order.deleteMany({ where });
  console.log(`\n${deleted.count} yapay sipariş silindi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
