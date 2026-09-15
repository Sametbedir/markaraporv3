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

export function addDemoMetrics(metrics: DemoMetric[]) {
  demoMetrics.push(...metrics);
}

export function demoMetricsInRange(start?: string | null, end?: string | null) {
  return demoMetrics.filter((metric) => {
    if (start && metric.date < start) return false;
    if (end && metric.date > end) return false;
    return true;
  });
}

export function numberFrom(value: unknown) {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/TRY|TL|₺/gi, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const number = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

export function normalizeHeader(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');
}

export function findValue(row: Record<string, string>, names: string[]) {
  const entry = Object.entries(row).find(([key]) => names.some((name) => key.includes(name)));
  return entry?.[1] ?? '';
}
