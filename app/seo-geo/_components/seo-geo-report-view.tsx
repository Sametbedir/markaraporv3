'use client';

import AiEstimateNotice from '@/components/ai-estimate-notice';
import React, { useState } from 'react';
import {
  TrendingUp, MapPin, Zap, Search, Layers, Store, Copy, Check,
  Code2, ShieldCheck, Cpu, GitFork, AlertCircle, Sparkles
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

  const {
    trendSignal,
    intentAndTaxonomy,
    opportunityArea,
    platformTechnicalActions,
    schemaMarkup,
    croTrustSignals,
    expectedTechnicalImpact,
  } = report;

  return (
    <div className="space-y-8">
      <AiEstimateNotice source={(report as { source?: string }).source} />
      {/* 0. ANLIK DURUM VE TREND SİNYALİ BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {trendSignal.statusBadge}
              </span>
              <span className="text-xs text-indigo-300/80">
                Talep Sinyali (yapay zekâ tahmini)
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
              "{trendSignal.singleSentenceSummary}"
            </h2>

            <p className="text-xs text-indigo-200/90 leading-relaxed max-w-3xl">
              <span className="font-semibold text-white">Mevsimsel / Anlık Dinamik: </span>
              {trendSignal.seasonalImpact}
            </p>
          </div>

          <div className="flex flex-row sm:flex-col gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center min-w-[130px]">
              <span className="text-[11px] text-indigo-200 block">Trend İvmesi</span>
              <span className="text-xl font-black text-emerald-400">
                {trendSignal.trendsDelta}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center min-w-[130px]">
              <span className="text-[11px] text-indigo-200 block">Teknik Sağlık</span>
              <span className="text-xl font-black text-amber-400">
                {report.healthScore}/100
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-800/50 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-indigo-300 font-medium">🔥 En Çok Yükselen Yerel Arama:</span>
          <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-white font-mono border border-indigo-400/30">
            {trendSignal.topRisingSearch}
          </span>
        </div>
      </div>

      {/* 1. NİYET VE MİMARİ STRATEJİSİ */}
      {intentAndTaxonomy && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <GitFork className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                1. Niyet ve Mimari Stratejisi (Search Intent & Taksonomi)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
              Funnel Hiyerarşisi
            </span>
          </div>

          {/* Funnel Stages */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Arama Niyeti (Funnel) Haritası:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {intentAndTaxonomy.funnelStages.map((stg, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border bg-background/60 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {stg.funnelPosition}
                      </span>
                      <span className="text-[11px] font-bold text-foreground">{stg.stage}</span>
                    </div>
                    <div className="pt-2 text-xs font-medium text-foreground">
                      <strong>Hedef Sayfa: </strong>
                      <span className="text-primary font-mono text-[11px]">{stg.targetPageType}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                    <span className="font-semibold text-foreground block">Örnek Sorgular:</span>
                    {stg.searchQueries.map((q, qi) => (
                      <div key={qi} className="font-mono text-[10px] text-primary truncate">• {q}</div>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
                    <strong className="text-foreground">Mimari Kural: </strong>
                    {stg.architectureRule}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cannibalization Prevention Box */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              Taksonomi & Cannibalization (Yamyamlık) Riski Önleme:
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              {intentAndTaxonomy.cannibalizationRisk.summary}
            </p>
            <div className="p-3 rounded-lg bg-background/80 border border-amber-500/20 text-xs font-medium text-foreground">
              <span className="text-amber-600 dark:text-amber-400 font-bold">📌 URL Slug vs HTML Gövdesi Kuralı: </span>
              {intentAndTaxonomy.cannibalizationRisk.slugVsBodyRule}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              {intentAndTaxonomy.cannibalizationRisk.preventionSteps.map((step, si) => (
                <li key={si} className="flex items-start gap-1.5 p-2 rounded-md bg-muted/40">
                  <span className="text-primary font-bold">✓</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 2. FIRSAT ALANI (SEO & GEO) */}
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
          <p className="text-xs text-muted-foreground">{opportunityArea.summary}</p>

          <div className="mt-3 pt-3 border-t border-emerald-500/15 text-xs text-foreground font-medium flex items-center gap-2">
            <span className="text-primary font-bold">🚚 Sevkiyat & Lojistik Avantajı:</span>
            <span>{opportunityArea.regionalShippingAdvantage}</span>
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
                {opportunityArea.missedKeywords.map((kw, i) => (
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

        {/* Geo Opportunities */}
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            Coğrafi (GEO) Bölgesel Fırsat Haritası:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {opportunityArea.geoOpportunities.map((geo, i) => (
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

      {/* 2.1 PLATFORMLARA ÖZEL TEKNİK AKSİYONLAR */}
      {platformTechnicalActions && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                Platform Spesifik Teknik Aksiyonlar (Altyapı: {platformTechnicalActions.platformName})
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
              {platformTechnicalActions.platformName}
            </span>
          </div>

          {/* Tarama Bütçesi & Faceted Navigation Kutusu */}
          <div className="p-5 rounded-xl border border-border bg-background/60 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Tarama Bütçesi ve İndeks Yönetimi (Faceted Navigation):
            </h4>
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
              <p>
                <strong>Panel Rotası: </strong>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{platformTechnicalActions.crawlBudgetStrategy.panelRoute}</span>
              </p>
              <p>
                <strong>Aksiyon: </strong> {platformTechnicalActions.crawlBudgetStrategy.facetedNavAction}
              </p>
              <p>
                <strong>Canonical Kurgusu: </strong> {platformTechnicalActions.crawlBudgetStrategy.canonicalRule}
              </p>
            </div>

            {platformTechnicalActions.crawlBudgetStrategy.codeOrConfigSnippet && (
              <div className="mt-2 p-3.5 rounded-lg bg-muted/60 border border-border font-mono text-[11px] text-foreground relative">
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-border/40 text-[10px] text-muted-foreground uppercase font-sans">
                  <span>Panele Girilecek Kod / Ayar:</span>
                  <button
                    type="button"
                    onClick={() => copyText(platformTechnicalActions.crawlBudgetStrategy.codeOrConfigSnippet!, 'crawl-snippet')}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    {copiedKey === 'crawl-snippet' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Kodu Kopyala
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-words">{platformTechnicalActions.crawlBudgetStrategy.codeOrConfigSnippet}</pre>
              </div>
            )}
          </div>

          {/* Core Web Vitals & DOM Optimizasyonu */}
          <div className="p-5 rounded-xl border border-border bg-background/60 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Sayfa Hızı (Core Web Vitals) & DOM Derinliği:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <strong className="text-foreground block mb-1">⚡ LCP Optimizasyonu</strong>
                <span className="text-muted-foreground">{platformTechnicalActions.coreWebVitalsStrategy.lcpOptimization}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <strong className="text-foreground block mb-1">🌲 DOM Node Derinliği</strong>
                <span className="text-muted-foreground">{platformTechnicalActions.coreWebVitalsStrategy.domNodeReduction}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <strong className="text-foreground block mb-1">📐 CLS (Düzen Kayması) Koruması</strong>
                <span className="text-muted-foreground">{platformTechnicalActions.coreWebVitalsStrategy.clsProtection}</span>
              </div>
            </div>
          </div>

          {/* Step By Step Panel Steps */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Yönetim Paneli Adım Adım Aksiyon Rehberi:
            </h4>
            <div className="space-y-3">
              {report.platformGuide.steps.map((step) => {
                const copyId = `platform-step-${step.stepNumber}`;
                return (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-xl border border-border bg-background/40 hover:border-primary/50 transition space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </span>
                      <div>
                        <h5 className="font-bold text-foreground text-xs">{step.title}</h5>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                          {step.section}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground pl-9 leading-relaxed">
                      {step.action}
                    </p>

                    {step.exactInputSample && (
                      <div className="ml-9 p-3 rounded-lg bg-muted/60 border border-border font-mono text-[11px] text-foreground relative">
                        <div className="flex items-center justify-between mb-1 text-[10px] text-muted-foreground uppercase font-sans">
                          <span>Panel Giriş Metni:</span>
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
                                <Copy className="w-3 h-3" /> Kopyala
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words">{step.exactInputSample}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. YAPISAL VERİ (SCHEMA) VE KOD SEVİYESİ GEO YÖNLENDİRMESİ */}
      {schemaMarkup && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                3. Yapısal Veri (Schema) ve Kod Seviyesi GEO Yönlendirmesi
              </h3>
            </div>
            <button
              type="button"
              onClick={() => copyText(schemaMarkup.jsonLdCode, 'schema-full-code')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              {copiedKey === 'schema-full-code' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Tüm Kodu Kopyaladınız
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> JSON-LD Şemasını Kopyala
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Şema Tipi: </strong> {schemaMarkup.title}
            </p>
            <p>{schemaMarkup.explanation}</p>
            <p className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
              📍 Yerleşim: {schemaMarkup.targetPlacement}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-border shadow-inner max-h-96">
            <pre className="whitespace-pre">{schemaMarkup.jsonLdCode}</pre>
          </div>
        </div>
      )}

      {/* 4. DÖNÜŞÜM (CRO) VE YEREL GÜVEN SİNYALLERİ */}
      {croTrustSignals && croTrustSignals.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                4. Dönüşüm (CRO) ve Yerel Güven Sinyalleri
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">Add-to-Cart & Checkout Optimizasyonu</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Sayfa / Alan</th>
                  <th className="p-3">UI Bileşeni</th>
                  <th className="p-3">Teknik Sinyal & Güven Metni</th>
                  <th className="p-3">Beklenen Davranışsal Etki</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {croTrustSignals.map((cro, i) => (
                  <tr key={i} className="hover:bg-accent/30 transition">
                    <td className="p-3 font-semibold text-foreground">{cro.locationArea}</td>
                    <td className="p-3 text-indigo-600 dark:text-indigo-400 font-medium">{cro.component}</td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">{cro.technicalSignal}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">{cro.expectedBehaviorImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. BEKLENEN TEKNİK ETKİ (GERÇEK METRİKLER) */}
      {expectedTechnicalImpact && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                5. Beklenen Teknik Etki (Gerçek Teknik Metrikler)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">İndekslenme & Tarama Matrisi</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {expectedTechnicalImpact.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Tıklama Oranı (CTR)</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {expectedTechnicalImpact.ctrImpact}
              </span>
              <span className="text-[10px] text-muted-foreground block">Zengin Snippet ile</span>
            </div>

            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Tarama Bütçesi</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {expectedTechnicalImpact.crawlBudgetEfficiency}
              </span>
              <span className="text-[10px] text-muted-foreground block">Gereksiz URL Filtresi</span>
            </div>

            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Dizine Giriş Hızı</span>
              <span className="text-base font-black text-primary">
                {expectedTechnicalImpact.indexabilityGrowth}
              </span>
              <span className="text-[10px] text-muted-foreground block">Google Search Console</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Core Web Vitals Hedefi</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {expectedTechnicalImpact.coreWebVitalsTarget}
              </span>
              <span className="text-[10px] text-muted-foreground block">Mobil Kullanılabilirlik</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
