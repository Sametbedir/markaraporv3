export type DemoMetric = {
  date: string;
  platform: string;
  campaign: string;
  spend: number;
  revenue: number;
  orders: number;
  impressions: number;
  clicks: number;
  conversions: number;
  /** Bu satırı ekleyen yükleme; tek tek silme için */
  uploadId?: string;
};

export type DemoUploadLog = {
  id: string;
  fileName: string;
  fileType: string;
  kind: string;
  fileHash: string | null;
  importedRows: number;
  dateStart: string | null;
  dateEnd: string | null;
  platforms: string;
  status: 'success';
  errorMessage: null;
  createdAt: string;
};

export type DemoGoal = {
  id: string;
  userId: string;
  periodType: string;
  targetType: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

export type DemoMonitor = {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  timeout_seconds: number;
  is_active: boolean;
  current: Record<string, unknown> | null;
};

const globalStore = globalThis as typeof globalThis & {
  markaRaporDemoMetrics?: DemoMetric[];
  markaRaporDemoGoals?: DemoGoal[];
  markaRaporDemoMonitors?: DemoMonitor[];
  markaRaporDemoSettings?: Record<string, unknown>;
  markaRaporDemoUploads?: DemoUploadLog[];
};

export const demoMetrics = globalStore.markaRaporDemoMetrics ?? [];
if (!globalStore.markaRaporDemoMetrics) globalStore.markaRaporDemoMetrics = demoMetrics;
export const demoGoals = globalStore.markaRaporDemoGoals ?? [];
if (!globalStore.markaRaporDemoGoals) globalStore.markaRaporDemoGoals = demoGoals;
export const demoMonitors = globalStore.markaRaporDemoMonitors ?? [];
if (!globalStore.markaRaporDemoMonitors) globalStore.markaRaporDemoMonitors = demoMonitors;
export const demoSettings = globalStore.markaRaporDemoSettings ?? {
  name: 'Admin', company_name: 'MarkaRapor Admin', website: '', industry: '',
  commission_rate_trendyol: 0, commission_rate_hepsiburada: 0, commission_rate_shopify: 0,
  commission_rate_ikas: 0, commission_rate_ticimax: 0, shipping_cost_per_order: 0,
  return_rate: 0, product_cogs_rate: 0,
};
if (!globalStore.markaRaporDemoSettings) globalStore.markaRaporDemoSettings = demoSettings;

export const demoUploads = globalStore.markaRaporDemoUploads ?? [];
if (!globalStore.markaRaporDemoUploads) globalStore.markaRaporDemoUploads = demoUploads;

export function addDemoMetrics(metrics: DemoMetric[]) {
  demoMetrics.push(...metrics);
}

/** Demo modunda bir yüklemeyi (dosya veya manuel giriş) satırlarıyla birlikte bellekte kaydeder. */
export function addDemoUpload(
  log: Omit<DemoUploadLog, 'id' | 'createdAt' | 'status' | 'errorMessage'>,
  metrics: Omit<DemoMetric, 'uploadId'>[]
): DemoUploadLog {
  const saved: DemoUploadLog = {
    ...log,
    id: crypto.randomUUID(),
    status: 'success',
    errorMessage: null,
    createdAt: new Date().toISOString(),
  };
  demoUploads.unshift(saved);
  demoMetrics.push(...metrics.map((m) => ({ ...m, uploadId: saved.id })));
  return saved;
}

/** Yüklemeyi ve yalnızca ona ait satırları siler; silinen satır sayısını döndürür. */
export function deleteDemoUpload(id: string): number | null {
  const index = demoUploads.findIndex((u) => u.id === id);
  if (index < 0) return null;
  demoUploads.splice(index, 1);
  const before = demoMetrics.length;
  const remaining = demoMetrics.filter((m) => m.uploadId !== id);
  demoMetrics.splice(0, demoMetrics.length, ...remaining);
  return before - demoMetrics.length;
}

export function resetDemoData() {
  demoMetrics.splice(0, demoMetrics.length);
  demoUploads.splice(0, demoUploads.length);
}

export function sumDemoMetrics(metrics: DemoMetric[]) {
  return metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      revenue: acc.revenue + m.revenue,
      orders: acc.orders + m.orders,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
    }),
    { spend: 0, revenue: 0, orders: 0, impressions: 0, clicks: 0, conversions: 0 }
  );
}

export function demoMetricsInRange(start?: string | null, end?: string | null) {
  return demoMetrics.filter((metric) => {
    if (start && metric.date < start) return false;
    if (end && metric.date > end) return false;
    return true;
  });
}
