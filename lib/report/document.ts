import type { BrandMonthReport } from './brand-report';

/**
 * Müşteriye gönderilen rapor belgesinin tüm içeriği. Yayınlanınca bu nesne JSON olarak
 * dondurulur (ReportSnapshot.dataJson); marka adı ve logosu da o anki haliyle saklanır.
 */
export type ReportDocumentData = {
  brand: { name: string; logoUrl: string | null };
  preparedBy: string;
  report: BrandMonthReport;
  summary: string;
  actions: string;
  /** null ise taslak */
  publishedAt: string | null;
};

export const SNAPSHOT_VERSION = 1;

export function parseSnapshot(json: string | null): ReportDocumentData | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    if (data?.version !== SNAPSHOT_VERSION || !data.document?.report) return null;
    return data.document as ReportDocumentData;
  } catch {
    return null;
  }
}

export function serializeSnapshot(doc: ReportDocumentData): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, document: doc });
}

/** "Aksiyon planı" metnini maddelere böler; satır başındaki -, •, * ve 1. işaretleri atılır. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}
