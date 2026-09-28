'use client';

import React, { useState } from 'react';
import {
  TrendingUp, MapPin, Zap, Search, Layers, Store, Copy, Check,
} from 'lucide-react';
import { SeoGeoReportResult } from '@/lib/seo-geo';

interface SeoGeoReportViewProps {
  report: SeoGeoReportResult;
}

export default function SeoGeoReportView({ report }: SeoGeoReportViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* 1. Anlık Durum ve Trend Sinyali Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {report.trendSignal.statusBadge}
              </span>
              <span className="text-xs text-indigo-300/80">
                Google Trends & Yerel Tarama Sinyali
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
              "{report.trendSignal.singleSentenceSummary}"
            </h2>

            <p className="text-xs text-indigo-200/90 leading-relaxed max-w-3xl">
              <span className="font-semibold text-white">Mevsimsel Dinamik: </span>
              {report.trendSignal.seasonalImpact}
            </p>
          </div>

          <div className="flex flex-row sm:flex-col gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center min-w-[130px]">
              <span className="text-[11px] text-indigo-200 block">Trend İvmesi</span>
              <span className="text-xl font-black text-emerald-400">
                {report.trendSignal.trendsDelta}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center min-w-[130px]">
              <span className="text-[11px] text-indigo-200 block">SEO Sağlık Skoru</span>
              <span className="text-xl font-black text-amber-400">
                {report.healthScore}/100
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-800/50 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-indigo-300 font-medium">🔥 En Çok Yükselen Yerel Arama:</span>
          <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-white font-mono border border-indigo-400/30">
            {report.trendSignal.topRisingSearch}
          </span>
        </div>
      </div>

      {/* 2. Fırsat Alanı (SEO & GEO) */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
              2. Fırsat Alanı (SEO & GEO Coğrafi Optimizasyon)
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            {report.location} Odaklı Yerel Fırsatlar
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-foreground text-sm leading-relaxed">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Kaçırılan Potansiyel Özeti:
          </p>
          <p className="text-xs text-muted-foreground">{report.opportunityArea.summary}</p>
          
          <div className="mt-3 pt-3 border-t border-emerald-500/15 text-xs text-foreground font-medium flex items-center gap-2">
            <span className="text-primary font-bold">🚚 Sevkiyat & Lojistik Avantajı:</span>
            <span>{report.opportunityArea.regionalShippingAdvantage}</span>
          </div>
        </div>

        {/* Keywords Table */}
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            Kaçırılan Yüksek Hacimli Anahtar Kelimeler:
          </h4>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Anahtar Kelime</th>
                  <th className="p-3">Aylık Hacim</th>
                  <th className="p-3">Trend</th>
                  <th className="p-3">Zorluk</th>
                  <th className="p-3">Bölge</th>
                  <th className="p-3">Niyet</th>
                  <th className="p-3 text-right">Fırsat Skoru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.opportunityArea.missedKeywords.map((kw, i) => (
                  <tr key={i} className="hover:bg-accent/30 transition">
                    <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-primary" />
                      {kw.keyword}
                    </td>
                    <td className="p-3 text-foreground font-mono">{kw.monthlyVolume}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{kw.searchTrend}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {kw.difficulty}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{kw.regionPriority}</td>
                    <td className="p-3 text-muted-foreground">{kw.intent}</td>
                    <td className="p-3 text-right font-bold text-primary font-mono">{kw.opportunityScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Geo Cards */}
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            Coğrafi (GEO) Bölgesel Fırsat Haritası:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.opportunityArea.geoOpportunities.map((geo, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-background/50 hover:border-primary/40 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">{geo.cityOrRegion}</span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{geo.growthRate}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <strong className="text-foreground">Avantaj: </strong> {geo.localAdvantage}
                </p>
                <div className="pt-2 border-t border-border/50 text-[11px] text-primary font-medium">
                  👉 {geo.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Altyapı Bazlı Adım Adım Uygulama Rehberi */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
              3. Altyapı Bazlı Adım Adım Uygulama Rehberi
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
            {report.platformGuide.selectedPlatform}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-accent/40 border border-border text-xs text-foreground flex items-center gap-2">
          <Store className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Yönetim Paneli Rotası: </strong> {report.platformGuide.panelNavigation}
          </span>
        </div>

        <div className="space-y-4">
          {report.platformGuide.steps.map((step) => {
            const copyId = `step-${step.stepNumber}`;
            return (
              <div
                key={step.stepNumber}
                className="p-5 rounded-xl border border-border bg-background/60 hover:border-primary/50 transition space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                    {step.stepNumber}
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{step.title}</h4>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {step.section}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pl-10">
                  {step.action}
                </p>

                {step.exactInputSample && (
                  <div className="ml-10 p-3.5 rounded-lg bg-muted/60 border border-border font-mono text-[11px] text-foreground relative group">
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-border/40 text-[10px] text-muted-foreground uppercase font-sans">
                      <span>Panele Girilecek Kod / Metin Örneği:</span>
                      <button
                        type="button"
                        onClick={() => copyText(step.exactInputSample!, copyId)}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        {copiedKey === copyId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" /> Kopyalandı
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Panoya Kopyala
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-words">{step.exactInputSample}</pre>
                  </div>
                )}

                {step.proTip && (
                  <div className="ml-10 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex items-start gap-2">
                    <span className="font-bold">💡 Uzman İpucu:</span>
                    <span>{step.proTip}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Beklenen Etki */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
              4. Beklenen Etki ve Dönüşüm Simülasyonu
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">Tahmini Büyüme Matrisi</span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {report.expectedImpact.summary}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Organik Trafik Büyümesi</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {report.expectedImpact.estimatedTrafficGrowth}
            </span>
            <span className="text-[10px] text-muted-foreground block">30-45 Gün İçinde Hedef</span>
          </div>

          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Sepet Dönüşüm Çarpanı</span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {report.expectedImpact.estimatedConversionIncrease}
            </span>
            <span className="text-[10px] text-muted-foreground block">Yerel Güven Rozetiyle</span>
          </div>

          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Başa Baş & Sonuç Süresi</span>
            <span className="text-xl font-black text-primary">
              {report.expectedImpact.breakEvenTimeframe}
            </span>
            <span className="text-[10px] text-muted-foreground block">Google İndeksleme Hızı</span>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
            <span className="text-[11px] text-muted-foreground block font-medium">Ek Ciro Potansiyeli</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400 line-clamp-1">
              {report.expectedImpact.projectedRevenueImpact}
            </span>
            <span className="text-[10px] text-muted-foreground block">Aylık Tahmini Katkı</span>
          </div>
        </div>
      </div>
    </div>
  );
}
