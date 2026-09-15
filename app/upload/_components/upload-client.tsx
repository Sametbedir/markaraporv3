'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function UploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      setResult({
        success: res.ok,
        message: data?.message ?? (res.ok ? 'Dosya başarıyla yüklendi' : 'Yükleme başarısız'),
      });
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? 'Bir hata oluştu' });
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" /> Veri Yükle
        </h1>
        <p className="text-sm text-muted-foreground">CSV veya Excel dosyalarınızı yükleyerek verilerinizi içe aktarın</p>
      </div>

      <div className="card-premium p-8">
        <div
          className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click?.()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          {file ? (
            <div>
              <p className="text-foreground font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-foreground font-medium">Dosya seçmek için tıklayın</p>
              <p className="text-sm text-muted-foreground mt-1">CSV, XLSX veya XLS formatı</p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 flex justify-end">
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> {uploading ? 'Yükleniyor...' : 'Yükle'}
            </button>
          </div>
        )}

        {result && (
          <div className={`mt-4 p-4 rounded-xl flex items-center gap-2 ${result.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
            {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {result.message}
          </div>
        )}
      </div>

      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Desteklenen Formatlar</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• <strong>Meta Ads:</strong> Reklam Yöneticisi'nden dışa aktarılan CSV</li>
          <li>• <strong>Google Ads:</strong> Kampanya raporu CSV</li>
          <li>• <strong>Sipariş Verisi:</strong> tarih, miktar, gelir sütunlarını içeren CSV</li>
          <li>• <strong>Genel:</strong> Manuel giriş dosyaları (XLSX/CSV)</li>
        </ul>
      </div>
    </div>
  );
}
