import type { Brand, ReportSnapshot } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buildBrandMonthReport } from './brand-report';
import { parseSnapshot, type ReportDocumentData } from './document';

/** Raporu hazırlayan: kullanıcının şirket adı, yoksa adı. */
export async function preparedByFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyName: true, name: true } });
  return user?.companyName?.trim() || user?.name?.trim() || '';
}

/** Güncel verilerle (taslak) belge. */
export async function liveDocument(brand: Brand, userId: string, month: string, snapshot: ReportSnapshot | null): Promise<ReportDocumentData> {
  const [report, preparedBy] = await Promise.all([
    buildBrandMonthReport(brand, month),
    preparedByFor(userId),
  ]);
  return {
    brand: { name: brand.name, logoUrl: brand.logoUrl },
    preparedBy,
    report,
    summary: snapshot?.summary ?? '',
    actions: snapshot?.actions ?? '',
    publishedAt: null,
  };
}

/** Yayınlanmış (dondurulmuş) belge; yayınlanmamışsa null. */
export function publishedDocument(snapshot: ReportSnapshot | null): ReportDocumentData | null {
  if (!snapshot?.publishedAt) return null;
  return parseSnapshot(snapshot.dataJson);
}
