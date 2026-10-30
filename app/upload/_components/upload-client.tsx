'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, FileSpreadsheet, CheckCircle2, AlertCircle,
  X, Trash2, Clock, Calendar, RefreshCw, ChevronDown,
  Database, HelpCircle, ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ColumnMapper, { type PreviewColumn, type UploadPreview, mappingProblems } from './column-mapper';

/* ─── Types ─── */
interface ImportReport {
  sheetName: string | null;
  currency: string | null;
  mapping: { field: string; label: string; header: string }[];
  unmappedColumns: string[];
  missingFields: string[];
  warnings: { code: string; message: string; rows: number[] }[];
}

interface UploadResult {
  success: boolean;
  message: string;
  rows?: number;
  dateStart?: string | null;
  dateEnd?: string | null;
  platforms?: string[];
  error?: string;
  report?: ImportReport;
}

interface UploadLog {
  id: string;
  fileName: string;
  fileType: string;
  importedRows: number;
  dateStart: string | null;
  dateEnd: string | null;
  platforms: string | null;
  status: 'success' | 'error';
  errorMessage: string | null;
  createdAt: string;
}

const ACCEPTED = '.csv,.tsv,.xlsx,.xls';
const MAX_MB = 10;

function bytesToStr(b: number) {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(1)} KB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const s = start ? new Date(start).toLocaleDateString('tr-TR') : '?';
  const e = end   ? new Date(end).toLocaleDateString('tr-TR')   : '?';
  return s === e ? s : `${s} – ${e}`;
}

function getPlatforms(log: UploadLog): string[] {
  if (!log.platforms) return [];
  try { return JSON.parse(log.platforms); } catch { return []; }
}

