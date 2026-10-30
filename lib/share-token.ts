/**
 * Müşteri linki anahtarları ve izinleri (veritabanı bağımlılığı yok; test edilebilir).
 *
 * - Anahtar 256 bit rastgeledir (base64url, 43 karakter); tahmin edilemez.
 * - Veritabanında yalnızca SHA-256 özeti tutulur: veritabanı sızsa bile linkler kullanılamaz.
 *   Bu yüzden link yalnızca oluşturulduğu anda bir kez gösterilir.
 */

import { createHash, randomBytes } from 'node:crypto';

export const SHARE_SECTIONS = ['report', 'goals', 'uptime'] as const;
export type ShareSection = (typeof SHARE_SECTIONS)[number];

export const SECTION_LABELS: Record<ShareSection, string> = {
  report: 'Aylık raporlar (yayınladıklarınız)',
  goals: 'Hedef ilerlemesi',
  uptime: 'Site erişilebilirliği (uptime)',
};

export function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Biçimi bozuk anahtarlar veritabanına hiç sorulmaz. */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function parseSections(raw: unknown): ShareSection[] {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return SHARE_SECTIONS.filter((s) => list.includes(s));
}

export type LinkState = 'active' | 'revoked' | 'expired';

export function linkState(link: { revokedAt: Date | null; expiresAt: Date | null }, now = new Date()): LinkState {
  if (link.revokedAt) return 'revoked';
  if (link.expiresAt && link.expiresAt <= now) return 'expired';
  return 'active';
}

/** "YYYY-MM-DD" bitiş tarihi o günün sonuna kadar geçerlidir (Türkiye saati). Geçmiş tarih reddedilir. */
export function parseExpiry(raw: unknown, now = new Date()): { value: Date | null } | { error: string } {
  const text = String(raw ?? '').trim();
  if (!text) return { value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { error: 'Bitiş tarihi geçersiz.' };
  const value = new Date(`${text}T23:59:59+03:00`);
  if (Number.isNaN(value.getTime())) return { error: 'Bitiş tarihi geçersiz.' };
  if (value <= now) return { error: 'Bitiş tarihi bugünden sonra olmalı.' };
  return { value };
}
