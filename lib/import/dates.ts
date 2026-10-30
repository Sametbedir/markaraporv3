/**
 * Hücre değerini "YYYY-MM-DD" biçimine çevirir; okunamazsa null döner.
 *
 * - Excel'den gelen Date nesnelerinde yerel tarih bileşenleri kullanılır (UTC'ye çevirmek
 *   Türkiye saatinde bir gün geri kaydırır).
 * - "05/10/2026" gibi belirsiz tarihler Türkiye alışkanlığına göre GÜN/AY okunur;
 *   ilk sayı 12'den büyükse zaten gündür, ikinci sayı 12'den büyükse AY/GÜN okunur.
 * - 31.02.2026 gibi takvimde olmayan tarihler reddedilir.
 * - Biçimsiz Excel hücrelerindeki seri numaraları (örn. 46278) tarihe çevrilir.
 */

const MONTHS: Record<string, number> = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6,
  temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function toIso(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthFromName(name: string): number | undefined {
  const key = name
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\.$/, '');
  return MONTHS[key];
}

export function parseDate(raw: unknown): string | null {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return toIso(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }
  // Tarih biçimi verilmemiş Excel hücresi seri numarası olarak gelir (1 = 1900-01-01, 46000 ≈ 2025)
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 36526 || raw > 73050) return null; // 2000–2099 dışı
    const d = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;

  // 2026-10-05, 2026/10/05, 2026-10-05T00:00:00Z
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (m) return toIso(+m[1], +m[2], +m[3]);

  // 05.10.2026, 05/10/2026, 05-10-2026
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s.*)?$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    if (b > 12 && a <= 12) return toIso(year, a, b);
    return toIso(year, b, a);
  }

  // 5 Ekim 2026, 5 Oct 2026
  m = v.match(/^(\d{1,2})\s+([^\s\d,]+)\s+(\d{4})$/);
  if (m) {
    const month = monthFromName(m[2]);
    return month ? toIso(+m[3], month, +m[1]) : null;
  }

  // Oct 5, 2026
  m = v.match(/^([^\s\d,]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = monthFromName(m[1]);
    return month ? toIso(+m[3], month, +m[2]) : null;
  }

  return null;
}
