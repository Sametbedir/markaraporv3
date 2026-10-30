'use client';

import React, { useState } from 'react';
import {
  Swords,
  Globe,
  Instagram,
  ShieldCheck,
  Building2,
  Zap,
} from 'lucide-react';
import { CompetitorAnalysisRequest } from '@/lib/competitor-analysis';

interface CompetitorParamsProps {
  initialOwnName?: string;
  initialOwnUrl?: string;
  onSubmit: (params: CompetitorAnalysisRequest) => void;
  isLoading: boolean;
}

const PRESETS = [
  {
    label: '👗 Butik Moda & Giyim',
    ownBrandName: 'Markanız Butik',
    ownBrandUrl: 'https://markanizbutik.com',
    ownBrandInstagram: '@markanizbutik',
    competitorBrandName: 'Rakip Moda',
    competitorBrandUrl: 'https://rakipmoda.com',
    competitorBrandInstagram: '@rakipmoda',
    niche: 'Kadın Giyim & Butik',
    rawLibraryData:
      'Kendi Sitemiz: 750 TL üzeri kargo bedava, standart kargo 49 TL. İlk siparişe 100 TL kupon.\nRakip Sitemiz: 1000 TL üzeri kargo bedava, standart kargo 79 TL. Sepette %15 anında indirim. Peşin fiyatına 3 taksit.',
  },
  {
    label: '💄 Kozmetik & Cilt Bakımı',
    ownBrandName: 'Dermacare TR',
    ownBrandUrl: 'https://dermacaretr.com',
    ownBrandInstagram: '@dermacaretr',
    competitorBrandName: 'GlowSkin',
    competitorBrandUrl: 'https://glowskin.com.tr',
    competitorBrandInstagram: '@glowskintr',
    niche: 'Kozmetik & Cilt Bakımı',
    rawLibraryData:
      'Kendi Sitemiz: Serumlar 550 TL, kargo 500 TL üzeri ücretsiz. Hediye tester gönderimi var.\nRakip: Serumlar 590 TL, kargo 750 TL üzeri ücretsiz. İlk siparişte %10 indirim pop-up var.',
  },
  {
    label: '☕ Kahve & Gurme Gıda',
    ownBrandName: 'Artisan Roast',
    ownBrandUrl: 'https://artisanroast.com.tr',
    ownBrandInstagram: '@artisanroast',
    competitorBrandName: 'BeanCraft',
    competitorBrandUrl: 'https://beancraft.com.tr',
    competitorBrandInstagram: '@beancraft',
    niche: 'Nitelikli Kahve & Gurme Gıda',
    rawLibraryData:
      'Kendi Sitemiz: 250g çekirdek kahve 280 TL, 600 TL üzeri kargo ücretsiz.\nRakip: 250g çekirdek 310 TL, 800 TL üzeri kargo ücretsiz. Abonelik paketinde %20 indirim var.',
  },
];

export default function CompetitorParams({
  initialOwnName = '',
  initialOwnUrl = '',
  onSubmit,
  isLoading,
}: CompetitorParamsProps) {
  const [ownBrandName, setOwnBrandName] = useState(initialOwnName || '');
  const [ownBrandUrl, setOwnBrandUrl] = useState(initialOwnUrl || '');
  const [ownBrandInstagram, setOwnBrandInstagram] = useState('');

  const [competitorBrandName, setCompetitorBrandName] = useState('');
  const [competitorBrandUrl, setCompetitorBrandUrl] = useState('');
  const [competitorBrandInstagram, setCompetitorBrandInstagram] = useState('');

  const [niche, setNiche] = useState('Kadın Giyim & E-Ticaret');
  const [rawLibraryData, setRawLibraryData] = useState('');

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setOwnBrandName(preset.ownBrandName);
    setOwnBrandUrl(preset.ownBrandUrl);
    setOwnBrandInstagram(preset.ownBrandInstagram);
    setCompetitorBrandName(preset.competitorBrandName);
    setCompetitorBrandUrl(preset.competitorBrandUrl);
    setCompetitorBrandInstagram(preset.competitorBrandInstagram);
    setNiche(preset.niche);
    setRawLibraryData(preset.rawLibraryData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownBrandName.trim() || !competitorBrandName.trim()) return;

    onSubmit({
      ownBrandName,
      ownBrandUrl,
      ownBrandInstagram,
      competitorBrandName,
      competitorBrandUrl,
      competitorBrandInstagram,
      niche,
      rawLibraryData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Strict Compliance Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-sm">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              Bu rapor nasıl hazırlanır?
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Bu modül web sitelerine, Instagram'a veya reklam kütüphanesine bağlanmaz. Rapor, girdiğiniz bilgiler ve
              “Ek veri” alanına yapıştırdığınız içerikle yapay zekâ tarafından hazırlanır. Rakibe özgü ifadeleri
              müşteriye sunmadan önce kendiniz doğrulayın.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Fill */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Hızlı Şablonlar:
        </span>
        {PRESETS.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-accent text-xs font-medium text-foreground transition-all hover:scale-[1.02]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sizin Markanız */}
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">1. Sizin Markanız</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ml-auto font-medium">
                Öncelikli Marka
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Marka Adı <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Markanız Butik"
                  value={ownBrandName}
                  onChange={(e) => setOwnBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Web Sitesi URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="url"
                    placeholder="https://markaniz.com"
                    value={ownBrandUrl}
                    onChange={(e) => setOwnBrandUrl(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Instagram Kullanıcı Adı
                </label>
                <div className="relative">
                  <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="@markaniz"
                    value={ownBrandInstagram}
                    onChange={(e) => setOwnBrandInstagram(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rakip Marka */}
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Swords className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">2. Hedef Rakip Marka</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 ml-auto font-medium">
                Kıyaslanacak Rakip
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Rakip Marka Adı <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Rakip Marka"
                  value={competitorBrandName}
                  onChange={(e) => setCompetitorBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Rakip Web Sitesi URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="url"
                    placeholder="https://rakipmarka.com"
                    value={competitorBrandUrl}
                    onChange={(e) => setCompetitorBrandUrl(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Rakip Instagram Kullanıcı Adı
                </label>
                <div className="relative">
                  <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="@rakipmarka"
                    value={competitorBrandInstagram}
                    onChange={(e) => setCompetitorBrandInstagram(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ortak Parametreler & Kütüphane Verisi */}
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Sektör / Ürün Kategorisi
              </label>
              <input
                type="text"
                placeholder="Örn: Kadın Giyim & Ayakkabı"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Kıyaslanacak 3 eşdeğer Hero ürün grubunu belirlemek için kullanılır.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center justify-between">
                <span>Ek Veri: Reklam Kütüphanesinden Kopyaladıklarınız (Opsiyonel)</span>
                <span className="text-[11px] text-muted-foreground">
                  Meta Ads Kütüphanesi / Fiyat Notları
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="Örn: Meta Reklam Kütüphanesinden kopyalanan aktif reklam metinleri, rakibin sepet indirim kuralı veya bilinen kargo fiyatları..."
                value={rawLibraryData}
                onChange={(e) => setRawLibraryData(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-sans"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Bu alana girdiğiniz her gerçek veri, doğrulanamayan satırları somut veriye dönüştürür.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !ownBrandName.trim() || !competitorBrandName.trim()}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Kütüphane ve Ticari Veriler Taranıyor...</span>
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  <span>Nesnel Rekabet Analizini Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
