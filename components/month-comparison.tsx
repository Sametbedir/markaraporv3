'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { MonthComparisonData } from '@/lib/types';

interface Props {
  data: MonthComparisonData | null;
  loading: boolean;
}

export default function MonthComparison({ data, loading }: Props) {
  if (loading) {
    return <div className="card-premium p-6 animate-pulse"><div className="h-32 bg-muted rounded" /></div>;
  }

  if (!data) {
    return <div className="card-premium p-6 text-center text-muted-foreground">Karşılaştırma verisi yok</div>;
  }

  const items = [
    { label: 'Harcama', current: data.current_spend ?? 0, previous: data.previous_spend ?? 0, change: data.spend_change ?? 0, isUp: data.is_spend_up, prefix: '₺', invertColor: true },
    { label: 'Ciro', current: data.current_revenue ?? 0, previous: data.previous_revenue ?? 0, change: data.revenue_change ?? 0, isUp: data.is_revenue_up, prefix: '₺' },
    { label: 'ROAS', current: data.current_roas ?? 0, previous: data.previous_roas ?? 0, change: data.roas_change ?? 0, isUp: data.is_roas_up, suffix: 'x' },
    { label: 'Sipariş', current: data.current_orders ?? 0, previous: data.previous_orders ?? 0, change: data.orders_change ?? 0, isUp: data.is_orders_up },
  ];

  return (
    <div className="card-premium p-6">
      <h3 className="font-semibold text-foreground mb-4">Ay Karşılaştırma</h3>
      <div className="space-y-4">
        {items.map((item, i) => {
          const good = item.invertColor ? !item.isUp : item.isUp;
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {item.prefix ?? ''}{typeof item.current === 'number' ? item.current.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : item.current}{item.suffix ?? ''}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${good ? 'text-green-500' : 'text-red-500'}`}>
                  {item.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(item.change ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
