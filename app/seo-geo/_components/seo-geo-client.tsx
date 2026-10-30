'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass, RefreshCw, BarChart3, ShieldAlert, History, Printer
} from 'lucide-react';
import { SeoGeoReportResult } from '@/lib/seo-geo';
import SeoGeoParams, { PRESETS } from './seo-geo-params';
import SeoGeoReportView from './seo-geo-report-view';
import SeoGeoAlarmsView from './seo-geo-alarms-view';
import SeoGeoHistoryView from './seo-geo-history-view';

interface SeoGeoClientProps {
  userEmail: string;
  userCompany: string;
  initialPlatform?: string;
}

export default function SeoGeoClient({
  userEmail,
  userCompany,
  initialPlatform = 'ikas',
}: SeoGeoClientProps) {
  const [platform, setPlatform] = useState(initialPlatform);
  const [niche, setNiche] = useState('Kadın Giyim & Tekstil');
  const [location, setLocation] = useState('Bursa');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<SeoGeoReportResult | null>(null);
  const [history, setHistory] = useState<{ dbId?: string; createdAt: string; data: SeoGeoReportResult }[]>([]);
  const [activeTab, setActiveTab] = useState<'report' | 'alarms' | 'history'>('report');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadingSteps = [
    'Sektör ve bölge bilgileri yapay zekâya iletiliyor...',
    'Bölgesel GEO fırsatları ve yerel talep haritası çıkarılıyor...',
    `${platform.toUpperCase()} paneline özel teknik yönlendirme adımları hazırlanıyor...`,
    'Gelecek tarih erken uyarı ve negatif trend radarı taranıyor...',
  ];

  useEffect(() => {
    fetchHistory();
    const cached = typeof window !== 'undefined' ? localStorage.getItem('last_seo_geo_report') : null;
    if (cached) {
      try {
        setReport(JSON.parse(cached));
      } catch {}
    } else {
      generateReport({ platform: initialPlatform, niche: 'Kadın Giyim & Tekstil', location: 'Bursa' });
    }
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch('/api/seo-geo');
      if (res.ok) {
        const json = await res.json();
        if (json.reports && Array.isArray(json.reports) && json.reports.length > 0) {
          setHistory(json.reports);
        }
      }
    } catch (e) {
      console.warn('Geçmiş raporlar alınamadı:', e);
    }
  }

  async function generateReport(params?: {
    platform?: string;
    niche?: string;
    location?: string;
    websiteUrl?: string;
    targetKeywords?: string;
  }) {
    setLoading(true);
    setLoadingStep(0);
    setFeedbackMsg(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1100);

    const payload = {
      platform: params?.platform || platform,
      niche: params?.niche || niche,
      location: params?.location || location,
      websiteUrl: params?.websiteUrl ?? websiteUrl,
      targetKeywords: params?.targetKeywords ?? targetKeywords,
    };

    try {
      const res = await fetch('/api/seo-geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_seo_geo_report', JSON.stringify(data.report));
        }
        setActiveTab('report');
        fetchHistory();
      } else {
        setFeedbackMsg(data.error || 'Rapor oluşturulamadı.');
      }
    } catch (err: any) {
      setFeedbackMsg('Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  function applyPreset(p: typeof PRESETS[0]) {
    setPlatform(p.platform);
    setNiche(p.niche);
    setLocation(p.location);
    setTargetKeywords(p.keywords);
    generateReport({
      platform: p.platform,
      niche: p.niche,
      location: p.location,
      targetKeywords: p.keywords,
    });
  }

  async function deleteReportItem(dbId?: string, idx?: number) {
    if (dbId) {
      try {
        await fetch(`/api/seo-geo/${dbId}`, { method: 'DELETE' });
      } catch {}
    }
    setHistory((prev) => prev.filter((item, i) => (dbId ? item.dbId !== dbId : i !== idx)));
  }

  const criticalAlarmsCount = report?.trackingRadar?.alarms?.filter((a) => a.type === 'critical').length || 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                SEO & GEO Marka Raporu
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Yapay Zekâ Önerileri
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Yapay zekâ destekli SEO & GEO önerileri ve e-ticaret altyapınıza özel adım adım panel rehberi. Canlı arama verisi çekilmez.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {report && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-accent text-foreground transition shadow-sm"
              title="Raporu Yazdır / PDF Kaydet"
            >
              <Printer className="w-4 h-4 text-muted-foreground" />
              Yazdır / PDF
            </button>
          )}

          <button
            onClick={() => generateReport()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition shadow-md shadow-primary/25 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analiz Yapılıyor...' : 'Raporu Yenile & Güncelle'}
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* 1. Configuration & Parameters Component */}
      <SeoGeoParams
        platform={platform}
        setPlatform={setPlatform}
        niche={niche}
        setNiche={setNiche}
        location={location}
        setLocation={setLocation}
        websiteUrl={websiteUrl}
        setWebsiteUrl={setWebsiteUrl}
        targetKeywords={targetKeywords}
        setTargetKeywords={setTargetKeywords}
        loading={loading}
        loadingStep={loadingStep}
        loadingSteps={loadingSteps}
        onGenerate={() => generateReport()}
        onApplyPreset={applyPreset}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'report'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Güncel Marka Raporu</span>
        </button>

        <button
          onClick={() => setActiveTab('alarms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition relative ${
            activeTab === 'alarms'
              ? 'bg-destructive text-destructive-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>🚨 Kötü Gidenler & Erken Uyarı</span>
          {criticalAlarmsCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-destructive text-[11px] font-bold flex items-center justify-center ml-1 shadow-sm">
              {criticalAlarmsCount}
            </span>
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
          <span>Zaman İçinde Takip ({history.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: REPORT */}
      {activeTab === 'report' && report && (
        <SeoGeoReportView report={report} />
      )}

      {/* TAB CONTENT: ALARMS */}
      {activeTab === 'alarms' && report && (
        <SeoGeoAlarmsView report={report} />
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <SeoGeoHistoryView
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
