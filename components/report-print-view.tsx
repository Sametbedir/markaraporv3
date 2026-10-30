'use client';

import React, { useState } from 'react';
import { FileDown, ImageDown, Loader2 } from 'lucide-react';
import ReportDocument from '@/components/report-document';
import type { ReportDocumentData } from '@/lib/report/document';
import { fileSlug } from '@/lib/report/format';

/** Tam sayfa belge görünümü: PDF (yazdır) ve sayfa sayfa PNG indirme. */
export default function ReportPrintView({ data, backHref }: { data: ReportDocumentData; backHref?: string }) {
  const [busy, setBusy] = useState(false);
  const base = `${fileSlug(data.brand.name)}-${data.report.month}-rapor`;

  const downloadPng = async () => {
    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const pages = Array.from(document.querySelectorAll<HTMLElement>('.report-doc .doc-page'));
      for (const [i, page] of pages.entries()) {
        const url = await toPng(page, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}-sayfa-${i + 1}.png`;
        a.click();
        // Tarayıcı ardışık indirmeleri engellemesin
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) {
      console.error(e);
      alert('PNG oluşturulamadı. PDF olarak kaydetmeyi deneyin.');
    }
    setBusy(false);
  };

  const printPdf = () => {
    const previous = document.title;
    // Kaydet penceresindeki önerilen dosya adı belge başlığından gelir
    document.title = base;
    window.print();
    document.title = previous;
  };

  return (
    <div className="min-h-screen bg-[#e5e7eb] print:bg-white">
      <div className="print-hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#d1d5db]">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-wrap items-center gap-2 text-[#111827]">
          <p className="mr-auto text-sm font-medium">
            {data.brand.name} · {data.publishedAt ? 'Yayınlanan rapor' : 'Taslak önizleme'}
          </p>
          {backHref && (
            <a href={backHref} className="px-3 py-2 rounded-lg text-sm hover:bg-[#f3f4f6]">Geri</a>
          )}
          <button onClick={downloadPng} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-[#d1d5db] hover:bg-[#f3f4f6] disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />} PNG (sayfa sayfa)
          </button>
          <button onClick={printPdf} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#4f46e5] text-white hover:bg-[#4338ca]">
            <FileDown className="w-4 h-4" /> PDF olarak kaydet
          </button>
        </div>
        <p className="max-w-[210mm] mx-auto px-4 pb-2 text-xs text-[#6b7280]">
          PDF için açılan pencerede hedef olarak &quot;PDF olarak kaydet&quot;i seçin; kenar boşluğu &quot;Yok&quot; ve &quot;Arka plan grafikleri&quot; açık olmalı.
        </p>
      </div>
      <div className="py-8 overflow-x-auto print:py-0 print:overflow-visible">
        <ReportDocument data={data} />
      </div>
    </div>
  );
}
