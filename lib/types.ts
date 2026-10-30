export interface DashboardSummary {
  total_spend: number;
  total_revenue: number;
  total_orders: number;
  /** Gerçek mağaza siparişi var mı? Reklam platformu dönüşümleri sipariş sayılmaz. */
  has_store_orders?: boolean;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_roas: number;
  avg_ctr: number;
  avg_cpc: number;
  total_profit: number;
  profit_margin: number;
  net_roas: number;
  total_commission: number;
  total_shipping: number;
  total_returns: number;
  total_cogs: number;
  avg_aov?: number;
  avg_cac?: number;
  daily_revenue?: number;
  total_basket?: number;
  total_followers?: number;
}

export interface MonthlyItem {
  month: string;
  year: number;
  spend: number;
  revenue: number;
  orders: number;
  roas: number;
  basket: number;
  followers: number;
  aov: number;
}

export interface TrendDataPoint {
  date: string;
  spend: number;
  revenue: number;
  orders: number;
  impressions: number;
  clicks: number;
  roas: number;
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  data_source_label: string;
}

export interface ChannelBreakdown {
  channel: string;
  order_count: number;
  total_revenue: number;
  percentage: number;
}

export interface MonthComparisonData {
  current_month: string;
  previous_month: string;
  spend_change: number | null;
  revenue_change: number | null;
  roas_change: number | null;
  orders_change: number | null;
  current_spend: number;
  previous_spend: number;
  current_revenue: number;
  previous_revenue: number;
  current_orders: number;
  previous_orders: number;
  current_roas: number;
  previous_roas: number;
  is_spend_up: boolean;
  is_revenue_up: boolean;
  is_orders_up: boolean;
  is_roas_up: boolean;
}

export interface HistoryPoint {
  month: string;
  spend: number;
  revenue: number;
  roas: number;
  orders: number;
}

export interface GoalProgress {
  id: string;
  userId: string;
  periodType: string;
  targetType: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  currentValue: number;
  percentage: number;
}

export interface SimulationResult {
  projected_spend: number;
  projected_revenue: number;
  projected_roas: number;
  projected_orders: number;
  projected_profit: number;
  confidence_score: number;
  historical: {
    avg_roas: number;
    avg_ctr: number;
    avg_cpc: number;
    data_points: number;
    period_start?: string;
    period_end?: string;
  };
}

export interface UptimeMonitor {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  timeout_seconds: number;
  is_active: boolean;
  current: {
    status: string;
    status_code: number | null;
    response_time_ms: number | null;
    error_message: string | null;
    checked_at: string | null;
  } | null;
}
