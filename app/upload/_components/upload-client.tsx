'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, FileSpreadsheet, CheckCircle2, AlertCircle,
  X, Trash2, Clock, RefreshCw,
  Database, ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ManualEntry from './manual-entry';
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
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Manuel veri girişi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reklam paneli, site, mağaza ve DM verilerini elle girin. Tüm alanlar isteğe bağlıdır; boş alan 0 sayılmaz.
              Sayıları 1.234,56 veya 1234.56 biçiminde yazabilirsiniz.
            </p>
          </div>
          <ManualEntry onSaved={fetchLogs} />
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
