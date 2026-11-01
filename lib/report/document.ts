import type { BrandMonthReport } from './brand-report';

/** Bölüm yorumları: AI destekli taslak, kullanıcı düzenler. Boş bölüm belgeye girmez. */
export const INSIGHT_SECTIONS = ['karsilastirma', 'haftalik', 'huni', 'platform', 'kampanya'] as const;
export type InsightSection = (typeof INSIGHT_SECTIONS)[number];
export type ReportInsights = Partial<Record<InsightSection, string>> & { model?: string };

export const INSIGHT_LABELS: Record<InsightSection, string> = {
  karsilastirma: 'Ay karşılaştırması',
  haftalik: 'Haftalık gidişat',
  huni: 'Satış hunisi',
  platform: 'Platformlar',
  kampanya: 'Kampanyalar',
};

/** Gelen yorumları temizler: yalnızca bilinen bölümler, en fazla 1.500 karakter. */
export function sanitizeInsights(raw: unknown): ReportInsights | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: ReportInsights = {};
  for (const k of INSIGHT_SECTIONS) {
    const v = (raw as any)[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 1500);
  }
  if (typeof (raw as any).model === 'string') out.model = (raw as any).model.slice(0, 60);
  return INSIGHT_SECTIONS.some((k) => out[k]) ? out : null;
}

export function parseInsights(json: string | null | undefined): ReportInsights | null {
  if (!json) return null;
  try {
    return sanitizeInsights(JSON.parse(json));
  } catch {
    return null;
  }
}

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
  /** Eski yayınlarda yoktur */
  insights?: ReportInsights | null;
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
