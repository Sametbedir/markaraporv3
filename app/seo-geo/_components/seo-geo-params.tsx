'use client';

import React from 'react';
import { Sparkles, MapPin, CheckCircle2, Info, Compass, RefreshCw } from 'lucide-react';

export const PLATFORMS = [
  {
    id: 'ikas',
    name: 'İkas',
    desc: 'Hızlı TTFB, Kategori/Ürün Meta & 301 Yönetimi',
    badge: 'Modern Altyapı',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    desc: 'App Store, Liquid Şablon, Çoklu Dil & Para Birimi',
    badge: 'Küresel & Liquid',
  },
  {
    id: 'ticimax',
    name: 'Ticimax',
    desc: 'Modüler Bloklar, XML Beslemeleri & Faceted SEO',
    badge: 'Yerli Pazar',
  },
  {
    id: 'ideasoft',
    name: 'IdeaSoft',
    desc: 'Modüler Yapı, Kategori Zengin Metin & Canonical',
    badge: 'Yerli Pazar',
  },
];

export const PRESETS = [
  {
    title: 'Bursa Tekstil & Giyim (İkas)',
    platform: 'ikas',
    niche: 'Kadın Giyim & Kumaş',
    location: 'Bursa',
    keywords: 'bursa kadın giyim, kumaş üreticileri, hızlı teslimat elbise',
  },
  {
    title: 'İstanbul Deri Çanta (Shopify)',
    platform: 'shopify',
    niche: 'Hakiki Deri Çanta & Cüzdan',
    location: 'İstanbul',
    keywords: 'el yapımı deri çanta, istanbul deri imalatçıları, lüks çanta',
  },
  {
    title: 'İzmir Mobilya (Ticimax)',
    platform: 'ticimax',
    niche: 'Modern Mobilya & Ahşap Dekorasyon',
    location: 'İzmir & Ege Bölgesi',
    keywords: 'izmir mobilya mağazaları, masif ahşap masa, ege içi nakliye',
  },
  {
    title: 'Ankara Anne-Bebek (IdeaSoft)',
    platform: 'ideasoft',
    niche: 'Organik Bebek Kıyafetleri & Bakım',
    location: 'Ankara',
    keywords: 'ankara organik bebek ürünleri, pamuklu tulum, aynı gün kargo',
  },
];

interface SeoGeoParamsProps {
  platform: string;
  setPlatform: (p: string) => void;
  niche: string;
  setNiche: (n: string) => void;
  location: string;
  setLocation: (l: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (u: string) => void;
  targetKeywords: string;
  setTargetKeywords: (k: string) => void;
  loading: boolean;
  loadingStep: number;
  loadingSteps: string[];
  onGenerate: () => void;
  onApplyPreset: (preset: typeof PRESETS[0]) => void;
}

export default function SeoGeoParams({
  platform,
  setPlatform,
  niche,
  setNiche,
  location,
  setLocation,
  websiteUrl,
  setWebsiteUrl,
  targetKeywords,
  setTargetKeywords,
  loading,
  loadingStep,
  loadingSteps,
  onGenerate,
  onApplyPreset,
}: SeoGeoParamsProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider">
            1. Analiz Parametreleri ve Veri Kaynakları
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Altyapı, Sektör ve Hedef Bölge Eşleştirmesi
        </span>
      </div>

      {/* Quick Presets */}
      <div className="mb-6">
        <span className="text-xs font-medium text-muted-foreground block mb-2">
          Hızlı Hazır Şablonlar:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className="text-left p-3 rounded-xl border border-border/70 hover:border-primary/50 bg-background/50 hover:bg-accent/50 transition group flex flex-col justify-between"
            >
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition line-clamp-1">
                {preset.title}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary/70" /> {preset.location}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Platform Selector */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">
            Kullanıcının E-Ticaret Altyapısı <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-background hover:bg-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {p.name}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sektör & Ürün Grubu */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">
            Analiz Edilecek Sektör / Ürün Grubu <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Örn: Kadın Giyim, Mobilya, Deri Ayakkabı..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Ana ürün veya niş kategorinizi belirtin.
          </p>

          <label className="text-xs font-semibold text-foreground block mt-3 mb-1">
            Web Sitesi URL (Opsiyonel)
          </label>
          <input
            type="text"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://siteniz.com"
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Hedef Bölge & Lokasyon */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-2">
            Hedef Bölge / Lokasyon (GEO) <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Örn: Bursa, İstanbul, İzmir, Marmara..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Örn: Şehir (Bursa) veya bölge bazlı yerel arama hacimleri taranır.
          </p>

          <label className="text-xs font-semibold text-foreground block mt-3 mb-1">
            Özel Odak Kelimeleri (Opsiyonel)
          </label>
          <input
            type="text"
            value={targetKeywords}
            onChange={(e) => setTargetKeywords(e.target.value)}
            placeholder="Örn: toptan kumaş, hızlı kargo elbise..."
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-5 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Altyapı bazlı teknik kodlar ve Google Trends sinyalleri otomatik hesaplanır.</span>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || !niche || !location}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analiz Ediliyor ({loadingStep + 1}/4)...</span>
            </>
          ) : (
            <>
              <Compass className="w-4 h-4" />
              <span>SEO & GEO Analizini Başlat</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Progress State */}
      {loading && (
        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
            <p className="text-xs font-medium text-foreground">
              {loadingSteps[loadingStep]}
            </p>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
