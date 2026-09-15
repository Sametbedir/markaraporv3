'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { HistoryPoint } from '@/lib/types';

interface Props {
  data: HistoryPoint[];
  loading: boolean;
}

export default function HistoryChart({ data, loading }: Props) {
  if (loading) {
    return <div className="card-premium p-6 h-80 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const safeData = (data ?? []).map((d: any) => ({
    month: d?.month ?? '',
    spend: d?.spend ?? 0,
    revenue: d?.revenue ?? 0,
  }));

  return (
    <div className="card-premium p-6">
      <h3 className="font-semibold text-foreground mb-4">Aylık Geçmiş</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="spend" fill="#FF9149" name="Harcama" radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue" fill="#60B5FF" name="Ciro" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
