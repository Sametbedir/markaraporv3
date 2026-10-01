'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, FileSpreadsheet, CheckCircle, AlertCircle,
  Info, X, Trash2, Clock, Calendar, RefreshCw, ChevronDown, ChevronUp,
  Database,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

  /* ── Upload ── */
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

        // Dashboard'u tarih aralığıyla aç
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
          Meta Ads, Google Ads, İkas, Ticimax veya kendi hazırladığınız CSV/Excel dosyalarını yükleyin.
          Veriler otomatik analiz edilip dashboard'a aktarılır.
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

        {/* Result */}
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
                    <p className="mt-1">Dashboard'a yönlendiriliyorsunuz...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                  <li>• <strong>Manuel:</strong> Kendi hazırladığınız tablo</li>
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
