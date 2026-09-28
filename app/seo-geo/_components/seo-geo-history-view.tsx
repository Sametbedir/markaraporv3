'use client';

import React from 'react';
import { History, Calendar, Trash2 } from 'lucide-react';
import { SeoGeoReportResult } from '@/lib/seo-geo';

interface SeoGeoHistoryViewProps {
  history: { dbId?: string; createdAt: string; data: SeoGeoReportResult }[];
  onSelectReport: (report: SeoGeoReportResult) => void;
  onDeleteReport: (dbId?: string, idx?: number) => void;
}

export default function SeoGeoHistoryView({
  history,
  onSelectReport,
  onDeleteReport,
}: SeoGeoHistoryViewProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
            Geçmiş SEO & GEO Raporları ve Zaman Takibi
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          İleriki tarihlerde kötü gidenleri karşılaştırmak için kaydedildi
        </span>
      </div>

      {history.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-xs">
          Henüz kaydedilmiş geçmiş rapor bulunmuyor. Yeni bir analiz başlattığınızda burada otomatik arşivlenir.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, idx) => {
            const rep = item.data;
            const dateStr = new Date(rep.createdAt || item.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={item.dbId || idx}
                className="p-4 rounded-xl border border-border bg-background hover:bg-accent/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
                      {rep.platform?.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {rep.niche} - {rep.location}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    "{rep.trendSignal?.singleSentenceSummary}"
                  </p>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {dateStr}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectReport(rep)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition"
                  >
                    Görüntüle
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReport(item.dbId, idx)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
