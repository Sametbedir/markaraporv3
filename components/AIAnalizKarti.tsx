'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Info } from 'lucide-react';

/**
 * Seçili dönemin AI analizi. Ücretsiz Gemini kotası boşa gitmesin diye otomatik çalışmaz; düğmeyle başlar.
 * Sunucu yalnızca toplu sayıları gönderir (müşteri ve marka adı gönderilmez).
 */
export default function AIAnalizKarti({ start, end }: { start: string; end: string }) {
  const [analiz, setAnaliz] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [donem, setDonem] = useState<string | null>(null);

  const calistir = async (fresh: boolean) => {
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await fetch('/api/ai-analiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: start, end_date: end, fresh }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAnaliz(data.sonuc);
        setModel(data.model);
        setDonem(`${start} – ${end}`);
      } else setHata(data?.hata ?? 'Analiz alınamadı.');
    } catch {
      setHata('Bağlantı hatası oluştu.');
    }
    setYukleniyor(false);
  };

  const eski = analiz && donem !== `${start} – ${end}`;

  return (
    <section aria-labelledby="ai-title" className="rounded-2xl border border-border bg-card p-6 mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 id="ai-title" className="font-semibold text-foreground">AI analizi</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seçili dönemin kampanya, platform, haftalık ve özel metrik verilerini yorumlar. Yalnızca yüklenen sayılarla çalışır.
            </p>
          </div>
        </div>
        <button
          onClick={() => calistir(!!analiz && !eski)}
          disabled={yukleniyor}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
        >
          {yukleniyor ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {yukleniyor ? 'Analiz ediliyor…' : analiz && !eski ? 'Yeniden üret' : 'Bu dönemi analiz et'}
        </button>
      </div>

      {hata && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{hata}</p>}

      {analiz && (
        <div className="mt-4 space-y-3">
          {eski && <p className="text-xs text-amber-700 dark:text-amber-300">Bu analiz {donem} dönemine ait; seçili dönem değişti.</p>}
          <div className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
            {analiz.split('\n').map((line, i) => {
              const t = line.trim().replace(/^\*\*(.+)\*\*$/, '$1').replace(/^#+\s*/, '');
              if (!t) return <div key={i} className="h-2" />;
              if (/^(Durum özeti|Dikkat edilmesi gerekenler|Önerilen aksiyonlar)\b/i.test(t)) return <p key={i} className="font-semibold mt-2 first:mt-0">{t.replace(/:$/, '')}</p>;
              if (/^[-*•]\s/.test(t)) return <p key={i} className="pl-4 -indent-3">• {t.replace(/^[-*•]\s/, '').replace(/\*\*/g, '')}</p>;
              return <p key={i}>{t.replace(/\*\*/g, '')}</p>;
            })}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
            Yapay zekâ yorumudur, kontrol ederek kullanın{model ? ` · ${model}` : ''}. Ücretsiz Gemini kullanıldığı için gönderilen toplu veriler Google tarafından ürün geliştirmede kullanılabilir.
          </p>
        </div>
      )}
    </section>
  );
}
