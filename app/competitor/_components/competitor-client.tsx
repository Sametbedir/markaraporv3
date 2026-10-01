'use client';

import React, { useState, useEffect } from 'react';
import {
  Swords,
  History,
  FileSpreadsheet,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { CompetitorReportResult, CompetitorAnalysisRequest } from '@/lib/competitor-analysis';
import CompetitorParams from './competitor-params';
import CompetitorReportView from './competitor-report-view';
import CompetitorHistoryView from './competitor-history-view';

interface CompetitorClientProps {
  userEmail: string;
  userCompany?: string;
  userWebsite?: string;
}

export default function CompetitorClient({
  userEmail,
  userCompany = '',
  userWebsite = '',
}: CompetitorClientProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<CompetitorReportResult | null>(null);
  const [history, setHistory] = useState<{ dbId?: string; createdAt: string; data: CompetitorReportResult }[]>([]);
  const [activeTab, setActiveTab] = useState<'params' | 'report' | 'history'>('params');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadingSteps = [
    'Marka konumlandırma ve değer önerileri analiz ediliyor...',
    'Teklif, huni ve ticari koşul matrisi oluşturuluyor...',
    'Ürün & fiyatlandırma stratejileri karşılaştırılıyor...',
    'Kreatif istihbarat ve reklam açısı (angle) kancaları çözümleniyor...',
    'Ajans seviyesi stratejik aksiyon planı hazırlanıyor...',
  ];

  useEffect(() => {
    fetchHistory();
    const cached = typeof window !== 'undefined' ? localStorage.getItem('last_competitor_report') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.brandPositioning) {
          setReport(parsed);
          setActiveTab('report');
        } else {
          localStorage.removeItem('last_competitor_report');
        }
      } catch {
        localStorage.removeItem('last_competitor_report');
      }
    }
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch('/api/competitor');
      if (res.ok) {
        const json = await res.json();
        if (json.reports && Array.isArray(json.reports) && json.reports.length > 0) {
          setHistory(json.reports);
        }
      }
    } catch (e) {
      console.warn('Geçmiş rakip raporları alınamadı:', e);
    }
  }

  async function handleGenerate(params: CompetitorAnalysisRequest) {
    setLoading(true);
    setLoadingStep(0);
    setErrorMsg(null);

    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_competitor_report', JSON.stringify(data.report));
        }
        setActiveTab('report');
        fetchHistory();
      } else {
        setErrorMsg(data.error || 'Rakip analizi oluşturulurken bir hata meydana geldi.');
      }
    } catch {
      setErrorMsg('Sunucu bağlantısı sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  async function deleteReportItem(dbId?: string, idx?: number) {
    if (dbId) {
      try {
        await fetch(`/api/competitor/${dbId}`, { method: 'DELETE' });
      } catch {}
    }
    setHistory((prev) => prev.filter((item, i) => (dbId ? item.dbId !== dbId : i !== idx)));
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              Stratejik Rekabet & Huni Raporu
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Ajans Seviyesi
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Marka konumlandırma, huni analizi, fiyatlandırma stratejisi, kreatif istihbarat ve ajans aksiyon planı.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={() => setActiveTab('params')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-accent text-foreground transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-primary" />
              <span>Yeni Kıyaslama Başlat</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('params')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'params'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Analiz Parametreleri</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          disabled={!report}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === 'report'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Mevcut Rekabet Raporu</span>
          {report && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'history'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Geçmiş Kıyaslamalar ({history.length})</span>
        </button>
      </div>

      {/* Loading Banner */}
      {loading && (
        <div className="p-6 rounded-3xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {loadingSteps[loadingStep]}
            </span>
          </div>
          <div className="w-full bg-primary/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tab 1: Parameters Form */}
      {activeTab === 'params' && (
        <CompetitorParams
          initialOwnName={userCompany || ''}
          initialOwnUrl={userWebsite || ''}
          onSubmit={handleGenerate}
          isLoading={loading}
        />
      )}

      {/* Tab 2: Report View */}
      {activeTab === 'report' && report && (
        <CompetitorReportView
          report={report}
          onNewAnalysis={() => setActiveTab('params')}
        />
      )}

      {/* Tab 3: History View */}
      {activeTab === 'history' && (
        <CompetitorHistoryView
          history={history}
          onSelectReport={(selected) => {
            setReport(selected);
            setActiveTab('report');
          }}
          onDeleteReport={deleteReportItem}
        />
      )}
    </div>
  );
}
