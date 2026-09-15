'use client';

import React from 'react';
import type { CampaignPerformance } from '@/lib/types';

interface Props {
  data: CampaignPerformance[];
  loading: boolean;
}

export default function CampaignTable({ data, loading }: Props) {
  if (loading) {
    return <div className="card-premium p-6 animate-pulse"><div className="h-40 bg-muted rounded" /></div>;
  }

  const safeData = data ?? [];

  return (
    <div className="card-premium overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="font-semibold text-foreground">Kampanya Performansı</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Kampanya</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Platform</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Harcama</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ciro</th>
              <th className="text-right p-3 font-medium text-muted-foreground">ROAS</th>
              <th className="text-right p-3 font-medium text-muted-foreground">CTR</th>
            </tr>
          </thead>
          <tbody>
            {safeData.length === 0 && (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">Kampanya verisi bulunamadı</td></tr>
            )}
            {safeData.map((c: any, i: number) => (
              <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium text-foreground max-w-[200px] truncate">{c?.campaign_name ?? '-'}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">{c?.platform ?? '-'}</span>
                </td>
                <td className="p-3 text-right">₺{(c?.spend ?? 0).toLocaleString('tr-TR')}</td>
                <td className="p-3 text-right">₺{(c?.revenue ?? 0).toLocaleString('tr-TR')}</td>
                <td className="p-3 text-right font-semibold">{(c?.roas ?? 0).toFixed(2)}x</td>
                <td className="p-3 text-right">{(c?.ctr ?? 0).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
