'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { TrendDataPoint } from '@/lib/types';

interface Props {
  data: TrendDataPoint[];
  loading: boolean;
}

export default function TrendChart({ data, loading }: Props) {
  const [metric, setMetric] = useState<'revenue' | 'spend' | 'roas'>('revenue');

  if (loading) {
    return <div className="card-premium p-6 h-80 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const safeData = (data ?? []).map((d: any) => ({
    date: d?.date ?? '',
    spend: d?.spend ?? 0,
    revenue: d?.revenue ?? 0,
    roas: d?.roas ?? 0,
  }));

  return (
    <div className="card-premium p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Günlük Trend</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['revenue', 'spend', 'roas'] as const).map(m => (
            <button key={m} onClick={() => setMetric(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${metric === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {m === 'revenue' ? 'Ciro' : m === 'spend' ? 'Harcama' : 'ROAS'}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey={metric} stroke="#6366f1" fill="url(#gradRevenue)" strokeWidth={2} name={metric === 'revenue' ? 'Ciro' : metric === 'spend' ? 'Harcama' : 'ROAS'} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
