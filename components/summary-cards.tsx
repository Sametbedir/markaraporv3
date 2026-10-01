'use client';

import React from 'react';
import {
  DollarSign, ShoppingCart, Eye, MousePointer,
  TrendingUp, BarChart3, Percent, Wallet,
  Target, Users, ArrowDownToLine, Package,
} from 'lucide-react';
import AnimatedCounter from './animated-counter';
import type { DashboardSummary } from '@/lib/types';

interface Props {
  data: DashboardSummary | null;
  loading: boolean;
}

function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

export default function SummaryCards({ data, loading }: Props) {
  // AOV: average order value
  const aov = data?.avg_aov ??
    (data?.total_orders && data?.total_revenue
      ? data.total_revenue / data.total_orders
      : 0);

  // CAC: cost per acquisition
  const cac = data?.avg_cac ??
    (data?.total_orders && data?.total_spend
      ? data.total_spend / data.total_orders
      : 0);

  // Daily revenue estimate
  const dailyRevenue = data?.daily_revenue ?? (data?.total_revenue ? data.total_revenue / 30 : 0);

  const cards = [
    {
      label: 'Toplam Ciro',
      value: data?.total_revenue ?? 0,
      display: data ? `₺${fmtCurrency(data.total_revenue)}` : '—',
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Reklam Harcaması',
      value: data?.total_spend ?? 0,
      display: data ? `₺${fmtCurrency(data.total_spend)}` : '—',
      icon: Wallet,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      label: 'ROAS',
      value: data?.avg_roas ?? 0,
      display: data ? `${(data.avg_roas).toFixed(2)}x` : '—',
      icon: BarChart3,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
    },
    {
      label: 'Net ROAS',
      value: data?.net_roas ?? 0,
      display: data ? `${(data.net_roas).toFixed(2)}x` : '—',
      icon: TrendingUp,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
    {
      label: 'Sipariş Sayısı',
      value: data?.total_orders ?? 0,
      display: data ? `${data.total_orders.toLocaleString('tr-TR')}` : '—',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'AOV (Ort. Sepet)',
      value: aov,
      display: aov ? `₺${fmtCurrency(aov)}` : '—',
      icon: Package,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      label: 'CPC (Tık Maliyeti)',
      value: data?.avg_cpc ?? 0,
      display: data?.avg_cpc ? `₺${data.avg_cpc.toFixed(2)}` : '—',
      icon: MousePointer,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'CTR (Tık Oranı)',
      value: data?.avg_ctr ?? 0,
      display: data?.avg_ctr ? `%${data.avg_ctr.toFixed(2)}` : '—',
      icon: Target,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'CAC (Müş. Edinme)',
      value: cac,
      display: cac ? `₺${fmtCurrency(cac)}` : '—',
      icon: Users,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
    },
    {
      label: 'Gösterim',
      value: data?.total_impressions ?? 0,
      display: data ? fmtCurrency(data.total_impressions) : '—',
      icon: Eye,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
    },
    {
      label: 'Net Kâr',
      value: data?.total_profit ?? 0,
      display: data ? `₺${fmtCurrency(data.total_profit)}` : '—',
      icon: TrendingUp,
      color: (data?.total_profit ?? 0) >= 0 ? 'text-teal-500' : 'text-red-500',
      bg: (data?.total_profit ?? 0) >= 0 ? 'bg-teal-500/10' : 'bg-red-500/10',
      border: (data?.total_profit ?? 0) >= 0 ? 'border-teal-500/20' : 'border-red-500/20',
    },
    {
      label: 'Kâr Marjı',
      value: data?.profit_margin ?? 0,
      display: data ? `%${(data.profit_margin).toFixed(1)}` : '—',
      icon: Percent,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card-premium p-5 animate-pulse">
            <div className="h-3 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`card-premium p-5 group hover:scale-[1.02] transition-all duration-300 border ${c.border}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
              {c.label}
            </span>
            <div className={`p-2 rounded-lg ${c.bg} shrink-0`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
          </div>
          <div className={`text-xl md:text-2xl font-bold ${c.color}`}>
            {c.display}
          </div>
        </div>
      ))}
    </div>
  );
}
