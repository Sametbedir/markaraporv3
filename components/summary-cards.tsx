'use client';

import React from 'react';
import { DollarSign, ShoppingCart, Eye, MousePointer, TrendingUp, BarChart3, Percent, Wallet } from 'lucide-react';
import AnimatedCounter from './animated-counter';
import type { DashboardSummary } from '@/lib/types';

interface Props {
  data: DashboardSummary | null;
  loading: boolean;
}

export default function SummaryCards({ data, loading }: Props) {
  const cards = [
    { label: 'Toplam Harcama', value: data?.total_spend ?? 0, prefix: '₺', icon: Wallet, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Toplam Ciro', value: data?.total_revenue ?? 0, prefix: '₺', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Net Kâr', value: data?.total_profit ?? 0, prefix: '₺', icon: TrendingUp, color: (data?.total_profit ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500', bg: (data?.total_profit ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
    { label: 'Sipariş', value: data?.total_orders ?? 0, prefix: '', icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'ROAS', value: data?.avg_roas ?? 0, prefix: '', suffix: 'x', icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Net ROAS', value: data?.net_roas ?? 0, prefix: '', suffix: 'x', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Gösterim', value: data?.total_impressions ?? 0, prefix: '', icon: Eye, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Kâr Marjı', value: data?.profit_margin ?? 0, prefix: '', suffix: '%', icon: Percent, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card-premium p-5 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div key={i} className="card-premium p-5 group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
            <div className={`p-2 rounded-lg ${c.bg}`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
          </div>
          <div className={`text-xl md:text-2xl font-bold ${c.color}`}>
            {c.prefix}
            <AnimatedCounter value={c.value} decimals={c.suffix === 'x' || c.suffix === '%' ? 2 : (c.prefix === '₺' ? 0 : 0)} />
            {c.suffix ?? ''}
          </div>
        </div>
      ))}
    </div>
  );
}
