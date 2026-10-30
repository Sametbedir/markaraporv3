'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Send, EyeOff, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReportDocument from '@/components/report-document';
import type { ReportDocumentData } from '@/lib/report/document';
import { monthLabel } from '@/lib/report/months';

type MonthRow = { month: string; has_data: boolean; published_at: string | null; has_notes: boolean };
type Detail = { draft: ReportDocumentData; published: ReportDocumentData | null };

const SAVE_DELAY_MS = 800;

export default function ReportsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brand, setBrand] = useState('');
  const [months, setMonths] = useState<MonthRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [summary, setSummary] = useState('');
  const [actions, setActions] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [publishing, setPublishing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = searchParams.get('ay') ?? months?.[0]?.month ?? null;
  const row = months?.find((m) => m.month === selected) ?? null;

  const loadMonths = useCallback(async () => {
    const res = await fetch('/api/reports').catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error ?? 'Raporlar yüklenemedi');
      return;
    }
    setBrand(data.brand);
    setMonths(data.months);
  }, []);

  const loadDetail = useCallback(async (month: string) => {
    setDetail(null);
    const res = await fetch(`/api/reports/${month}`).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      toast.error(data?.error ?? 'Rapor yüklenemedi');
      return;
    }
    setDetail(data);
    setSummary(data.draft.summary);
    setActions(data.draft.actions);
    setSaveState('idle');
  }, []);

  useEffect(() => { loadMonths(); }, [loadMonths]);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected, loadDetail]);

  const save = useCallback(async (month: string, s: string, a: string) => {
    setSaveState('saving');
    const res = await fetch(`/api/reports/${month}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: s, actions: a }),
    }).catch(() => null);
    setSaveState(res?.ok ? 'saved' : 'error');
  }, []);

  // Yazmayı bıraktıktan kısa süre sonra otomatik kaydet
  const onText = (nextSummary: string, nextActions: string) => {
    setSummary(nextSummary);
    setActions(nextActions);
    if (!selected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(selected, nextSummary, nextActions), SAVE_DELAY_MS);
  };

  const flushSave = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (selected) await save(selected, summary, actions);
    }
  };

  const publish = async () => {
    if (!selected) return;
    const again = !!row?.published_at;
    if (!confirm(again
      ? 'Yayındaki raporun yerine güncel veriler ve notlarla yeni hali geçsin mi? Müşteri linkinde yeni hali görünür.'
      : `${monthLabel(selected)} raporu yayınlansın mı? Müşteri linkini açan kişi raporu bu haliyle görür; veriler sonradan değişse de yayınlanan hal değişmez.`)) return;
    setPublishing(true);
    await flushSave();
    const res = await fetch(`/api/reports/${selected}/publish`, { method: 'POST' }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setPublishing(false);
    if (!res?.ok) {
      toast.error(data?.error ?? 'Yayınlanamadı');
      return;
    }
    toast.success('Rapor yayınlandı');
    await Promise.all([loadMonths(), loadDetail(selected)]);
  };

  const unpublish = async () => {
    if (!selected || !confirm('Rapor yayından kaldırılsın mı? Müşteri linkinde bu ay görünmez; notlarınız kalır.')) return;
    const res = await fetch(`/api/reports/${selected}/publish`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      toast.error('Yayından kaldırılamadı');
      return;
    }
    toast.success('Rapor yayından kaldırıldı');
    await Promise.all([loadMonths(), loadDetail(selected)]);
  };

  const openPreview = async (published: boolean) => {
    await flushSave();
    window.open(`/reports/${selected}/print${published ? '?surum=yayin' : ''}`, '_blank', 'noopener');
  };

  const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
  const preview: ReportDocumentData | null = detail ? { ...detail.draft, summary, actions } : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary" /> Aylık Raporlar{brand && <span className="text-muted-foreground font-medium">· {brand}</span>}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ayı seçin, değerlendirme ve aksiyon planını yazın, PDF veya PNG olarak indirin. &quot;Yayınla&quot; dediğinizde rapor müşteri linkinde bu haliyle görünür.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : months === null ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : months.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Bu marka için henüz veri yok. Önce Veri Yükle sayfasından reklam raporu yükleyin.
        </p>
      ) : (
        <>
          <nav aria-label="Ay seçimi" className="flex gap-2 overflow-x-auto pb-1">
            {months.map((m) => (
              <button
                key={m.month}
                onClick={async () => { await flushSave(); router.replace(`/reports?ay=${m.month}`); }}
                aria-current={m.month === selected ? 'page' : undefined}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${m.month === selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'}`}
              >
                {monthLabel(m.month)}
                {m.published_at && <CheckCircle2 className="w-3.5 h-3.5" aria-label="yayında" />}
              </button>
            ))}
          </nav>

          {selected && row && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{monthLabel(selected)}</h2>
                    {row.published_at ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Yayında</span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Taslak</span>
                    )}
                  </div>
                  {row.published_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.published_at).toLocaleString('tr-TR')} tarihinde yayınlandı. Notlarda veya verilerde yaptığınız değişiklikler tekrar yayınlayana kadar müşteriye görünmez.
                    </p>
                  )}
                  {!row.has_data && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">Bu ayın verisi artık yok; yalnızca yayınlanmış hali duruyor.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={publish} disabled={publishing || !row.has_data} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {row.published_at ? 'Yeniden yayınla' : 'Yayınla'}
                    </button>
                    {row.published_at && (
                      <button onClick={unpublish} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
                        <EyeOff className="w-4 h-4" /> Yayından kaldır
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                    <button onClick={() => openPreview(false)} disabled={!row.has_data} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border hover:bg-accent disabled:opacity-50">
                      <ExternalLink className="w-4 h-4" /> PDF / PNG (güncel)
                    </button>
                    {row.published_at && (
                      <button onClick={() => openPreview(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border hover:bg-accent">
                        <ExternalLink className="w-4 h-4" /> Yayınlanan hali
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                  <div>
                    <label htmlFor="report-summary" className="text-sm font-medium text-foreground">Değerlendirme</label>
                    <p className="text-xs text-muted-foreground">Ayın genel yorumu. Rapordaki &quot;Öne çıkanlar&quot; maddeleri sayılardan otomatik çıkar; burada kendi yorumunuzu yazın.</p>
                    <textarea id="report-summary" rows={7} maxLength={5000} value={summary} onChange={(e) => onText(e.target.value, actions)} className={`${input} mt-2`} placeholder="Örn. Eylülde Meta kampanyalarında bütçe artırıldı; dönüşüm değeri harcamadan daha hızlı büyüdü." />
                  </div>
                  <div>
                    <label htmlFor="report-actions" className="text-sm font-medium text-foreground">Aksiyon planı</label>
                    <p className="text-xs text-muted-foreground">Her satır bir madde olur.</p>
                    <textarea id="report-actions" rows={6} maxLength={5000} value={actions} onChange={(e) => onText(summary, e.target.value)} className={`${input} mt-2`} placeholder={'Marka arama kampanyasının bütçesini artırmak\nDüşük ROAS\'lı reklam setlerini durdurmak'} />
                  </div>
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'saved' ? 'Taslak kaydedildi' : saveState === 'error' ? 'Kaydedilemedi; bağlantıyı kontrol edin' : ''}
                  </p>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-border bg-[#e5e7eb] dark:bg-[#1f2937] p-4 overflow-x-auto">
                {preview ? (
                  <div className="origin-top-left">
                    <ReportDocument data={preview} />
                  </div>
                ) : (
                  <p className="text-sm text-[#6b7280] p-6">Önizleme hazırlanıyor…</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