export default function UploadClient() {
  const router = useRouter();

  // Active view tab: 'manual' (default) or 'file'
  const [activeTab, setActiveTab] = useState<'manual' | 'file'>('manual');

  /* ── Form Fields for "MANUEL VERİ YÜKLEME" ── */
  const [veriTarihi, setVeriTarihi] = useState('');
  const [veriKaynagi, setVeriKaynagi] = useState('Manuel Giriş');
  const [kampanyaAdi, setKampanyaAdi] = useState('');
  const [reklamSetiAdi, setReklamSetiAdi] = useState('');
  const [reklamAdi, setReklamAdi] = useState('');
  const [harcananTutar, setHarcananTutar] = useState('');
  const [ciro, setCiro] = useState('');
  const [gosterim, setGosterim] = useState('');
  const [tiklama, setTiklama] = useState('');
  const [yeniMusteri, setYeniMusteri] = useState('');
  const [geriDonenMusteri, setGeriDonenMusteri] = useState('');

  // Status & notifications
  const [isSuccess, setIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  /* ── File upload state ── */
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileResult, setFileResult] = useState<UploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Upload history ── */
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/upload/logs');
      if (res.ok) setLogs(await res.json());
    } catch { /* ignore */ }
    setLoadingLogs(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* ── Form Reset / İptal ── */
  const handleCancel = () => {
    setVeriTarihi('');
    setVeriKaynagi('Manuel Giriş');
    setKampanyaAdi('');
    setReklamSetiAdi('');
    setReklamAdi('');
    setHarcananTutar('');
    setCiro('');
    setGosterim('');
    setTiklama('');
    setYeniMusteri('');
    setGeriDonenMusteri('');
    setErrorMessage(null);
    setIsSuccess(false);
  };

  /* ── Form Submit / Kaydet ── */
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const metrikler = [harcananTutar, ciro, gosterim, tiklama, yeniMusteri, geriDonenMusteri];
    if (metrikler.every((v) => !v.trim())) {
      setErrorMessage('Lütfen en az bir metrik girin (harcama, ciro, gösterim, tıklama veya müşteri sayısı).');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload = {
      date: veriTarihi || new Date().toISOString().split('T')[0],
      platform: veriKaynagi || 'Manuel Giriş',
      campaign: kampanyaAdi || `${veriKaynagi} Kampanyası`,
      adGroup: reklamSetiAdi,
      adName: reklamAdi,
      // Ham metin gönderilir; sunucu boş alanı 0 değil "eksik" olarak saklar.
      spend: harcananTutar,
      revenue: ciro,
      impressions: gosterim,
      clicks: tiklama,
      newCustomers: yeniMusteri,
      returningCustomers: geriDonenMusteri,
    };

    try {
      const res = await fetch('/api/upload/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsSuccess(true);
        await fetchLogs();

        // 2 saniye sonra otomatik dashboard'a yönlendir
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setErrorMessage(data?.error || 'Veri kaydedilirken bir hata oluştu.');
      }
    } catch (err: any) {
      setErrorMessage(`Bağlantı hatası: ${err?.message || 'Lütfen internetinizi kontrol edin.'}`);
    } finally {
      setSaving(false);
    }
  };

  /* ── File pick & upload ── */
  const pickFile = (picked: File | null) => {
    if (!picked) return;
    setFileResult(null);
    const ext = picked.name.toLowerCase().split('.').pop() ?? '';
    if (!['csv', 'tsv', 'xlsx', 'xls'].includes(ext)) {
      setFileResult({ success: false, message: `".${ext}" formatı desteklenmiyor. CSV, TSV, XLSX veya XLS kullanın.` });
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setFileResult({ success: false, message: `Dosya ${bytesToStr(picked.size)} — ${MAX_MB} MB sınırını aşıyor.` });
      return;
    }
    setFile(picked);
    loadPreview(picked);
  };

  /* ── Önizleme: dosya kaydedilmeden sütunlar ve önerilen eşleme ── */
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadPreview = async (picked: File, sheet?: string) => {
    setPreviewing(true);
    setPreviewError(null);
    if (!sheet) setPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', picked);
      if (sheet) fd.append('sheet', sheet);
      const res = await fetch('/api/upload/preview', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPreview(data as UploadPreview);
      else setPreviewError(data?.error ?? 'Dosya önizlenemedi.');
    } catch {
      setPreviewError('Bağlantı hatası: dosya önizlenemedi.');
    }
    setPreviewing(false);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setPreviewError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    setFileResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (preview) {
        fd.append('mapping', JSON.stringify({
          headerRowIndex: preview.headerRowIndex,
          sheetName: preview.sheet_name,
          signature: preview.signature,
          columns: preview.columns.map((c: PreviewColumn) => ({ index: c.index, key: c.key, role: c.role })),
        }));
      }
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setFileResult({
          success: true,
          message: data.message ?? 'Başarıyla yüklendi.',
          rows: data.importedRows,
          dateStart: data.dateStart,
          dateEnd: data.dateEnd,
          platforms: data.platforms,
          report: data.report,
        });
        clearFile();
        await fetchLogs();
        // Otomatik yönlendirme yok: kullanıcı önce eşleme ve uyarıları görmeli.
      } else {
        setFileResult({
          success: false,
          message: data?.error ?? 'Yükleme başarısız oldu.',
          report: data?.report,
        });
      }
    } catch (e: any) {
      setFileResult({ success: false, message: `Bağlantı hatası: ${e?.message ?? 'Sunucuya bağlanılamadı.'}` });
    }
    setUploading(false);
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`"${fileName}" yüklemesini ve ilişkili verileri silmek istediğinizden emin misiniz?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/upload/logs?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        toast.success(data?.message ?? 'Yükleme silindi.');
      } else {
        toast.error(data?.error ?? 'Silme başarısız oldu.');
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
    }
    setDeletingId(null);
  };

  const isExcel = file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
  const FileIcon = isExcel ? FileSpreadsheet : FileText;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* ── Tab Switcher: Manuel Giriş & Dosya Yükle ── */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'manual'
              ? 'bg-[#0d9488] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          ✍️ Manuel Veri Yükleme
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'file'
              ? 'bg-[#0d9488] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          📂 Excel / CSV Dosyası Yükle
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
           ── MANUEL VERİ YÜKLEME (GÖRSELDEKİ BİREBİR FORM) ──
           ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Header & Başarı Bildirimi */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                MANUEL VERİ YÜKLEME
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Lütfen aşağıdaki alanları doldurarak manuel veri girişini tamamlayın.
              </p>
            </div>

            {/* Başarı Mesajı Kutusu (Yeşil kutu, checkmark ikonu) */}
            {isSuccess && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl shadow-sm animate-fade-in shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-sm font-medium">Veri başarıyla yüklendi!</span>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="ml-2 text-xs font-bold underline hover:opacity-80 flex items-center gap-1"
                >
                  Dashboard <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Hata Bildirimi */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Kartı (Main Form Card) */}
          <div className="bg-card border-[1.5px] border-[#0d9488]/40 rounded-2xl p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {/* ── Sütun 1 ── */}
                <div className="space-y-5">
                  {/* VERİ TARİHİ */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      VERİ TARİHİ
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={veriTarihi}
                        onChange={(e) => setVeriTarihi(e.target.value)}
                        placeholder="Tarih seçin..."
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                      />
                    </div>
                  </div>

                  {/* KAMPANYA ADI */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      KAMPANYA ADI
                    </label>
                    <input
                      type="text"
                      value={kampanyaAdi}
                      onChange={(e) => setKampanyaAdi(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>

                  {/* REKLAM SETİ ADI */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      REKLAM SETİ ADI
                    </label>
                    <input
                      type="text"
                      value={reklamSetiAdi}
                      onChange={(e) => setReklamSetiAdi(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>

                  {/* HARCANAN TUTAR */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      HARCANAN TUTAR
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={harcananTutar}
                        onChange={(e) => setHarcananTutar(e.target.value)}
                        placeholder="Veri girin..."
                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                      />
                      <span className="absolute right-3 text-sm text-muted-foreground font-medium pointer-events-none">
                        ₺
                      </span>
                    </div>
                  </div>

                  {/* GÖSTERİM */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      GÖSTERİM
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={gosterim}
                      onChange={(e) => setGosterim(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>

                  {/* YENİ MÜŞTERİ SAYISI (optional) */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      YENİ MÜŞTERİ SAYISI <span className="text-[11px] font-normal lowercase text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={yeniMusteri}
                      onChange={(e) => setYeniMusteri(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>
                </div>

                {/* ── Sütun 2 ── */}
                <div className="space-y-5">
                  {/* VERİ KAYNAĞI */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      VERİ KAYNAĞI
                    </label>
                    <div className="relative">
                      <select
                        value={veriKaynagi}
                        onChange={(e) => setVeriKaynagi(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border bg-background text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition cursor-pointer"
                      >
                        <option value="Manuel Giriş">Manuel Giriş</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Meta Ads">Meta Ads</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* REKLAM ADI */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      REKLAM ADI
                    </label>
                    <input
                      type="text"
                      value={reklamAdi}
                      onChange={(e) => setReklamAdi(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>

                  {/* CİRO */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      CİRO
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ciro}
                        onChange={(e) => setCiro(e.target.value)}
                        placeholder="Veri girin..."
                        className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                      />
                      <span className="absolute right-3 text-sm text-muted-foreground font-medium pointer-events-none">
                        ₺
                      </span>
                    </div>
                  </div>

                  {/* TIKLAMA */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      TIKLAMA
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tiklama}
                      onChange={(e) => setTiklama(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>

                  {/* GERİ DÖNEN MÜŞTERİ SAYISI (optional) */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      GERİ DÖNEN MÜŞTERİ SAYISI <span className="text-[11px] font-normal lowercase text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={geriDonenMusteri}
                      onChange={(e) => setGeriDonenMusteri(e.target.value)}
                      placeholder="Veri girin..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition"
                    />
                  </div>
                </div>
              </div>

              {/* ── Kart Altı (YARDIM VE DESTEK + İPTAL & KAYDET) ── */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
                {/* Sol Altta: İkonlu YARDIM VE DESTEK */}
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0d9488] hover:text-[#0f766e] transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  YARDIM VE DESTEK
                </button>

                {/* Sağ Altta: İPTAL ve KAYDET */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-8 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/60 transition disabled:opacity-60"
                  >
                    İPTAL
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-9 py-2.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-bold shadow-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        KAYDEDİLİYOR...
                      </>
                    ) : (
                      'KAYDET'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           ── DOSYA YÜKLEME BÖLÜMÜ (CSV / EXCEL) ──
           ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'file' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dosya Yükleme (CSV / Excel)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Meta Ads, Google Ads veya e-ticaret panelinizden indirdiğiniz dosyayı yükleyin.
            </p>
          </div>

          <div className="card-premium p-8">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer select-none
                ${dragging
                  ? 'border-[#0d9488] bg-[#0d9488]/5 scale-[1.01]'
                  : 'border-border hover:border-[#0d9488]/50 hover:bg-muted/20'}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0] ?? null); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#0d9488]/10 flex items-center justify-center">
                    <FileIcon className="w-8 h-8 text-[#0d9488]" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{bytesToStr(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearFile(); setFileResult(null); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
                  >
                    <X className="w-3 h-3" /> Dosyayı Kaldır
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-[#0d9488]/20' : 'bg-[#0d9488]/10'}`}>
                    <Upload className="w-8 h-8 text-[#0d9488]" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">
                      {dragging ? 'Bırakın!' : 'Dosyayı buraya sürükleyin veya tıklayın'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      CSV, XLSX, XLS — maks. {MAX_MB} MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {file && (previewing || previewError || preview) && (
              <div className="mt-5">
                {previewing && !preview && <p className="text-sm text-muted-foreground">Dosya okunuyor…</p>}
                {previewError && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {previewError} Yine de &quot;Yükle&quot; ile otomatik okumayı deneyebilirsiniz.
                  </p>
                )}
                {preview && (
                  <ColumnMapper
                    preview={preview}
                    onChange={(columns) => setPreview({ ...preview, columns })}
                    onSheetChange={(sheet) => loadPreview(file, sheet)}
                  />
                )}
              </div>
            )}

            {file && (
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={uploading || previewing || (!!preview && mappingProblems(preview.columns).length > 0)}
                  className="px-6 py-2.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold shadow-sm transition disabled:opacity-60 flex items-center gap-2"
                >
                  {uploading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Yükleniyor...</>
                  ) : (
                    <><Upload className="w-4 h-4" />Yükle ve Analiz Et</>
                  )}
                </button>
              </div>
            )}

            {fileResult && (
              <div className={`mt-5 p-4 rounded-xl text-sm border ${
                fileResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {fileResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <p className="font-medium">{fileResult.message}</p>
                </div>
                {fileResult.report && <ImportReportDetails report={fileResult.report} />}
                {fileResult.success && fileResult.dateStart && fileResult.dateEnd && (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard?start_date=${fileResult.dateStart}&end_date=${fileResult.dateEnd}`)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2"
                  >
                    Bu tarih aralığını dashboard'da aç <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Yükleme Geçmişi ── */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#0d9488]" />
            <h3 className="font-semibold text-foreground">Yükleme Geçmişi</h3>
            {logs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0d9488]/10 text-[#0d9488]">
                {logs.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingLogs ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz kayıtlı veri bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const platforms = getPlatforms(log);
              const range = fmtRange(log.dateStart, log.dateEnd);
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-border bg-muted/20 p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[#0d9488]/10 shrink-0">
                      <FileText className="w-4 h-4 text-[#0d9488]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{log.fileName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{fmtDate(log.createdAt)}</span>
                        {range && <span>• {range}</span>}
                        {platforms.length > 0 && <span>• {platforms.join(', ')}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(log.id, log.fileName)}
                    disabled={deletingId === log.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    title="Sil"
                  >
                    {deletingId === log.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Yardım ve Destek Modalı ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-6 h-6 text-[#0d9488]" />
              <h3 className="text-lg font-bold text-foreground">Yardım ve Destek</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Manuel Veri Yükleme Nasıl Çalışır?</strong><br />
                Reklam panellerinizden aldığınız veya manuel tuttuğunuz kampanya metriklerini bu form aracılığıyla sisteme doğrudan girebilirsiniz.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Harcanan Tutar & Ciro:</strong> Rakamları nokta veya virgül ile yazabilirsiniz (Örn: 15.000 veya 15000).</li>
                <li><strong>ROAS & Metrikler:</strong> Girilen Ciro ve Harcama değerlerinden ROAS, CPC ve Dönüşüm Oranları otomatik hesaplanacaktır.</li>
                <li><strong>Yeni & Geri Dönen Müşteri:</strong> Opsiyoneldir, toplam sipariş ve müşteri analizi için kullanılır.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-lg bg-[#0d9488] text-white text-sm font-semibold hover:bg-[#0f766e] transition"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Yükleme raporu: hangi sütun neye eşlendi, ne eksik, hangi uyarılar var ─── */
function ImportReportDetails({ report }: { report: ImportReport }) {
  return (
    <div className="mt-3 space-y-3 text-xs text-foreground">
      {report.mapping.length > 0 && (
        <div>
          <p className="font-semibold mb-1">Eşlenen sütunlar{report.sheetName ? ` (sayfa: ${report.sheetName})` : ''}</p>
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5">
            {report.mapping.map((m) => (
              <li key={m.field}>
                <span className="text-muted-foreground">{m.label}:</span> {m.header}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-muted-foreground">Para birimi: {report.currency ?? 'belirtilmemiş'}</p>
        </div>
      )}
      {report.missingFields.length > 0 && (
        <p>
          <span className="font-semibold">Dosyada olmayan alanlar (eksik kabul edildi, 0 yazılmadı):</span>{' '}
          {report.missingFields.join(', ')}
        </p>
      )}
      {report.unmappedColumns.length > 0 && (
        <p className="text-muted-foreground">
          <span className="font-semibold">Kullanılmayan sütunlar:</span> {report.unmappedColumns.join(', ')}
        </p>
      )}
      {report.warnings.length > 0 && (
        <div>
          <p className="font-semibold mb-1">Uyarılar</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {report.warnings.map((w) => (
              <li key={w.code}>
                {w.message}
                {w.rows.length > 0 && <span className="text-muted-foreground"> (satır: {w.rows.join(', ')})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
