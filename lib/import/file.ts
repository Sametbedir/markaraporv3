/**
 * Yüklenen dosyayı (CSV, TSV, XLSX, XLS) reklam raporu olarak okur.
 * Veritabanına dokunmaz; sunucu uç noktası ve testler bu fonksiyonu kullanır.
 */

import { AdReportResult, ColumnMapping, parseAdReport } from './ad-report';
import { TablePreview, previewTable } from './preview';
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

type Sheet = { name: string | null; table: unknown[][] };

async function readSheets(buffer: ArrayBuffer, ext: string): Promise<Sheet[]> {
  if (ext === 'csv' || ext === 'tsv') return [{ name: null, table: parseDelimited(decodeText(buffer)) }];

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
  return workbook.SheetNames.map((name) => ({
    name,
    table: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: true, defval: null }),
  }));
}

export type UploadOptions = { mapping?: ColumnMapping; sheetName?: string | null };

export async function parseUploadedFile(buffer: ArrayBuffer, ext: string, options: UploadOptions = {}): Promise<ParsedFile> {
  const sheets = await readSheets(buffer, ext);

  // Önizlemede seçilen sayfa ve eşleme varsa yalnızca o okunur
  if (options.mapping) {
    const sheet = sheets.find((s) => s.name === (options.sheetName ?? null)) ?? sheets[0];
    return { report: parseAdReport(sheet?.table ?? [], { mapping: options.mapping }), sheetName: sheet?.name ?? null, extraWarnings: [] };
  }

  const parsedSheets = sheets.map((s) => ({ name: s.name, report: parseAdReport(s.table) }));
  if (parsedSheets.length === 1) return { report: parsedSheets[0].report, sheetName: parsedSheets[0].name, extraWarnings: [] };

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

export type FilePreview = { sheetName: string | null; sheetNames: string[]; preview: TablePreview | null };

/** Önizleme: seçilen (yoksa ilk uygun) sayfanın sütunları ve önerilen rolleri. */
export async function previewUploadedFile(buffer: ArrayBuffer, ext: string, sheetName?: string | null): Promise<FilePreview> {
  const sheets = await readSheets(buffer, ext);
  const sheetNames = sheets.map((s) => s.name).filter((n): n is string => n !== null);
  const chosen =
    (sheetName !== undefined ? sheets.find((s) => s.name === sheetName) : undefined) ??
    sheets.find((s) => parseAdReport(s.table).ok) ??
    sheets.find((s) => previewTable(s.table)) ??
    sheets[0];
  return { sheetName: chosen?.name ?? null, sheetNames, preview: chosen ? previewTable(chosen.table) : null };
}
