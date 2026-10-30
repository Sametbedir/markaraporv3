/** Rapor ekranları için Türkçe sayı ve para biçimleri. Değer yoksa "—". */

export const num = (v: number | null, digits = 0) =>
  v === null ? '—' : v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export type Money = (v: number | null, digits?: number) => string;

/** Para birimi bilinmiyorsa (karışık) simgesiz sayı gösterir. */
export function moneyFormatter(currency: string | null): Money {
  return (v, digits = 0) => {
    if (v === null) return '—';
    if (!currency) return num(v, digits);
    return v.toLocaleString('tr-TR', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
}

export const trDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('tr-TR', { timeZone: 'UTC' });

/** Dosya adında Türkçe ve özel karakter bırakmaz: "Örnek Marka" → "ornek-marka" */
export function fileSlug(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'rapor';
}
