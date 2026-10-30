/**
 * Marka seçimi ve marka formu doğrulaması (veritabanı ve Next.js bağımlılığı yok; test edilebilir).
 */

type BrandLike = { id: string; archivedAt: Date | null };

/** Çerezdeki marka listede ve arşivlenmemişse o, değilse ilk aktif marka; hiç yoksa null. */
export function pickBrand<T extends BrandLike>(brands: T[], cookieId: string | undefined | null): T | null {
  const active = brands.filter((b) => b.archivedAt === null);
  return active.find((b) => b.id === cookieId) ?? active[0] ?? null;
}

export const SUPPORTED_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;
export const LOGO_MAX_BYTES = 200 * 1024;
const LOGO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export type BrandInput = {
  name?: string;
  website?: string | null;
  industry?: string | null;
  logoUrl?: string | null;
  currency?: string;
};

/**
 * Marka formunu doğrular. `partial` true ise yalnızca gönderilen alanlar kontrol edilir (güncelleme).
 * Logo yalnızca PNG/JPEG/WebP data: URL olabilir (SVG içinde betik çalışabildiği için kabul edilmez).
 */
export function validateBrandInput(body: any, partial = false): { data: BrandInput } | { error: string } {
  const data: BrandInput = {};
  const has = (k: string) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (!partial || has('name')) {
    const name = String(body?.name ?? '').trim();
    if (!name) return { error: 'Marka adı gereklidir.' };
    if (name.length > 80) return { error: 'Marka adı en fazla 80 karakter olabilir.' };
    data.name = name;
  }
  if (has('website')) {
    const raw = String(body.website ?? '').trim();
    if (!raw) data.website = null;
    else {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes('.')) throw new Error();
        data.website = url.toString().replace(/\/$/, '');
      } catch {
        return { error: 'Web sitesi adresi geçersiz.' };
      }
    }
  }
  if (has('industry')) {
    const industry = String(body.industry ?? '').trim();
    data.industry = industry ? industry.slice(0, 80) : null;
  }
  if (has('currency')) {
    const currency = String(body.currency ?? '').toUpperCase();
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) return { error: 'Desteklenmeyen para birimi.' };
    data.currency = currency;
  }
  if (has('logo_url')) {
    const logo = body.logo_url === null ? '' : String(body.logo_url);
    if (!logo) data.logoUrl = null;
    else {
      if (!LOGO_PATTERN.test(logo)) return { error: 'Logo PNG, JPEG veya WebP olmalıdır.' };
      // base64 uzunluğu → bayt
      const bytes = Math.floor((logo.length - logo.indexOf(',') - 1) * 0.75);
      if (bytes > LOGO_MAX_BYTES) return { error: 'Logo en fazla 200 KB olabilir.' };
      data.logoUrl = logo;
    }
  }
  return { data };
}
