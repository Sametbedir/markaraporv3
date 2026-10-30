/**
 * Yüklenen dosyayı (CSV, TSV, XLSX, XLS) reklam raporu olarak okur.
 * Veritabanına dokunmaz; sunucu uç noktası ve testler bu fonksiyonu kullanır.
 */

import { AdReportResult, parseAdReport } from './ad-report';
import { parseDelimited } from './csv';

export const SUPPORTED_EXTENSIONS = ['csv', 'tsv', 'xlsx', 'xls'] as const;

export type ParsedFile = { report: AdReportResult; sheetName: string | null; extraWarnings: string[] };

/** Türkçe Excel'in kaydettiği CSV'ler çoğunlukla Windows-1254'tür; UTF-8 değilse ona düşülür. */
export function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1254').decode(buffer);
  }
}

export async function parseUploadedFile(buffer: ArrayBuffer, ext: string): Promise<ParsedFile> {
  if (ext === 'csv' || ext === 'tsv') {
    return { report: parseAdReport(parseDelimited(decodeText(buffer))), sheetName: null, extraWarnings: [] };
  }

  const XLSX = await import('xlsx');
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch (e: any) {
    const message = String(e?.message ?? '');
    if (/password|encrypt/i.test(message)) {
      throw new Error('Dosya şifreli. Excel\'de şifreyi kaldırıp tekrar kaydedin');
    }
    throw new Error('Excel dosyası açılamadı. Dosyanın bozuk olmadığından emin olun veya CSV olarak kaydedip deneyin');
  }

  const parsedSheets = workbook.SheetNames.map((name) => {
    const table = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: true, defval: null });
    return { name, report: parseAdReport(table) };
  });

  const usable = parsedSheets.filter((s) => s.report.ok);
  if (!usable.length) {
    // Hata mesajı için en çok ipucu veren sayfayı seç (başlığı bulunan ama verisi olmayan sayfa gibi)
    const best = parsedSheets.find((s) => s.report.headerRowNumber !== null) ?? parsedSheets[0];
    return { report: best?.report ?? parseAdReport([]), sheetName: best?.name ?? null, extraWarnings: [] };
  }
  // Birden çok sayfayı toplamak (örn. bir özet sayfası varsa) veriyi iki kez sayabilir; yalnızca ilk uygun sayfa okunur.
  const extraWarnings =
    usable.length > 1
      ? [`Dosyada okunabilir ${usable.length} sayfa var; yalnızca "${usable[0].name}" sayfası alındı. Diğer sayfaları ayrı dosya olarak yükleyin.`]
      : [];
  return { report: usable[0].report, sheetName: usable[0].name, extraWarnings };
}
