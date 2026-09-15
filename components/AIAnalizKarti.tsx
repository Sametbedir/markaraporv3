// components/AIAnalizKarti.tsx
'use client';

import { useState, useEffect } from 'react';

interface AIAnalizKartiProps {
  dashboardVerileri: {
    toplamHarcama: number;
    toplamCiro: number;
    netKar: number;
    siparis: number;
    roas: number;
    netRoas: number;
    karMarji: string;
  };
}

export default function AIAnalizKarti({ dashboardVerileri }: AIAnalizKartiProps) {
  const [analiz, setAnaliz] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Sayfa yüklenir yüklenmez botun otomatik analiz yapması için:
  useEffect(() => {
    raporuGetir();
  }, []);

  async function raporuGetir() {
    setYukleniyor(true);
    try {
      const res = await fetch('/api/ai-analiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboardVerileri),
      });

      const data = await res.json();
      if (res.ok) {
        setAnaliz(data.sonuc);
      } else {
        setAnaliz("Hata: " + (data.hata || "Analiz alınamadı."));
      }
    } catch (err) {
      setAnaliz("Bağlantı hatası oluştu.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl p-6 mt-8 border border-indigo-800/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-indigo-800/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shadow-inner">
            🤖
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              MarkaRapor AI Asistanı
            </h3>
            <p className="text-xs text-indigo-300">
              Reklam ve ciro metrikleriniz yapay zeka tarafından canlı olarak taranıyor.
            </p>
          </div>
        </div>
        <button
          onClick={raporuGetir}
          disabled={yukleniyor}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl transition text-xs disabled:opacity-50 flex items-center gap-2 shadow"
        >
          {yukleniyor ? "Bot İnceliyor..." : "Yeniden Analiz Et"}
        </button>
      </div>

      {yukleniyor && !analiz && (
        <div className="py-8 text-center text-indigo-200 text-sm animate-pulse">
          Yapay zeka asistanı verileri okuyor, stratejik öneriler hazırlanıyor...
        </div>
      )}

      {analiz && (
        <div className="mt-4 p-5 bg-slate-950/60 rounded-xl border border-indigo-500/20 text-slate-200 text-sm leading-relaxed whitespace-pre-line">
          {analiz}
        </div>
      )}
    </div>
  );
}