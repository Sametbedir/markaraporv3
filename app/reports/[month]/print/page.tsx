import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveActiveBrand } from '@/lib/brand';
import { isMonth } from '@/lib/report/months';
import { liveDocument, publishedDocument } from '@/lib/report/document-server';
import ReportPrintView from '@/components/report-print-view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rapor', robots: { index: false, follow: false } };

/** Belge görünümü: varsayılan taslak (güncel veri); ?surum=yayin ile yayınlanan hali. */
export default async function ReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ month: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { month } = await params;
  const { surum } = await searchParams;
  if (!isMonth(month)) notFound();

  const brand = await resolveActiveBrand(session.user.id);
  const snapshot = await prisma.reportSnapshot.findUnique({ where: { brandId_month: { brandId: brand.id, month } } });
  const data = surum === 'yayin' ? publishedDocument(snapshot) : await liveDocument(brand, session.user.id, month, snapshot);
  if (!data) notFound();

  return <ReportPrintView data={data} backHref={`/reports?ay=${month}`} />;
}
