'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Calendar, Store, FileDown, Upload } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SummaryCards from '@/components/summary-cards';
import TrendChart from '@/components/trend-chart';
import ChannelPieChart from '@/components/channel-pie-chart';
import CampaignTable from '@/components/campaign-table';
import MonthComparison from '@/components/month-comparison';
import HistoryChart from '@/components/history-chart';
import AIAnalizKarti from '@/components/AIAnalizKarti';
import type {
  DashboardSummary, TrendDataPoint, CampaignPerformance,
  ChannelBreakdown, MonthComparisonData, HistoryPoint
} from '@/lib/types';

function toISODate(d: Date) { return d.toISOString().split('T')[0]; }

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  /* ── Date range state ── */
  const [dateMode, setDateMode] = useState<'preset' | 'custom'>('preset');
  const [presetDays, setPresetDays] = useState(30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  /* ── Data state ── */
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [channels, setChannels] = useState<ChannelBreakdown[]>([]);
  const [monthComp, setMonthComp] = useState<MonthComparisonData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  /* ── Read URL params on mount (from upload redirect) ── */
  useEffect(() => {
    const urlStart = searchParams.get('start_date');
    const urlEnd   = searchParams.get('end_date');
    if (urlStart && urlEnd) {
      setDateMode('custom');
      setCustomStart(urlStart);
      setCustomEnd(urlEnd);
    }
  }, [searchParams]);

  /* ── Compute date range ── */
  const getRange = useCallback(() => {
    if (dateMode === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const end = new Date();
    const start = new Date(end.getTime() - presetDays * 86400000);
    return { start: toISODate(start), end: toISODate(end) };
  }, [dateMode, presetDays, customStart, customEnd]);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getRange();
    const params = `?start_date=${start}&end_date=${end}`;
    try {
      const [s, t, ca, ch, mc, h] = await Promise.all([
        fetch(`/api/dashboard/summary${params}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/dashboard/trend${params}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/dashboard/campaigns${params}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/dashboard/channel-breakdown${params}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/dashboard/month-comparison`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/dashboard/history`).then(r => r.ok ? r.json() : { points: [] }).catch(() => ({ points: [] })),
      ]);
      setSummary(s);
      setTrend(Array.isArray(t) ? t : []);
      setCampaigns(Array.isArray(ca) ? ca : []);
      setChannels(Array.isArray(ch) ? ch : []);
      setMonthComp(mc);
      setHistory(Array.isArray(h?.points) ? h.points : Array.isArray(h) ? h : []);
      // Check if we have meaningful data
      setHasData(!!(s?.total_revenue || s?.total_spend || (ca && ca.length > 0)));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [getRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async (platform: string) => {
    setSyncing(platform);
    try {
      await fetch(`/api/dashboard/sync-${platform}`, { method: 'POST' });
      await fetchData();
    } catch (e) { console.error(e); }
    setSyncing(null);
  };

  const { start: activeStart, end: activeEnd } = getRange();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {dateMode === 'custom' && customStart && customEnd
              ? `${new Date(customStart).toLocaleDateString('tr-TR')} – ${new Date(customEnd).toLocaleDateString('tr-TR')}`
              : `Son ${presetDays} gün • Reklam ve satış performansı`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset buttons */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {[7, 14, 30, 90].map(d => (
              <button key={d}
                onClick={() => { setDateMode('preset'); setPresetDays(d); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${dateMode === 'preset' && presetDays === d
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calendar className="w-3 h-3 inline mr-1" />{d}g
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <input
              type="date"
              value={customStart}
              onChange={e => { setCustomStart(e.target.value); setDateMode('custom'); }}
              className="text-xs bg-transparent border-none outline-none px-2 py-1 text-foreground"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => { setCustomEnd(e.target.value); setDateMode('custom'); }}
              className="text-xs bg-transparent border-none outline-none px-2 py-1 text-foreground"
            />
          </div>

          {/* Sync & actions */}
          <button onClick={() => handleSync('ikas')} disabled={syncing === 'ikas'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            {syncing === 'ikas' ? 'Sync...' : 'iKas'}
          </button>
          <button onClick={() => handleSync('ticimax')} disabled={syncing === 'ticimax'}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            {syncing === 'ticimax' ? 'Sync...' : 'Ticimax'}
          </button>
          <button onClick={fetchData}
            className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button onClick={() => window.print()}
            className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5 print-hidden">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* ── No data state ── */}
      {!loading && !hasData && (
        <div className="card-premium p-10 text-center border border-dashed border-primary/30 bg-primary/5 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Henüz veri yüklenmedi</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            CSV veya Excel dosyanızı yükleyin — veriler otomatik analiz edilip buraya yansır.
          </p>
          <Link href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition shadow">
            <Upload className="w-4 h-4" /> Veri Yükle
          </Link>
        </div>
      )}

      {/* ── Summary Cards — always show if has data or loading ── */}
      {(loading || hasData) && <SummaryCards data={summary} loading={loading} />}

      {/* ── Charts — only if data present ── */}
      {hasData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrendChart data={trend} loading={loading} />
            </div>
            <ChannelPieChart data={channels} loading={loading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MonthComparison data={monthComp} loading={loading} />
            <div className="lg:col-span-2">
              <HistoryChart data={history} loading={loading} />
            </div>
          </div>

          <CampaignTable data={campaigns} loading={loading} />

          {/* Yapay Zeka Analiz Asistanı — yalnızca gerçek özet verisiyle çalışır */}
          {!loading && summary && (
            <AIAnalizKarti
              dashboardVerileri={{
                toplamHarcama: summary.total_spend,
                toplamCiro: summary.total_revenue,
                netKar: summary.total_profit,
                siparis: summary.total_orders,
                roas: summary.avg_roas,
                netRoas: summary.net_roas,
                karMarji: `${summary.profit_margin}%`,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
