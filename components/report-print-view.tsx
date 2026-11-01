'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileDown, ImageDown, Loader2, Printer } from 'lucide-react';
import ReportDocument from '@/components/report-document';
import type { ReportDocumentData } from '@/lib/report/document';
import { fileSlug } from '@/lib/report/format';
import { monthLabel } from '@/lib/report/months';
import { buildJpegPdf, type PdfPage } from '@/lib/pdf/jpeg-pdf';

const PIXEL_RATIO = 2; // A4 ≈ 1588×2246 px: baskıda net, dosya boyutu makul
const JPEG_QUALITY = 0.92;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Grafiğin çizilmesini bekler (rapor açılır açılmaz indirmede boş grafik çıkmasın) */
async function waitForCharts() {
  for (let i = 0; i < 40; i++) {
    const charts = document.querySelectorAll('.report-doc .doc-chart');
    const drawn = document.querySelectorAll('.report-doc .doc-chart svg');
    if (charts.length === drawn.length) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  await document.fonts?.ready;
}

/**
 * Tam sayfa belge görünümü.
 * - PDF indir: her A4 sayfayı yüksek çözünürlükte işleyip doğrudan .pdf dosyası indirir
 *   (yazdırma penceresi ve kenar boşluğu ayarı gerekmez; ekranda görülenle aynı).
 * - Yazdır: tarayıcının yazdırma penceresi (metni seçilebilir PDF isteyenler için).
 * - PNG: sayfa sayfa görüntü.
 */
export default function ReportPrintView({ data, backHref, autoDownload = false }: { data: ReportDocumentData; backHref?: string; autoDownload?: boolean }) {
  const [busy, setBusy] = useState<null | 'pdf' | 'png'>(null);
  const [progress, setProgress] = useState('');
  const started = useRef(false);
  const base = `${fileSlug(data.brand.name)}-${data.report.month}-rapor`;

  const renderPages = async (onPage: (canvas: HTMLCanvasElement, i: number, total: number) => Promise<void>) => {
    await waitForCharts();
    const { toCanvas } = await import('html-to-image');
    const pages = Array.from(document.querySelectorAll<HTMLElement>('.report-doc .doc-page'));
    for (const [i, page] of pages.entries()) {
      setProgress(`Sayfa ${i + 1}/${pages.length}`);
      const canvas = await toCanvas(page, { pixelRatio: PIXEL_RATIO, backgroundColor: '#ffffff', cacheBust: true });
      await onPage(canvas, i, pages.length);
    }
  };

  const downloadPdf = async () => {
    setBusy('pdf');
    try {
      const pdfPages: PdfPage[] = [];
      await renderPages(async (canvas) => {
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', JPEG_QUALITY));
        if (!blob) throw new Error('Sayfa görüntüsü oluşturulamadı');
        pdfPages.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
      });
      const pdf = buildJpegPdf(pdfPages, { title: `${data.brand.name} · ${monthLabel(data.report.month)} performans raporu`, author: data.preparedBy || undefined });
      download(new Blob([pdf as BlobPart], { type: 'application/pdf' }), `${base}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF oluşturulamadı. "Yazdır" ile tarayıcıdan PDF kaydetmeyi deneyin.');
    }
    setBusy(null);
    setProgress('');
  };

  const downloadPng = async () => {
    setBusy('png');
    try {
      await renderPages(async (canvas, i) => {
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
        if (blob) download(blob, `${base}-sayfa-${i + 1}.png`);
        // Tarayıcı ardışık indirmeleri engellemesin
        await new Promise((r) => setTimeout(r, 300));
      });
    } catch (e) {
      console.error(e);
      alert('PNG oluşturulamadı.');
    }
    setBusy(null);
    setProgress('');
  };

  const printPdf = () => {
    const previous = document.title;
    // Kaydet penceresindeki önerilen dosya adı belge başlığından gelir
    document.title = base;
    window.print();
    document.title = previous;
  };

  // Aylık Raporlar'daki "PDF indir" doğrudan bu sayfayı açıp indirmeyi başlatır
  useEffect(() => {
    if (autoDownload && !started.current) {
      started.current = true;
      void downloadPdf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload]);

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
          <button onClick={printPdf} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-[#f3f4f6] disabled:opacity-50" title="Tarayıcının yazdırma penceresi (metni seçilebilir PDF)">
            <Printer className="w-4 h-4" /> Yazdır
          </button>
          <button onClick={downloadPng} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-[#d1d5db] hover:bg-[#f3f4f6] disabled:opacity-50">
            {busy === 'png' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />} PNG
          </button>
          <button onClick={downloadPdf} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#4f46e5] text-white hover:bg-[#4338ca] disabled:opacity-60">
            {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {busy === 'pdf' ? `PDF hazırlanıyor… ${progress}` : 'PDF indir'}
          </button>
        </div>
        <p className="max-w-[210mm] mx-auto px-4 pb-2 text-xs text-[#6b7280]">
          &quot;PDF indir&quot; aşağıdaki A4 sayfaları birebir {data.publishedAt ? '' : '(taslak) '}PDF dosyası olarak indirir; müşteriye doğrudan gönderebilirsiniz.
        </p>
      </div>
      <div className="py-8 overflow-x-auto print:py-0 print:overflow-visible">
        <ReportDocument data={data} />
      </div>
    </div>
  );
}
