'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { ChannelBreakdown } from '@/lib/types';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#3B9B83', '#A19AD3', '#FF90BB', '#4A9F50', '#FF6363'];

interface Props {
  data: ChannelBreakdown[];
  loading: boolean;
}

export default function ChannelPieChart({ data, loading }: Props) {
  if (loading) {
    return <div className="card-premium p-6 h-80 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const safeData = (data ?? []).map((d: any) => ({ name: d?.channel ?? 'Bilinmiyor', value: d?.order_count ?? 0 }));

  if (safeData.length === 0) {
    return <div className="card-premium p-6 h-80 flex items-center justify-center text-muted-foreground">Kanal verisi bulunamadı</div>;
  }

  return (
    <div className="card-premium p-6">
      <h3 className="font-semibold text-foreground mb-4">Kanal Dağılımı</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={safeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
              {safeData.map((_: any, idx: number) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
