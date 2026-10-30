/**
 * Hücre değerlerini sayıya çevirir.
 *
 * Kurallar:
 * - Boş hücre, "-", "n/a" gibi değerler EKSİK sayılır (value: null). Eksik değer asla 0 yapılmaz.
 * - Okunamayan değer de null döner ama `invalid: true` ile işaretlenir; çağıran taraf uyarı üretir.
 * - Hem nokta hem virgül varsa sonuncusu ondalık ayracıdır: "1.234,56" ve "1,234.56" ikisi de 1234.56.
 * - Tek ayraç varsa ve arkasında 3 hane yoksa ondalıktır ("12,5" → 12.5, "0.75" → 0.75).
 * - Tek ayraç ve arkasında tam 3 hane varsa belirsizdir ("1.500"); dosyanın ondalık stili kullanılır.
 */

export type DecimalStyle = 'comma' | 'dot';

export type ParsedNumber = {
  value: number | null;
  invalid: boolean;
  ambiguous: boolean;
};

const MISSING_VALUES = new Set(['', '-', '--', '—', '–', 'n/a', 'na', 'yok', 'null', 'none']);
const CURRENCY_MARKS = /₺|\$|€|£|(?<![a-z])(?:TL|TRY|USD|EUR|GBP)(?![a-z])/gi;

const missing = (): ParsedNumber => ({ value: null, invalid: false, ambiguous: false });
const invalid = (): ParsedNumber => ({ value: null, invalid: true, ambiguous: false });

function isThousandsGrouping(parts: string[]): boolean {
  return /^\d{1,3}$/.test(parts[0]) && parts.slice(1).every((p) => /^\d{3}$/.test(p));
}

export function parseNumber(raw: unknown, decimalStyle: DecimalStyle = 'comma'): ParsedNumber {
  if (raw === null || raw === undefined) return missing();
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw, invalid: false, ambiguous: false } : invalid();
  }
  if (typeof raw !== 'string') return invalid();

  let s = raw.replace(/[\s  ]/g, '');
  if (MISSING_VALUES.has(s.toLowerCase())) return missing();

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(CURRENCY_MARKS, '').replace(/%$/, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return invalid();

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let decimalSep: '.' | ',' | null = null;
  let ambiguous = false;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    const intPart = s.slice(0, s.lastIndexOf(decimalSep));
    if (intPart.includes(decimalSep) || !isThousandsGrouping(intPart.split(thousandsSep))) return invalid();
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    if (parts.length > 2) {
      // "2.449.050" gibi: yalnızca binlik ayracı olabilir
      if (!isThousandsGrouping(parts)) return invalid();
    } else if (parts[1].length !== 3 || parts[0] === '' || parts[0] === '0') {
      decimalSep = sep;
    } else {
      ambiguous = true;
      const fileDecimal = decimalStyle === 'comma' ? ',' : '.';
      if (sep === fileDecimal) decimalSep = sep;
    }
  }

  let normalized = s;
  if (decimalSep) {
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    normalized = s.split(thousandsSep).join('').replace(decimalSep, '.');
  } else {
    normalized = s.replace(/[.,]/g, '');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return invalid();
  return { value: negative ? -value : value, invalid: false, ambiguous };
}

/**
 * Bir dosyadaki örnek hücrelere bakarak ondalık stilini tahmin eder.
 * Yalnızca kesin ipuçları sayılır ("1.234,56" veya "12,5" gibi); belirsiz "1.500" oy vermez.
 * Karar verilemezse null döner.
 */
export function detectDecimalStyle(samples: unknown[]): DecimalStyle | null {
  let comma = 0;
  let dot = 0;
  for (const raw of samples) {
    if (typeof raw !== 'string') continue;
    const s = raw.replace(/[\s  ]/g, '').replace(CURRENCY_MARKS, '');
    if (!/^[-(]?[\d.,]+%?\)?$/.test(s)) continue;
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
      if (lastComma > lastDot) comma++;
      else dot++;
    } else if (lastDot >= 0 || lastComma >= 0) {
      const sep = lastDot >= 0 ? '.' : ',';
      const parts = s.replace(/[^\d.,]/g, '').split(sep);
      if (parts.length === 2 && parts[1].length !== 3) {
        if (sep === ',') comma++;
        else dot++;
      }
    }
  }
  if (comma === 0 && dot === 0) return null;
  return comma >= dot ? 'comma' : 'dot';
}
