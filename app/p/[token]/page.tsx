import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { hashShareToken, isWellFormedToken, linkState, parseSections } from '@/lib/share-token';
import { availableMonths, buildBrandMonthReport, uptimeSummary } from '@/lib/report/brand-report';
import { goalProgress } from '@/lib/report/goal-progress';
import { isMonth } from '@/lib/report/months';
import PortalView from './_components/portal-view';

export const dynamic = 'force-dynamic';

// Müşteri sayfası arama motorlarına kapalıdır; dış bağlantılara tıklanınca link (anahtar) Referer ile sızmaz
export const metadata: Metadata = {
  title: 'Performans raporu',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

const VIEW_THROTTLE_MS = 5 * 60 * 1000;

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </main>
  );
}

type PortalData = React.ComponentProps<typeof PortalView>;
type PortalResult = { kind: 'ok'; data: PortalData } | { kind: 'invalid' } | { kind: 'error' };

async function loadPortal(token: string, ay: unknown): Promise<PortalResult> {
  try {
    const link = isWellFormedToken(token)
      ? await prisma.shareLink.findUnique({ where: { tokenHash: hashShareToken(token) }, include: { brand: true } })
      : null;

    // Bulunamayan, iptal edilen ve süresi dolan link aynı mesajı alır; hangisi olduğu açığa çıkmaz
    if (!link || linkState(link) !== 'active' || link.brand.archivedAt) return { kind: 'invalid' };

    const now = new Date();
    if (!link.lastViewedAt || now.getTime() - link.lastViewedAt.getTime() > VIEW_THROTTLE_MS) {
      await prisma.shareLink.update({ where: { id: link.id }, data: { lastViewedAt: now, viewCount: { increment: 1 } } });
    }

    const sections = parseSections(link.sections);
    const brand = link.brand;

    const months = sections.includes('report') ? await availableMonths(brand.id) : [];
    const month = isMonth(ay) && months.includes(ay) ? ay : months[0] ?? null;

    const [report, goals, uptime] = await Promise.all([
      month ? buildBrandMonthReport(brand.id, month, brand.currency) : null,
      sections.includes('goals') ? goalProgress(brand.id) : null,
      sections.includes('uptime') ? uptimeSummary(brand.id) : null,
    ]);

    return {
      kind: 'ok',
      data: {
        brand: { name: brand.name, logoUrl: brand.logoUrl, website: brand.website, currency: brand.currency },
        sections,
        months,
        report,
        goals,
        uptime,
        generatedAt: now.toISOString(),
      },
    };
  } catch (error) {
    console.error('[portal] error:', error);
    return { kind: 'error' };
  }
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const { ay } = await searchParams;
  const result = await loadPortal(token, ay);

  if (result.kind === 'invalid') {
    return (
      <Notice title="Bu link geçerli değil">
        Link iptal edilmiş, süresi dolmuş veya hatalı olabilir. Güncel link için sizinle çalışan ekiple iletişime geçin.
      </Notice>
    );
  }
  if (result.kind === 'error') {
    return (
      <Notice title="Rapor şu an yüklenemiyor">
        Kısa süre sonra tekrar deneyin. Sorun sürerse sizinle çalışan ekiple iletişime geçin.
      </Notice>
    );
  }
  return <PortalView {...result.data} />;
}
