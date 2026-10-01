'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, FileSpreadsheet, CheckCircle, AlertCircle,
  Info, X, Trash2, Clock, Calendar, RefreshCw, ChevronDown, ChevronUp,
  Database, PenLine, Send, RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveActiveReport } from '@/lib/client-data-store';

/* ─── Types ─── */
interface UploadResult {
  success: boolean;
  message: string;
  rows?: number;
  dateStart?: string | null;
  dateEnd?: string | null;
  platforms?: string[];
  error?: string;
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

/* ─── Manual form field definition ─── */
interface ManualField {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
  suffix?: string;
}

const MANUAL_FIELDS: ManualField[] = [
  { key: 'revenue',     label: 'Ciro (Toplam Satış Geliri)',         placeholder: '624.662',   icon: '💰', suffix: '₺' },
  { key: 'spend',       label: 'Reklam Harcaması',                   placeholder: '215.209',   icon: '📢', suffix: '₺' },
  { key: 'roas',        label: 'ROAS (Reklam Getiri Oranı)',         placeholder: '2.9',       icon: '📈' },
  { key: 'orders',      label: 'Sipariş Sayısı',                     placeholder: '214',       icon: '🛒' },
  { key: 'aov',         label: 'Ortalama Sipariş Değeri (AOV)',      placeholder: '2.920',     icon: '🧾', suffix: '₺' },
  { key: 'basket',      label: 'Sepet Dönüşüm Tutarı',              placeholder: '2.449.050', icon: '🛍️', suffix: '₺' },
  { key: 'impressions', label: 'Gösterim Sayısı',                    placeholder: '1.250.000', icon: '👁️' },
  { key: 'clicks',      label: 'Tıklama Sayısı',                     placeholder: '45.000',    icon: '👆' },
  { key: 'cpc',         label: 'Tıklama Başına Maliyet (CPC)',       placeholder: '4.78',      icon: '💵', suffix: '₺' },
  { key: 'ctr',         label: 'Tıklama Oranı (CTR)',                placeholder: '3.6',       icon: '📊', suffix: '%' },
  { key: 'cr',          label: 'Dönüşüm Oranı (CR)',                 placeholder: '0.47',      icon: '🎯', suffix: '%' },
  { key: 'cac',         label: 'Müşteri Edinme Maliyeti (CAC/CPA)',  placeholder: '1.005',     icon: '🏷️', suffix: '₺' },
  { key: 'followers',   label: 'Gelen Takipçi Sayısı',               placeholder: '370',       icon: '👥' },
  { key: 'dailyRevenue',label: 'Günlük Ortalama Ciro',               placeholder: '7.173',     icon: '📅', suffix: '₺' },
];

/* ─── Helpers ─── */
const ACCEPTED = '.csv,.xlsx,.xls,.tsv,.txt';
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

/** Parse Turkish number formats: "624.662" → 624662, "2,9" → 2.9, "1.250.000" → 1250000 */
function parseTurkishNumber(val: string): number {
  if (!val || !val.trim()) return 0;
  let s = val.trim().replace(/[₺TL%\s]/g, '');
  // If has comma as decimal separator (e.g. "2,9" or "624.662,50")
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Check if dots are thousand separators: "624.662" "1.250.000"
    const parts = s.split('.');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length === 3 || parts.length > 2) {
        // All dots are thousand separators
        s = parts.join('');
      }
      // else single dot with non-3 digits after = decimal point, keep as is
    }
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* ─── Main Component ─── */
export default function UploadClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual form state
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [manualDateStart, setManualDateStart] = useState('');
  const [manualDateEnd, setManualDateEnd] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const [manualResult, setManualResult] = useState<{ success: boolean; message: string } | null>(null);

  /* ── Load upload history ── */
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/upload/logs');
      if (res.ok) setLogs(await res.json());
    } catch { /* ignore */ }
    setLoadingLogs(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* ── File picking ── */
  const pickFile = (picked: File | null) => {
    if (!picked) return;
    setResult(null);
    const ext = picked.name.toLowerCase().split('.').pop() ?? '';
    if (!['csv', 'xlsx', 'xls', 'tsv', 'txt'].includes(ext)) {
      setResult({ success: false, message: `".${ext}" formatı desteklenmiyor. CSV, XLSX veya XLS kullanın.` });
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setResult({ success: false, message: `Dosya ${bytesToStr(picked.size)} — ${MAX_MB} MB sınırını aşıyor.` });
      return;
    }
    if (picked.size === 0) {
      setResult({ success: false, message: 'Seçilen dosya boş görünüyor.' });
      return;
    }
    setFile(picked);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0] ?? null);
  }, []);

  /* ── Upload file ── */
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message ?? 'Başarıyla yüklendi.',
          rows: data.importedRows,
          dateStart: data.dateStart,
          dateEnd: data.dateEnd,
          platforms: data.platforms,
        });
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        await fetchLogs();

        if (data.dateStart && data.dateEnd) {
          const params = new URLSearchParams({
            start_date: data.dateStart,
            end_date: data.dateEnd,
          });
          setTimeout(() => router.push(`/dashboard?${params.toString()}`), 1800);
        }
      } else {
        setResult({
          success: false,
          message: data?.error ?? 'Yükleme başarısız oldu.',
        });
      }
    } catch (e: any) {
      setResult({ success: false, message: `Bağlantı hatası: ${e?.message ?? 'İnternet bağlantınızı kontrol edin.'}` });
    }
    setUploading(false);
  };

  /* ── Manual form submit ── */
  const handleManualSubmit = async () => {
    // Check if at least one value is filled
    const hasAnyValue = MANUAL_FIELDS.some((f) => parseTurkishNumber(manualValues[f.key] || '') > 0);
    if (!hasAnyValue) {
      setManualResult({ success: false, message: 'En az bir veri alanı doldurulmalıdır.' });
      return;
    }

    setManualSaving(true);
    setManualResult(null);

    const revenue = parseTurkishNumber(manualValues.revenue || '');
    const spend = parseTurkishNumber(manualValues.spend || '');
    const roas = parseTurkishNumber(manualValues.roas || '') || (spend > 0 ? Number((revenue / spend).toFixed(2)) : 0);
    const orders = Math.round(parseTurkishNumber(manualValues.orders || ''));
    const aov = parseTurkishNumber(manualValues.aov || '') || (orders > 0 ? Math.round(revenue / orders) : 0);
    const basket = parseTurkishNumber(manualValues.basket || '');
    const impressions = Math.round(parseTurkishNumber(manualValues.impressions || ''));
    const clicks = Math.round(parseTurkishNumber(manualValues.clicks || ''));
    const cpc = parseTurkishNumber(manualValues.cpc || '') || (clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0);
    const ctr = parseTurkishNumber(manualValues.ctr || '') || (impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0);
    const cr = parseTurkishNumber(manualValues.cr || '');
    const cac = parseTurkishNumber(manualValues.cac || '') || (orders > 0 ? Number((spend / orders).toFixed(2)) : 0);
    const followers = Math.round(parseTurkishNumber(manualValues.followers || ''));
    const dailyRevenue = parseTurkishNumber(manualValues.dailyRevenue || '');

    const dateStart = manualDateStart || new Date().toISOString().split('T')[0];
    const dateEnd = manualDateEnd || dateStart;
    const title = manualTitle.trim() || 'Manuel Veri Girişi';

    // Build a single-row payload compatible with /api/upload/manual
    const rows = [{
      period: title,
      spend,
      revenue,
      roas,
      orders,
      basket,
      followers,
    }];

    try {
      const res = await fetch('/api/upload/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, year: new Date(dateStart).getFullYear(), rows }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Also save to localStorage with full data
        if (data.reportData) {
          const report = data.reportData;
          report.summary = {
            ...report.summary,
            total_spend: spend,
            total_revenue: revenue,
            total_orders: orders,
            total_impressions: impressions || Math.round(spend * 25),
            total_clicks: clicks || Math.round(spend * 1.5),
            total_conversions: orders,
            avg_roas: roas,
            avg_ctr: ctr,
            avg_cpc: cpc,
            avg_aov: aov,
            avg_cac: cac,
            total_basket: basket,
            total_followers: followers,
            daily_revenue: dailyRevenue || (revenue > 0 && dateStart && dateEnd
              ? Math.round(revenue / Math.max(1, Math.ceil((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 86400000) + 1))
              : 0),
          };
          report.dateRange = { start: dateStart, end: dateEnd };
          saveActiveReport(report);
        }

        setManualResult({ success: true, message: data.message || 'Veriler başarıyla kaydedildi!' });
        await fetchLogs();

        // Redirect to dashboard
        const params = new URLSearchParams({ start_date: dateStart, end_date: dateEnd });
        setTimeout(() => router.push(`/dashboard?${params.toString()}`), 2000);
      } else {
        setManualResult({ success: false, message: data?.error || 'Kayıt başarısız oldu.' });
      }
    } catch (e: any) {
      setManualResult({ success: false, message: `Bağlantı hatası: ${e?.message || 'İnternet bağlantınızı kontrol edin.'}` });
    }
    setManualSaving(false);
  };

  const handleManualReset = () => {
    setManualValues({});
    setManualDateStart('');
    setManualDateEnd('');
    setManualTitle('');
    setManualResult(null);
  };

  const filledCount = MANUAL_FIELDS.filter((f) => (manualValues[f.key] || '').trim() !== '').length;

  /* ── Delete log ── */
  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`"${fileName}" yüklemesini ve ilişkili verileri silmek istediğinizden emin misiniz?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/upload/logs?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert(data?.error ?? 'Silme işlemi başarısız.');
      }
    } catch { alert('Silme sırasında hata oluştu.'); }
    setDeletingId(null);
  };

  const isExcel = file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
  const FileIcon = isExcel ? FileSpreadsheet : FileText;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" /> Veri Yükle
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dosya yükleyin veya aşağıdaki formu kullanarak verilerinizi manuel olarak girin.
        </p>
      </div>

      {/* ── Drop Zone ── */}
      <div className="card-premium p-8">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer select-none
            ${dragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/20'}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
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
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bytesToStr(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
              >
                <X className="w-3 h-3" /> Dosyayı Kaldır
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-primary/20' : 'bg-primary/10'}`}>
                <Upload className={`w-8 h-8 transition-colors ${dragging ? 'text-primary' : 'text-primary/70'}`} />
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

        {/* Upload button */}
        {file && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-60"
            >
              {uploading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analiz Ediliyor...</>
              ) : (
                <><Upload className="w-4 h-4" />Yükle ve Analiz Et</>
              )}
            </button>
          </div>
        )}

        {/* File upload result */}
        {result && (
          <div className={`mt-5 p-4 rounded-xl text-sm border ${
            result.success
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {result.success
                ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-medium">{result.message}</p>
                {result.success && (
                  <div className="mt-2 space-y-1 text-xs opacity-80">
                    {result.rows !== undefined && (
                      <p>📊 {result.rows} satır işlendi.</p>
                    )}
                    {(result.dateStart || result.dateEnd) && (
                      <p>📅 Tarih aralığı: <strong>{fmtRange(result.dateStart ?? null, result.dateEnd ?? null)}</strong></p>
                    )}
                    {result.platforms?.length ? (
                      <p>📡 Platform(lar): {result.platforms.join(', ')}</p>
                    ) : null}
                    <p className="mt-1">Dashboard&apos;a yönlendiriliyorsunuz...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
           ── MANUEL VERİ GİRİŞ FORMU ──
           ══════════════════════════════════════════════════════════════════ */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-1">
          <PenLine className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-lg">Manuel Veri Girişi</h3>
          {filledCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
              {filledCount}/{MANUAL_FIELDS.length}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Dosya yüklemeden verilerinizi doğrudan aşağıdaki alanlara girin. Sadece bildiğiniz alanları doldurmanız yeterli.
        </p>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            📋 Rapor Başlığı
          </label>
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Örn: Eylül 2026 Meta Ads Raporu"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              📅 Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={manualDateStart}
              onChange={(e) => setManualDateStart(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              📅 Bitiş Tarihi
            </label>
            <input
              type="date"
              value={manualDateEnd}
              onChange={(e) => setManualDateEnd(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">VERİLER</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* KPI Fields */}
        <div className="space-y-3">
          {MANUAL_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-[55%] min-w-0">
                <span className="text-lg shrink-0">{field.icon}</span>
                <label className="text-sm text-foreground font-medium truncate" title={field.label}>
                  {field.label}
                </label>
              </div>
              <div className="relative w-full sm:w-[45%]">
                <input
                  type="text"
                  inputMode="decimal"
                  value={manualValues[field.key] || ''}
                  onChange={(e) => setManualValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm text-right pr-10"
                />
                {field.suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    {field.suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Manual result message */}
        {manualResult && (
          <div className={`mt-5 p-4 rounded-xl text-sm border ${
            manualResult.success
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {manualResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <p className="font-medium">{manualResult.message}</p>
            </div>
            {manualResult.success && (
              <p className="mt-1 text-xs opacity-70">Dashboard&apos;a yönlendiriliyorsunuz...</p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleManualReset}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Formu Temizle
          </button>
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={manualSaving}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-60"
          >
            {manualSaving ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Kaydediliyor...</>
            ) : (
              <><Send className="w-4 h-4" />Kaydet ve Dashboard&apos;a Git</>
            )}
          </button>
        </div>
      </div>

      {/* ── Upload History ── */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Yükleme Geçmişi</h3>
            {logs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
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
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz veri yüklenmedi.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const platforms = getPlatforms(log);
              const range = fmtRange(log.dateStart, log.dateEnd);
              return (
                <div
                  key={log.id}
                  className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                    log.status === 'success'
                      ? 'border-border bg-muted/30 hover:bg-muted/50'
                      : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${log.status === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {log.fileType === 'XLSX' || log.fileType === 'XLS'
                      ? <FileSpreadsheet className={`w-4 h-4 ${log.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
                      : <FileText className={`w-4 h-4 ${log.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground truncate">{log.fileName}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                      }`}>
                        {log.status === 'success' ? '✓ Başarılı' : '✗ Hata'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtDate(log.createdAt)}
                      </span>
                      {log.importedRows > 0 && (
                        <span>📊 {log.importedRows} satır</span>
                      )}
                      {range && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {range}
                        </span>
                      )}
                      {platforms.length > 0 && (
                        <span>📡 {platforms.join(', ')}</span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{log.errorMessage}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id, log.fileName)}
                    disabled={deletingId === log.id}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    title="Bu yüklemeyi ve verilerini sil"
                  >
                    {deletingId === log.id
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Supported Formats Info (collapsible) ── */}
      <div className="card-premium overflow-hidden">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground text-sm">Desteklenen Formatlar ve Sütun İsimleri</span>
          </div>
          {showInfo ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showInfo && (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground border-t border-border pt-4">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground mb-2">📊 Platform Dışa Aktarmaları</p>
                <ul className="space-y-1.5">
                  <li>• <strong>Meta Ads:</strong> Reklam Yöneticisi CSV/XLSX</li>
                  <li>• <strong>Google Ads:</strong> Kampanya raporu CSV</li>
                  <li>• <strong>İkas / Ticimax:</strong> Sipariş raporu XLSX</li>
                  <li>• <strong>IdeaSoft / Shopify:</strong> Satış raporu CSV</li>
                  <li>• <strong>Manuel:</strong> Aşağıdaki form ile doğrudan giriş</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">✅ Tanınan Sütun Adları</p>
                <div className="flex flex-wrap gap-1">
                  {['tarih','harcama','ciro','sipariş','gösterim','tıklama','platform','kampanya',
                    'date','spend','revenue','orders','impressions','clicks','aov','cpc','ctr','cac'].map((k) => (
                    <code key={k} className="px-1.5 py-0.5 bg-muted rounded text-[11px]">{k}</code>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground mb-2">⚙️ Teknik Detaylar</p>
                <ul className="space-y-1.5">
                  <li>• Ayraç: virgül (,), noktalı virgül (;) veya sekme</li>
                  <li>• Encoding: UTF-8, UTF-8 BOM, Windows-1254</li>
                  <li>• Tarih: GG.AA.YYYY, YYYY-AA-GG, GG/AA/YYYY</li>
                  <li>• Para: ₺, TL, TRY ile başlayan değerler</li>
                  <li>• Maks. dosya boyutu: {MAX_MB} MB</li>
                </ul>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  💡 <strong>İpucu:</strong> Türkçe karakterli sütun adları (ş, ğ, ı, ö, ü, ç) ve büyük/küçük harf farkı otomatik tolere edilir.
                  Birden fazla sayfası olan Excel dosyaları da desteklenir.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
