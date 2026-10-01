'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info, X, FileSpreadsheet } from 'lucide-react';

const ACCEPTED = '.csv,.xlsx,.xls';
const MAX_MB = 10;

function bytesToStr(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function UploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; rows?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    setResult(null);
    const ext = picked.name.toLowerCase().split('.').pop() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setResult({ success: false, message: 'Desteklenmeyen format. Lütfen CSV, XLSX veya XLS seçin.' });
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setResult({ success: false, message: `Dosya boyutu ${MAX_MB} MB sınırını aşıyor.` });
      return;
    }
    setFile(picked);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    pickFile(dropped ?? null);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      setResult({
        success: res.ok,
        message:
          data?.message ??
          (res.ok ? 'Dosya başarıyla yüklendi.' : data?.error ?? 'Yükleme başarısız.'),
        rows: data?.importedRows,
      });
      if (res.ok) setFile(null);
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? 'Bağlantı hatası.' });
    }
    setUploading(false);
  };

  const isExcel = file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
  const FileIcon = isExcel ? FileSpreadsheet : FileText;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" /> Veri Yükle
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Meta Ads, Google Ads, İkas, Ticimax veya kendi hazırladığınız CSV/Excel verilerini yükleyin.
        </p>
      </div>

      {/* Drop zone */}
      <div className="card-premium p-8">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
            ${dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
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
              <FileIcon className="w-12 h-12 text-primary" />
              <div>
                <p className="text-foreground font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bytesToStr(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> Kaldır
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-semibold">Dosyayı buraya sürükleyin veya tıklayın</p>
                <p className="text-sm text-muted-foreground mt-1">CSV, XLSX veya XLS — maks. {MAX_MB} MB</p>
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex items-center gap-2 px-6 py-2.5"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Yükle ve Analiz Et
                </>
              )}
            </button>
          </div>
        )}

        {result && (
          <div
            className={`mt-5 p-4 rounded-xl flex items-start gap-3 text-sm ${
              result.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}
          >
            {result.success
              ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div>
              <p className="font-medium">{result.message}</p>
              {result.success && result.rows !== undefined && (
                <p className="text-xs mt-0.5 opacity-80">
                  {result.rows} satır işlendi. Dashboard'u yenileyerek güncel verileri görüntüleyebilirsiniz.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Supported formats */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Desteklenen Formatlar ve Sütun İsimleri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-1">📊 Platform Dışa Aktarmaları</p>
              <ul className="space-y-1">
                <li>• <strong>Meta Ads:</strong> Reklam Yöneticisi CSV/XLSX</li>
                <li>• <strong>Google Ads:</strong> Kampanya raporu CSV</li>
                <li>• <strong>İkas / Ticimax:</strong> Sipariş raporu XLSX</li>
                <li>• <strong>IdeaSoft / Shopify:</strong> Satış raporu CSV</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">✅ Zorunlu Sütunlar (en az 1)</p>
              <ul className="space-y-1">
                <li>• <code className="bg-muted px-1 rounded text-xs">tarih</code> / <code className="bg-muted px-1 rounded text-xs">date</code></li>
                <li>• <code className="bg-muted px-1 rounded text-xs">harcama</code> / <code className="bg-muted px-1 rounded text-xs">spend</code> / <code className="bg-muted px-1 rounded text-xs">cost</code></li>
                <li>• <code className="bg-muted px-1 rounded text-xs">ciro</code> / <code className="bg-muted px-1 rounded text-xs">gelir</code> / <code className="bg-muted px-1 rounded text-xs">revenue</code></li>
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-1">📈 Opsiyonel Sütunlar</p>
              <ul className="space-y-1">
                <li>• <code className="bg-muted px-1 rounded text-xs">sipariş</code> / <code className="bg-muted px-1 rounded text-xs">orders</code></li>
                <li>• <code className="bg-muted px-1 rounded text-xs">gösterim</code> / <code className="bg-muted px-1 rounded text-xs">impressions</code></li>
                <li>• <code className="bg-muted px-1 rounded text-xs">tıklama</code> / <code className="bg-muted px-1 rounded text-xs">clicks</code></li>
                <li>• <code className="bg-muted px-1 rounded text-xs">cpc</code>, <code className="bg-muted px-1 rounded text-xs">ctr</code>, <code className="bg-muted px-1 rounded text-xs">aov</code>, <code className="bg-muted px-1 rounded text-xs">cac</code></li>
                <li>• <code className="bg-muted px-1 rounded text-xs">platform</code> / <code className="bg-muted px-1 rounded text-xs">kampanya</code></li>
              </ul>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                💡 <strong>İpucu:</strong> Türkçe karakterli (ş, ğ, ı, ö, ü, ç) sütun adları otomatik tanınır.
                Noktalı virgül (;) ayraçlı CSV'ler de desteklenir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
