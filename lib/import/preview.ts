/**
 * Yükleme önizlemesi: dosyanın sütunlarını, örnek satırlarını ve her sütun için önerilen rolü çıkarır.
 * Kullanıcı rolleri önizleme ekranında değiştirir; onaylanan roller `ColumnMapping`e çevrilip okunur.
 *
 * Tanınmayan sayısal sütunlar "özel metrik" olarak önerilir; ancak oran/ortalama sütunları
 * (CPC, CTR, "sonuç başı maliyet" gibi) toplanamayacakları için önerilmez.
 */

import { createHash } from 'node:crypto';
import { type ColumnMapping, findHeaderRow } from './ad-report';
import { type AdField, FIELD_ALIASES, detectPlatformFromHeaders, normalizeHeader } from './headers';
import { detectDecimalStyle, parseNumber } from './numbers';
import { safeCustomKey } from '../metrics/catalog';
import { parseDate } from './dates';

export type ColumnRole =
  | { kind: 'field'; field: AdField }
  | { kind: 'custom'; key: string; label: string }
  | { kind: 'ignore' };

export type PreviewColumn = {
  index: number;
  header: string;
  /** Normalize edilmiş başlık; şablon eşlemesinde kullanılır */
  key: string;
  samples: string[];
  numeric: boolean;
  role: ColumnRole;
};

export type TablePreview = {
  headerRowIndex: number;
  columns: PreviewColumn[];
  rows: string[][];
  platform: string | null;
  /** Başlıkların parmak izi: aynı biçimdeki dosyaları tanımak için */
  signature: string;
};

const RATE_HEADER = /(\bper\b|başına|basina|başı|basi\b|ortalama|avg|average|\bort\b|oran|rate|ctr|cpc|cpm|cpa|roas|frequency|sıklık|siklik|%|\/)/i;
const MAX_SCAN = 10;
const SAMPLE_ROWS = 8;

const cellText = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim());

/** Başlıktan özel metrik anahtarı: harf ile başlar, yalnızca a-z0-9 */
export function metricKey(header: string): string {
  const key = normalizeHeader(header).key.slice(0, 40);
  if (!key) return '';
  return safeCustomKey(/^[a-z]/.test(key) ? key : `m${key}`);
}

/** "Potansiyel müşteriler (TRY)" → "Potansiyel müşteriler" */
export function metricLabel(header: string): string {
  return header.replace(/[([]\s*(TRY|TL|USD|EUR|GBP)\s*[)\]]/i, '').trim().slice(0, 60) || header.slice(0, 60);
}

export function headerSignature(headers: string[]): string {
  const keys = headers.map((h) => normalizeHeader(h).key).filter(Boolean);
  return createHash('sha256').update(keys.join('|')).digest('hex');
}

function guessHeaderRow(table: unknown[][]): number | null {
  const auto = findHeaderRow(table);
  if (auto) return auto.index;
  for (let i = 0; i < Math.min(MAX_SCAN, table.length); i++) {
    const filled = (table[i] ?? []).filter((c) => cellText(c) !== '');
    // Metin hücreleri çoğunluktaysa başlık satırı say
    if (filled.length >= 2 && filled.filter((c) => typeof c === 'string' && !parseDate(c)).length >= filled.length / 2) return i;
  }
  return null;
}

export function previewTable(table: unknown[][]): TablePreview | null {
  const headerRowIndex = guessHeaderRow(table);
  if (headerRowIndex === null) return null;
  const headerRow = table[headerRowIndex] ?? [];
  const dataRows = table.slice(headerRowIndex + 1).filter((r) => r && r.some((c) => cellText(c) !== ''));
  const auto = findHeaderRow(table);
  const autoColumns = auto && auto.index === headerRowIndex ? auto.mapping.columns : {};
  const fieldByIndex = new Map(Object.entries(autoColumns).map(([f, i]) => [i as number, f as AdField]));

  const width = Math.max(headerRow.length, ...dataRows.slice(0, 50).map((r) => r.length));
  const columns: PreviewColumn[] = [];
  const usedKeys = new Set<string>();
  for (let index = 0; index < width; index++) {
    const header = cellText(headerRow[index]);
    const values = dataRows.slice(0, 200).map((r) => r[index]).filter((v) => cellText(v) !== '');
    if (!header && !values.length) continue;
    const style = detectDecimalStyle(values) ?? 'comma';
    const numericCount = values.filter((v) => !(v instanceof Date) && parseNumber(v, style).value !== null && !parseDate(v)).length;
    const numeric = values.length > 0 && numericCount / values.length >= 0.6;

    let role: ColumnRole = { kind: 'ignore' };
    const field = fieldByIndex.get(index);
    if (field) role = { kind: 'field', field };
    else if (numeric && header && !RATE_HEADER.test(header)) {
      const key = metricKey(header);
      if (key && !usedKeys.has(key)) {
        usedKeys.add(key);
        role = { kind: 'custom', key, label: metricLabel(header) };
      }
    }
    columns.push({
      index,
      header: header || `Sütun ${index + 1}`,
      key: normalizeHeader(header).key,
      samples: dataRows.slice(0, 3).map((r) => cellText(r[index])),
      numeric,
      role,
    });
  }

  return {
    headerRowIndex,
    columns,
    rows: dataRows.slice(0, SAMPLE_ROWS).map((r) => columns.map((c) => cellText(r[c.index]))),
    platform: detectPlatformFromHeaders(headerRow),
    signature: headerSignature(headerRow.map(cellText)),
  };
}

export type TemplateEntry = { key: string; role: ColumnRole };

/** Kayıtlı şablondaki rolleri başlık adına göre uygular; şablonda olmayan sütun önerisini korur. */
export function applyTemplate(columns: PreviewColumn[], template: TemplateEntry[]): PreviewColumn[] {
  const byKey = new Map(template.map((t) => [t.key, t.role]));
  return columns.map((c) => (c.key && byKey.has(c.key) ? { ...c, role: byKey.get(c.key)! } : c));
}

export function templateFromColumns(columns: { key: string; role: ColumnRole }[]): TemplateEntry[] {
  return columns.filter((c) => c.key).map((c) => ({ key: c.key, role: c.role }));
}

const KNOWN_FIELDS = new Set(Object.keys(FIELD_ALIASES));

/**
 * Kullanıcının seçtiği rollerden okuma eşlemesi üretir. Bir alan iki sütuna atanmışsa veya
 * özel metrik anahtarı tekrar ediyorsa hata döner.
 */
export function mappingFromRoles(headerRowIndex: number, roles: { index: number; role: ColumnRole }[]): ColumnMapping | { error: string } {
  const fields: Partial<Record<AdField, number>> = {};
  const custom: ColumnMapping['custom'] = [];
  const keys = new Set<string>();
  for (const { index, role } of roles) {
    if (role.kind === 'field') {
      if (!KNOWN_FIELDS.has(role.field)) return { error: 'Bilinmeyen alan.' };
      if (fields[role.field] !== undefined) return { error: 'Aynı alan birden fazla sütuna atanmış.' };
      fields[role.field] = index;
    } else if (role.kind === 'custom') {
      const key = metricKey(role.key);
      const label = String(role.label ?? '').trim().slice(0, 60);
      if (!key || !label) return { error: 'Özel metrik için ad gerekli.' };
      if (keys.has(key)) return { error: `"${label}" adında iki özel metrik var; adları farklı olmalı.` };
      keys.add(key);
      custom.push({ index, key, label });
    }
  }
  return { headerRowIndex, fields, custom };
}
