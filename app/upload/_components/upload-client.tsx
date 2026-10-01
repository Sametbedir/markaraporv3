'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, FileSpreadsheet, CheckCircle, AlertCircle,
  Info, X, Trash2, Clock, Calendar, RefreshCw, ChevronDown, ChevronUp,
  Database, ArrowRight, ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ─── Types ─── */
interface UploadResult {
  success: boolean;
  message: string;
  rows?: number;
  totalOrders?: number;
  totalRevenue?: number;
  totalSpend?: number;
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
const MAX_MB = 25;

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
      setResult({
        success: false,
        message: `".${ext}" uzantısı desteklenmiyor. Lütfen CSV veya Excel (XLSX, XLS) dosyası seçin.`,
      });
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setResult({
        success: false,
        message: `Dosya boyutu ${bytesToStr(picked.size)}. Maksimum ${MAX_MB} MB sınırını aşıyor.`,
      });
      return;
    }
    if (picked.size === 0) {
      setResult({ success: false, message: 'Seçtiğiniz dosya boş görünüyor (0 bayt).' });
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
          message: data.message ?? 'Başarıyla yüklendi ve aktarıldı.',
          rows: data.importedRows,
          totalOrders: data.totalOrders,
          totalRevenue: data.totalRevenue,
          totalSpend: data.totalSpend,
          dateStart: data.dateStart,
          dateEnd: data.dateEnd,
          platforms: data.platforms,
        });
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        await fetchLogs();

        // 2 saniye sonra otomatik yönlendir
        if (data.dateStart && data.dateEnd) {
          const params = new URLSearchParams({
            start_date: data.dateStart,
            end_date: data.dateEnd,
          });
          setTimeout(() => router.push(`/dashboard?${params.toString()}`), 2200);
        }
      } else {
        setResult({
          success: false,
          message: data?.error ?? 'Yükleme başarısız oldu. Lütfen dosya sütunlarını kontrol edin.',
        });
      }
    } catch (e: any) {
      setResult({
        success: false,
        message: `Bağlantı hatası: ${e?.message ?? 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'}`,
      });
    }
    setUploading(false);
  };

  /* ── Delete log ── */
  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`"${fileName}" yüklemesini ve bu tarihlere ait verileri kaldırmak istediğinizden emin misiniz?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/upload/logs?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert(data?.error ?? 'Silme işlemi başarısız.');
      }
    } catch { alert('Silme sırasında bağlantı hatası oluştu.'); }
    setDeletingId(null);
  };

  const isExcel = file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
  const FileIcon = isExcel ? FileSpreadsheet : FileText;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" /> Veri Yükle &amp; Aktar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Meta Ads, Google Ads, TikTok Ads, İkas, Ticimax, IdeaSoft veya kendi CSV/Excel raporlarınızı yükleyin.
          Sistem sütunları otomatik tanır ve doğrudan canlı dashboard'a işler.
        </p>
      </div>

      {/* ── Drop Zone ── */}
      <div className="card-premium p-8">
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer select-none
            ${dragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
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
                <p className="text-foreground font-semibold text-base">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bytesToStr(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-1 px-3 py-1 rounded-md hover:bg-destructive/10"
              >
                <X className="w-3.5 h-3.5" /> Dosyayı Değiştir / Kaldır
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-primary/20' : 'bg-primary/10'}`}>
                <Upload className={`w-8 h-8 transition-colors ${dragging ? 'text-primary' : 'text-primary/70'}`} />
              </div>
              <div>
                <p className="text-foreground font-semibold text-base">
                  {dragging ? 'Dosyayı şimdi bırakabilirsiniz!' : 'Dosyayı buraya sürükleyin veya tıklayarak seçin'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Desteklenenler: CSV, XLSX, XLS, TSV • Maksimum: {MAX_MB} MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl shadow-md disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Veriler İşleniyor &amp; Dashboard'a Aktarılıyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Yükle ve Dashboard'a Aktar
                </>
              )}
            </button>
          </div>
        )}

        {/* Sonuç Bildirimi */}
        {result && (
          <div className={`mt-5 p-5 rounded-2xl text-sm border shadow-sm ${
            result.success
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60'
          }`}>
            <div className="flex items-start gap-3">
              {result.success
                ? <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                : <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />}
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-base">{result.message}</p>
                {result.success ? (
                  <div className="space-y-1.5 text-xs text-emerald-700 dark:text-emerald-400/90 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                      {result.rows !== undefined && (
                        <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Aktarılan Satır</span>
                          <span className="font-bold text-sm">{result.rows} Satır</span>
                        </div>
                      )}
                      {result.totalOrders !== undefined && (
                        <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Toplam Sipariş</span>
                          <span className="font-bold text-sm">{result.totalOrders.toLocaleString('tr-TR')} Sipariş</span>
                        </div>
                      )}
                      {result.totalRevenue !== undefined && (
                        <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Toplam Ciro</span>
                          <span className="font-bold text-sm">₺{Math.round(result.totalRevenue).toLocaleString('tr-TR')}</span>
                        </div>
                      )}
                      {(result.dateStart || result.dateEnd) && (
                        <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-2 rounded-lg">
                          <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Tarih Aralığı</span>
                          <span className="font-bold text-xs">{fmtRange(result.dateStart ?? null, result.dateEnd ?? null)}</span>
                        </div>
                      )}
                    </div>
                    {result.platforms?.length ? (
                      <p>📡 <strong>Platformlar:</strong> {result.platforms.join(', ')}</p>
                    ) : null}
                    <div className="pt-2 flex items-center gap-3">
                      <Link
                        href={`/dashboard?start_date=${result.dateStart || ''}&end_date=${result.dateEnd || ''}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow"
                      >
                        Hemen Dashboard'da İncele <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <span className="text-xs text-muted-foreground">(2 saniye içinde otomatik açılıyor...)</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-700 dark:text-red-300 pt-1">
                    <p className="font-medium">Neler yapabilirsiniz?</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      <li>Dosyanızın ilk satırında sütun başlıkları olduğundan emin olun (Örn: Tarih, Harcama, Ciro, Sipariş).</li>
                      <li>CSV dosyasının UTF-8 formatında kaydedildiğini kontrol edin.</li>
                      <li>Excel (.xlsx) formatında kaydedip tekrar yüklemeyi deneyebilirsiniz.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Yükleme Geçmişi ── */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Yükleme Geçmişi</h3>
            {logs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                {logs.length} Yükleme
              </span>
            )}
          </div>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Listeyi Yenile"
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
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Henüz yüklenmiş bir dosya bulunmuyor.</p>
            <p className="text-xs mt-1 text-muted-foreground/80">Yüklediğiniz dosyalar burada listelenir, dilediğiniz zaman silebilir veya dashboard'da açabilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const platforms = getPlatforms(log);
              const range = fmtRange(log.dateStart, log.dateEnd);
              const isXls = log.fileType === 'XLSX' || log.fileType === 'XLS';
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40 p-4 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      {isXls ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate">{log.fileName}</p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                          {log.importedRows} Satır
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {fmtDate(log.createdAt)}
                        </span>
                        {range && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary" />
                            {range}
                          </span>
                        )}
                        {platforms.length > 0 && (
                          <span>📡 {platforms.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {log.dateStart && log.dateEnd && (
                      <Link
                        href={`/dashboard?start_date=${log.dateStart}&end_date=${log.dateEnd}`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors text-xs flex items-center gap-1 font-medium"
                        title="Bu yüklemenin tarih aralığını Dashboard'da aç"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard'da Gör</span>
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(log.id, log.fileName)}
                      disabled={deletingId === log.id}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Bu yüklemeyi ve ilişkili verileri sil"
                    >
                      {deletingId === log.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Desteklenen Formatlar Rehberi ── */}
      <div className="card-premium overflow-hidden">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground text-sm">Desteklenen Sütunlar ve Format Rehberi</span>
          </div>
          {showInfo ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showInfo && (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground border-t border-border pt-4">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground mb-2">📊 Otomatik Tanınan Platformlar</p>
                <ul className="space-y-1.5 text-xs">
                  <li>• <strong>Meta Ads:</strong> Reklam Yöneticisi CSV/XLSX dışa aktarma</li>
                  <li>• <strong>Google Ads:</strong> Kampanya / Performans raporu CSV</li>
                  <li>• <strong>İkas / Ticimax / Shopify:</strong> Sipariş ve ciro raporu</li>
                  <li>• <strong>Manuel Tablolar:</strong> Excel veya CSV formatında kendi tablolarınız</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">✅ Otomatik Eşleşen Başlıklar</p>
                <div className="flex flex-wrap gap-1">
                  {['Tarih', 'Kanal / Platform', 'Kampanya', 'Harcama / Spend', 'Ciro / Gelir', 'Sipariş / Orders', 'Gösterim', 'Tıklama', 'CPC', 'CTR', 'ROAS'].map((k) => (
                    <code key={k} className="px-2 py-0.5 bg-muted rounded text-[11px] text-foreground font-medium">{k}</code>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground mb-2">⚡ Akıllı Algılama</p>
                <ul className="space-y-1.5 text-xs">
                  <li>• Virgül (,), noktalı virgül (;) ve sekme ayracı otomatik algılanır.</li>
                  <li>• Türkçe karakterler (ş, ğ, ı, ö, ü, ç) ve büyük/küçük harf toleranslıdır.</li>
                  <li>• Para birimi işaretleri (₺, TL, TRY) otomatik temizlenir.</li>
                  <li>• Tarih formatları (2026-08-13 veya 13.08.2026) otomatik ISO formatına çevrilir.</li>
                </ul>
              </div>
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-xs text-primary font-medium">
                  💡 Yükleme bittiğinde sistem tarih aralığını otomatik algılayıp doğrudan o dönemin canlı dashboard'una yönlendirir.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
