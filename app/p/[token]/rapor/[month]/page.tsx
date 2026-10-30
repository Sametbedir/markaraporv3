import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hashShareToken, isWellFormedToken, linkState, parseSections } from '@/lib/share-token';
import { isMonth } from '@/lib/report/months';
import { publishedDocument } from '@/lib/report/document-server';
import ReportPrintView from '@/components/report-print-view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Performans raporu',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

/** Müşteri linkinden yayınlanmış raporun belge görünümü (PDF/PNG indirme). */
export default async function PortalReportPage({ params }: { params: Promise<{ token: string; month: string }> }) {
  const { token, month } = await params;
  if (!isWellFormedToken(token) || !isMonth(month)) notFound();

  const link = await prisma.shareLink.findUnique({ where: { tokenHash: hashShareToken(token) }, include: { brand: true } });
  if (!link || linkState(link) !== 'active' || link.brand.archivedAt || !parseSections(link.sections).includes('report')) notFound();

  const snapshot = await prisma.reportSnapshot.findUnique({ where: { brandId_month: { brandId: link.brandId, month } } });
  const data = publishedDocument(snapshot);
  if (!data) notFound();

  return <ReportPrintView data={data} backHref={`/p/${token}?ay=${month}`} />;
}
