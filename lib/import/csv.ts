/**
 * CSV / TSV metnini satır ve hücrelere böler.
 * - UTF-8 BOM temizlenir.
 * - Ayraç (; , veya sekme) ilk satırlarda tırnak dışında en çok geçen karaktere göre seçilir.
 * - Tırnak içindeki ayraç ve satır sonları korunur, "" kaçışı desteklenir.
 * - Tamamen boş satırlar atlanır.
 */

const SEPARATORS = [';', ',', '\t'] as const;

function countOutsideQuotes(line: string, sep: string): number {
  let count = 0;
  let quoted = false;
  for (const c of line) {
    if (c === '"') quoted = !quoted;
    else if (c === sep && !quoted) count++;
  }
  return count;
}

export function detectSeparator(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best: string = ',';
  let bestCount = 0;
  for (const sep of SEPARATORS) {
    const count = Math.max(0, ...lines.map((l) => countOutsideQuotes(l, sep)));
    if (count > bestCount) {
      best = sep;
      bestCount = count;
    }
  }
  return best;
}

export function parseDelimited(raw: string): string[][] {
  const text = raw.replace(/^﻿/, '');
  const sep = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  const endRow = () => {
    row.push(value.trim());
    if (row.some(Boolean)) rows.push(row);
    row = [];
    value = '';
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && quoted && n === '"') {
      value += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === sep && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && n === '\n') i++;
      endRow();
    } else {
      value += c;
    }
  }
  endRow();
  return rows;
}
