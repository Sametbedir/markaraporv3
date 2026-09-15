'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Calendar, Store, FileDown } from 'lucide-react';
import SummaryCards from '@/components/summary-cards';
import TrendChart from '@/components/trend-chart';
import ChannelPieChart from '@/components/channel-pie-chart';
import CampaignTable from '@/components/campaign-table';
import MonthComparison from '@/components/month-comparison';
import HistoryChart from '@/components/history-chart';
import type {
  DashboardSummary, TrendDataPoint, CampaignPerformance,
  ChannelBreakdown, MonthComparisonData, HistoryPoint
} from '@/lib/types';

export default function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [channels, setChannels] = useState<ChannelBreakdown[]>([]);
  const [monthComp, setMonthComp] = useState<MonthComparisonData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const end = new Date();
    const start = new Date(end.getTime() - dateRange * 86400000);
    const params = `?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`;

    try {
      const [s, t, ca, ch, mc, h] = await Promise.all([
        fetch(`/api/dashboard/summary${params}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/dashboard/trend${params}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/dashboard/campaigns${params}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/dashboard/channel-breakdown${params}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/dashboard/month-comparison`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/dashboard/history`).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
      ]);
      setSummary(s); setTrend(Array.isArray(t) ? t : []); setCampaigns(Array.isArray(ca) ? ca : []); setChannels(Array.isArray(ch) ? ch : []);
      setMonthComp(mc); setHistory(Array.isArray(h?.points) ? h.points : Array.isArray(h) ? h : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async (platform: string) => {
    setSyncing(platform);
    try {
      await fetch(`/api/dashboard/sync-${platform}`, { method: 'POST' });
      await fetchData();
    } catch (e) { console.error(e); }
    setSyncing(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Reklam ve satış performansı özeti</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {[7, 14, 30, 90].map(d => (
              <button key={d} onClick={() => setDateRange(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Calendar className="w-3 h-3 inline mr-1" />{d}g
              </button>
            ))}
          </div>
          <button onClick={() => handleSync('ikas')} disabled={syncing === 'ikas'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            {syncing === 'ikas' ? 'Senkronize...' : 'iKas Sync'}
          </button>
          <button onClick={() => handleSync('ticimax')} disabled={syncing === 'ticimax'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            {syncing === 'ticimax' ? 'Senkronize...' : 'Ticimax Sync'}
          </button>
          <button onClick={fetchData} className="btn-primary text-xs flex items-center gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button onClick={() => window.print()} className="btn-secondary text-xs flex items-center gap-1 print-hidden">
            <FileDown className="w-3.5 h-3.5" /> PDF Rapor
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards data={summary} loading={loading} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart data={trend} loading={loading} />
        </div>
        <ChannelPieChart data={channels} loading={loading} />
      </div>

      {/* Month comparison + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MonthComparison data={monthComp} loading={loading} />
        <div className="lg:col-span-2">
          <HistoryChart data={history} loading={loading} />
        </div>
      </div>

      {/* Campaign table */}
      <CampaignTable data={campaigns} loading={loading} />
    </div>
  );
}
