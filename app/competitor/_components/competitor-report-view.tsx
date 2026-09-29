'use client';

import React, { useState } from 'react';
import {
  Swords,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Layers,
  Sparkles,
  CheckCircle2,
  FileCode,
  LayoutGrid,
  Tag,
  TrendingUp,
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
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);
  const [copiedAdvIdx, setCopiedAdvIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'markdown'>('visual');

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(report.markdownReport);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyText = async (text: string, type: 'hook' | 'adv', idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hook') {
        setCopiedHookIdx(idx);
        setTimeout(() => setCopiedHookIdx(null), 2000);
      } else {
        setCopiedAdvIdx(idx);
        setTimeout(() => setCopiedAdvIdx(null), 2000);
      }
    } catch {
      // ignore
    }
  };

  const isUnverified = (val: string) => val.includes('Doğrulanamadı') || val.includes('Veri Çekilemedi');

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <Swords className="w-3.5 h-3.5" />
                Ticari Rekabet & İstihbarat Raporu
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(report.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
                {report.niche || 'Genel E-Ticaret'}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                <span className="text-emerald-500">{report.ownBrand.name}</span>
                <span className="mx-2.5 text-muted-foreground/50 font-normal">vs</span>
                <span className="text-rose-500">{report.competitorBrand.name}</span>
              </h1>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-3">
              {report.ownBrand.url && (
                <span className="flex items-center gap-1">
                  🌐 Siz: <code className="font-mono text-foreground">{report.ownBrand.url}</code>
                </span>
              )}
              {report.competitorBrand.url && (
                <span className="flex items-center gap-1">
                  🌐 Rakip: <code className="font-mono text-foreground">{report.competitorBrand.url}</code>
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 rounded-xl border border-border bg-background">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'visual'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Görsel Panel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'markdown'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Markdown Metni
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all"
            >
              {copiedMd ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  <span>Markdown Kopyala</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all"
            >
              <Printer className="w-4 h-4 text-muted-foreground" />
              <span>Yazdır / PDF</span>
            </button>
          </div>
        </div>

        {/* Verification & Compliance Badge */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-secondary/30 border border-border/50 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-foreground">Doğruluk Denetimi:</span>
            <span className="text-muted-foreground">{report.verificationSummary.complianceNote}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              {report.verificationSummary.verifiedCount} Doğrulanmış Veri
            </span>
            {report.verificationSummary.unverifiedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                {report.verificationSummary.unverifiedCount} Manuel Kontrol
              </span>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'markdown' ? (
        <div className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              Doğrudan Çıktı Markdown Formatı
            </h3>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              {copiedMd ? 'Kopyalandı' : 'Tümünü Kopyala'}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-background border border-border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {report.markdownReport}
          </pre>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. REKLAM KÜTÜPHANESİ VE KREATİF RADARI */}
          {/* ========================================================================= */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Bölüm 1
                </span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500" />
                  Reklam Kütüphanesi ve Kreatif Radarı
                </h2>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Meta Reklam Kütüphanesi & Google Ads Şeffaflık
              </span>
            </div>

            {/* Aktif Reklam Durumu Karşılaştırması */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Siz */}
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-foreground text-sm">{report.ownBrand.name}</h4>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Sizin Markanız
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <p className="text-[11px] text-muted-foreground">Aktif Reklam Sayısı</p>
                    <p className={`text-sm font-bold mt-0.5 ${
                      isUnverified(report.adRadar.ownAdStatus.activeAdCount)
                        ? 'text-amber-500'
                        : 'text-foreground'
                    }`}>
                      {report.adRadar.ownAdStatus.activeAdCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <p className="text-[11px] text-muted-foreground">Ağırlıklı Format</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                      {report.adRadar.ownAdStatus.primaryFormat}
                    </p>
                  </div>
                </div>

                {report.adRadar.ownAdStatus.notes && (
                  <p className="text-xs text-muted-foreground">
                    ℹ️ {report.adRadar.ownAdStatus.notes}
                  </p>
                )}
              </div>

              {/* Rakip */}
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <h4 className="font-bold text-foreground text-sm">{report.competitorBrand.name}</h4>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold">
                    Rakip Marka
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <p className="text-[11px] text-muted-foreground">Aktif Reklam Sayısı</p>
                    <p className={`text-sm font-bold mt-0.5 ${
                      isUnverified(report.adRadar.competitorAdStatus.activeAdCount)
                        ? 'text-amber-500'
                        : 'text-foreground'
                    }`}>
                      {report.adRadar.competitorAdStatus.activeAdCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <p className="text-[11px] text-muted-foreground">Ağırlıklı Format</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                      {report.adRadar.competitorAdStatus.primaryFormat}
                    </p>
                  </div>
                </div>

                {report.adRadar.competitorAdStatus.notes && (
                  <p className="text-xs text-muted-foreground">
                    ℹ️ {report.adRadar.competitorAdStatus.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Rakibin Öne Çıkardığı Reklam Kancaları (Hooks) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Rakibin Öne Çıkardığı Reklam Kancaları (Hooks)
                </h3>
                <span className="text-xs text-muted-foreground">
                  En çok tekrar eden 2-3 reklam stratejisi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.adRadar.competitorHooks.map((hook, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-border bg-background hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {idx + 1}. {hook.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                          {hook.focusArea}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {hook.hookStrategy}
                      </p>
                    </div>

                    {hook.sampleCopy && (
                      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-xs font-mono text-foreground relative group">
                        <p className="italic text-[11px] pr-6">{hook.sampleCopy}</p>
                        <button
                          type="button"
                          onClick={() => handleCopyText(hook.sampleCopy || '', 'hook', idx)}
                          title="Kancayı Kopyala"
                          className="absolute right-2 top-2 p-1 rounded-md text-muted-foreground hover:text-foreground bg-background/80 transition-all"
                        >
                          {copiedHookIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. TİCARİ KOŞULLAR VE TEKLİF KARŞILAŞTIRMA MATRİSİ */}
          {/* ========================================================================= */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Bölüm 2
                </span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  Ticari Koşullar ve Teklif Karşılaştırma Matrisi
                </h2>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Ana Sayfa, Ürün Sayfası ve Sepet Kuralı Verileri
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-background">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="py-3.5 px-4 font-semibold text-foreground w-[22%]">
                      Kriter
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400 w-[24%]">
                      {report.ownBrand.name} (Siz)
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400 w-[24%]">
                      {report.competitorBrand.name} (Rakip)
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-foreground w-[30%]">
                      Kim Avantajlı? (Fark)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.commercialMatrix.map((row, idx) => {
                    const ownUnverified = isUnverified(row.ownValue);
                    const compUnverified = isUnverified(row.competitorValue);

                    return (
                      <tr key={idx} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {row.criteria}
                        </td>

                        <td className="py-3.5 px-4">
                          {ownUnverified ? (
                            <span className="inline-flex items-center gap-1 font-mono text-amber-500 font-medium text-[11px]">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {row.ownValue}
                            </span>
                          ) : (
                            <span className="font-medium text-foreground">{row.ownValue}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {compUnverified ? (
                            <span className="inline-flex items-center gap-1 font-mono text-amber-500 font-medium text-[11px]">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {row.competitorValue}
                            </span>
                          ) : (
                            <span className="font-medium text-foreground">{row.competitorValue}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {row.winner === 'own' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] shrink-0">
                                SİZ ÖNDESİNİZ
                              </span>
                            )}
                            {row.winner === 'competitor' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-[10px] shrink-0">
                                RAKİP ÖNDE
                              </span>
                            )}
                            {row.winner === 'neutral' && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold text-[10px] shrink-0">
                                EŞİT / BENZER
                              </span>
                            )}
                            {row.winner === 'unverified' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold text-[10px] shrink-0">
                                KONTROL
                              </span>
                            )}
                            <span className="text-muted-foreground text-xs leading-normal">
                              {row.advantageDescription}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. BENZER / EŞDEĞER ÜRÜN FİYATLANDIRMA KIYASLAMASI */}
          {/* ========================================================================= */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Bölüm 3
                </span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-500" />
                  Benzer / Eşdeğer Ürün Fiyatlandırma Kıyaslaması
                </h2>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Hero (En Çok Satan) 3 Ürün Grubu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {report.productPriceComparisons.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-background p-5 space-y-4 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground truncate">
                      {idx + 1}. {item.productGroup}
                    </span>
                    {item.winner === 'own' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                        Fiyat Avantajı Sizde
                      </span>
                    ) : item.winner === 'competitor' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                        Rakip Daha Ucuz
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold shrink-0">
                        Dengeli Fiyat
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-[10px] text-muted-foreground">Sizin Fiyatınız</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {item.ownPrice}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                      <p className="text-[10px] text-muted-foreground">Rakip Fiyatı</p>
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {item.competitorPrice}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Net Fiyat Farkı:</span>
                      <span className="font-bold text-foreground">{item.priceDiff}</span>
                    </div>
                    {item.analysis && (
                      <p className="text-[11px] text-muted-foreground leading-normal pt-1">
                        {item.analysis}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4. NET AKSİYON LİSTESİ (ÖZET BULGULAR) */}
          {/* ========================================================================= */}
          <section className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Bölüm 4
                </span>
                <h2 className="text-lg lg:text-xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Net Aksiyon Listesi (Özet Bulgular)
                </h2>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Kreatif Stratejisi ve Açık Kapatma Aksiyonları
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sizin Ticari Avantajlarınız (Reklamlarda Vurgulanması Gerekenler) */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      Sizin Ticari Avantajlarınız
                    </h3>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Reklamlarda ve Başlıklarda Doğrudan Vurgulanacaklar
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {report.actionList.ownAdvantages.map((adv, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-background border border-border space-y-2.5"
                    >
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        {adv.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {adv.concreteFact}
                      </p>

                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 relative group">
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pr-6">
                          🎯 Kreatif / Reklam Metni: {adv.adCopyRecommendation}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyText(adv.adCopyRecommendation, 'adv', idx)}
                          title="Reklam Metnini Kopyala"
                          className="absolute right-2 top-2 p-1 rounded-md text-emerald-600 hover:text-emerald-800 bg-background/80 transition-all"
                        >
                          {copiedAdvIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rakibin Ticari Avantajları (Kapatılması Gereken Açıklar) */}
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-500/20">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      Rakibin Ticari Avantajları
                    </h3>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      Dönüşüm Kaçırmamak İçin Kapatılması Gereken Açıklar
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {report.actionList.competitorAdvantages.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-background border border-border space-y-2.5"
                    >
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        {gap.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {gap.competitorAdvantageFact}
                      </p>

                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                          🛠️ Kapatma Taktiği: {gap.closingTactic}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
