'use client';

import React, { useState } from 'react';
import {
  Swords,
  Copy,
  Check,
  Printer,
  Target,
  Layers,
  Tag,
  Sparkles,
  Zap,
  TrendingUp,
  FileCode,
  LayoutGrid,
  Shield,
  ShoppingCart,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { CompetitorReportResult } from '@/lib/competitor-analysis';

interface CompetitorReportViewProps {
  report: CompetitorReportResult;
  onNewAnalysis?: () => void;
}

export default function CompetitorReportView({
  report,
  onNewAnalysis,
}: CompetitorReportViewProps) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'markdown'>('visual');

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(report.markdownReport);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2500);
    } catch {}
  };

  const handleCopyText = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {}
  };

  const bp = report?.brandPositioning || {
    ownPositioning: 'Veri analiz ediliyor...',
    ownValueProposition: 'Değer önerisi hazırlanıyor...',
    competitorPositioning: 'Rakip konumlandırması inceleniyor...',
    competitorValueProposition: 'Rakip değer önerisi inceleniyor...',
    opportunityGap: 'Fırsat boşlukları taranıyor...',
    strategicInference: 'Stratejik çıkarım yapılıyor...',
  };
  const fm = Array.isArray(report?.funnelMatrix) ? report.funnelMatrix : [];
  const ps = report?.pricingStrategy || {
    pricePerception: 'Fiyatlandırma algısı analiz ediliyor...',
    ownPricingModel: 'Değer Odaklı',
    competitorPricingModel: 'Penetrasyon',
    campaignStructure: 'Kampanya kurgusu inceleniyor...',
    bundlingRecommendation: 'Paketleme önerisi hazırlanıyor...',
    strategicInference: 'Strateji oluşturuluyor...',
  };
  const ci = report?.creativeIntelligence || {
    competitorMainAngle: 'Kreatif açılar taranıyor...',
    competitorHeroMessage: 'Hero mesajı inceleniyor...',
    competitorWeakSpot: 'Zayıf karın noktaları tespit ediliyor...',
    hookSuggestions: [],
  };
  const ap = report?.agencyActionPlan || {
    quickWin: {
      title: 'Hemen Uygulanacak Hamle',
      action: 'Aksiyon hazırlanıyor...',
      expectedImpact: 'Yüksek dönüşüm',
      timeframe: '24 Saat',
    },
    midTermStrategy: {
      title: 'Orta Vadeli Rekabet Hamlesi',
      description: 'Strateji hazırlanıyor...',
      steps: [],
      competitiveEdge: 'Rekabet avantajı oluşturuluyor...',
    },
    keyTakeaway: 'Stratejik rekabet ve huni raporu hazırlandı.',
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ═══ TOP HEADER ═══ */}
      <div className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-rose-500/10 to-amber-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Swords className="w-3.5 h-3.5" />
                Stratejik Rekabet & Huni Raporu
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(report.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
                {report.niche || 'Genel E-Ticaret'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              <span className="text-emerald-500">{report.ownBrand.name}</span>
              <span className="mx-2.5 text-muted-foreground/50 font-normal">vs</span>
              <span className="text-rose-500">{report.competitorBrand.name}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 rounded-xl border border-border bg-background">
              <button type="button" onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'visual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Görsel Panel
              </button>
              <button type="button" onClick={() => setViewMode('markdown')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'markdown' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <FileCode className="w-3.5 h-3.5" /> Markdown
              </button>
            </div>
            <button type="button" onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all">
              {copiedMd ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-emerald-500">Kopyalandı!</span></> : <><Copy className="w-4 h-4 text-muted-foreground" /><span>Markdown Kopyala</span></>}
            </button>
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all">
              <Printer className="w-4 h-4 text-muted-foreground" /><span>Yazdır / PDF</span>
            </button>
          </div>
        </div>

        {/* No-Hallucination Badge */}
        <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-primary/5 border border-border/50 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold text-foreground">Ajans Seviyesi Stratejik Çıkarım Standardı:</span>
          <span className="text-muted-foreground">Uydurma metrik yok, sığ karşılaştırma yok. Veri eksikse strateji çıkarımı yapıldı.</span>
        </div>
      </div>

      {viewMode === 'markdown' ? (
        <div className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" /> Markdown Çıktısı
            </h3>
            <button type="button" onClick={handleCopyMarkdown}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium">
              {copiedMd ? 'Kopyalandı' : 'Tümünü Kopyala'}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-background border border-border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {report.markdownReport}
          </pre>
        </div>
      ) : (
        <>
          {/* ═══ 1. MARKA KONUMLANDIRMA ═══ */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Bölüm 1</span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" /> Marka Konumlandırma ve Değer Önerisi
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="font-bold text-foreground text-sm">{report.ownBrand.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold ml-auto">Sizin Konumlandırmanız</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{bp.ownPositioning}</p>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <p className="text-[11px] text-muted-foreground">Değer Önerisi</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{bp.ownValueProposition}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h4 className="font-bold text-foreground text-sm">{report.competitorBrand.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold ml-auto">Rakip Konumlandırma</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{bp.competitorPositioning}</p>
                <div className="p-3 rounded-xl bg-background border border-border">
                  <p className="text-[11px] text-muted-foreground">Değer Önerisi</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{bp.competitorValueProposition}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">🎯 Fırsat Boşluğu</p>
                <p className="text-xs text-foreground leading-relaxed">{bp.opportunityGap}</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">📊 Stratejik Çıkarım</p>
                <p className="text-xs text-foreground leading-relaxed">{bp.strategicInference}</p>
              </div>
            </div>
          </section>

          {/* ═══ 2. HUNİ MATRİSİ ═══ */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Bölüm 2</span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-500" /> Teklif, Huni ve Ticari Koşul Matrisi
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {fm.map((row, idx) => (
                <div key={idx} className="rounded-2xl border border-border bg-background hover:border-primary/30 transition-all">
                  <div className="p-4 flex items-center justify-between border-b border-border/50">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      {row.criteria}
                    </h4>
                    {row.advantage === 'own' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">SİZ AVANTAJLISINIZ</span>
                    )}
                    {row.advantage === 'competitor' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[10px]">RAKİP AVANTAJLI</span>
                    )}
                    {row.advantage === 'neutral' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold text-[10px]">DENGELİ</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                    <div className="p-4 space-y-1">
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">📗 {report.ownBrand.name}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{row.ownStrategy}</p>
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase">📕 {report.competitorBrand.name}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{row.competitorStrategy}</p>
                    </div>
                    <div className="p-4 space-y-1 bg-primary/[0.02]">
                      <p className="text-[10px] font-semibold text-primary uppercase">🔍 Stratejik Analiz</p>
                      <p className="text-xs text-foreground leading-relaxed font-medium">{row.strategicAnalysis}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ 3. FİYATLANDIRMA STRATEJİSİ ═══ */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Bölüm 3</span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-500" /> Ürün & Fiyatlandırma Stratejisi
                </h2>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-background to-secondary/20 border border-border">
              <h4 className="font-bold text-foreground text-sm mb-2">💰 Fiyat Algısı</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{ps.pricePerception}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{report.ownBrand.name} Fiyatlandırma Modeli</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ps.ownPricingModel}</p>
              </div>
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">{report.competitorBrand.name} Fiyatlandırma Modeli</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ps.competitorPricingModel}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
                <p className="text-[11px] font-semibold text-foreground">📦 Rakip Kampanya Kurgusu</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ps.campaignStructure}</p>
              </div>
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                <p className="text-[11px] font-semibold text-primary">🎁 Paketleme Önerisi</p>
                <p className="text-xs text-foreground leading-relaxed">{ps.bundlingRecommendation}</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">📊 Stratejik Çıkarım</p>
                <p className="text-xs text-foreground leading-relaxed">{ps.strategicInference}</p>
              </div>
            </div>
          </section>

          {/* ═══ 4. KREATİF İSTİHBARAT ═══ */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Bölüm 4</span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" /> Kreatif ve Reklam Açısı (Angle) İstihbaratı
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase">🎯 Rakibin Ana Reklam Açısı</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ci.competitorMainAngle}</p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
                <p className="text-[11px] font-semibold text-foreground">🖼️ Rakibin Hero Mesajı</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">"{ci.competitorHeroMessage}"</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">⚡ Rakibin Zayıf Karnı</p>
                <p className="text-xs text-foreground leading-relaxed font-medium">{ci.competitorWeakSpot}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Vurucu Kanca (Hook) Önerileri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(ci.hookSuggestions || []).map((hook, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-border bg-background hover:border-primary/40 transition-all space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{idx + 1}. {hook.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{hook.type}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{hook.platform}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 relative group">
                      <p className="text-[12px] font-medium text-foreground pr-8 leading-relaxed">{hook.adCopy}</p>
                      <button type="button" onClick={() => handleCopyText(hook.adCopy, idx)} title="Kopyala"
                        className="absolute right-2.5 top-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground bg-background/80 transition-all">
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Gerekçe:</span> {hook.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ 5. AJANS AKSİYON PLANI ═══ */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Bölüm 5</span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" /> Ajans İçin Aksiyon Planı
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Win */}
              <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Hemen Yapılması Gereken</h3>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Quick Win — {ap.quickWin.timeframe}</p>
                  </div>
                </div>
                <h4 className="font-bold text-foreground text-xs">{ap.quickWin.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{ap.quickWin.action}</p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    ⚡ Beklenen Etki: {ap.quickWin.expectedImpact}
                  </p>
                </div>
              </div>

              {/* Mid-Term Strategy */}
              <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-background p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-indigo-500/20">
                  <Target className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Orta Vadeli Strateji</h3>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">2-4 Hafta İçinde Kurgulanacak</p>
                  </div>
                </div>
                <h4 className="font-bold text-foreground text-xs">{ap.midTermStrategy.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{ap.midTermStrategy.description}</p>
                <div className="space-y-2">
                  {(ap.midTermStrategy?.steps || []).map((step, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-background border border-border">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    🏆 Rekabet Avantajı: {ap.midTermStrategy.competitiveEdge}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Takeaway */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-background to-primary/5 border-2 border-primary/20">
              <p className="text-sm font-bold text-foreground text-center">
                💡 Ana Çıkarım
              </p>
              <p className="text-xs text-center text-muted-foreground leading-relaxed mt-2 max-w-3xl mx-auto">
                {ap.keyTakeaway}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
