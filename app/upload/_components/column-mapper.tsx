'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Wand2 } from 'lucide-react';

export type ColumnRole =
  | { kind: 'field'; field: string }
  | { kind: 'custom'; key: string; label: string }
  | { kind: 'ignore' };

export type PreviewColumn = { index: number; header: string; key: string; samples: string[]; numeric: boolean; role: ColumnRole };

export type UploadPreview = {
  sheet_name: string | null;
  sheet_names: string[];
  template_applied: boolean;
  existing_metrics: { key: string; label: string }[];
  headerRowIndex: number;
  columns: PreviewColumn[];
  rows: string[][];
  platform: string | null;
  signature: string;
};

const FIELD_OPTIONS: { value: string; label: string; metric?: boolean }[] = [
  { value: 'date', label: 'Tarih' },
  { value: 'dateEnd', label: 'Bitiş tarihi' },
  { value: 'platform', label: 'Platform' },
  { value: 'campaign', label: 'Kampanya' },
  { value: 'currency', label: 'Para birimi' },
  { value: 'spend', label: 'Reklam harcaması', metric: true },
  { value: 'conversionValue', label: 'Dönüşüm değeri (platform)', metric: true },
  { value: 'conversions', label: 'Dönüşüm / satın alma (platform)', metric: true },
  { value: 'impressions', label: 'Gösterim', metric: true },
  { value: 'clicks', label: 'Tıklama', metric: true },
  { value: 'reach', label: 'Erişim', metric: true },
];

const roleValue = (r: ColumnRole) => (r.kind === 'field' ? r.field : r.kind);

/** Önizlemedeki rollerin geçerliliği: tarih zorunlu, en az bir metrik, alan tekrarı yok. */
export function mappingProblems(columns: PreviewColumn[]): string[] {
  const problems: string[] = [];
  const fields = columns.flatMap((c) => (c.role.kind === 'field' ? [c.role.field] : []));
  if (!fields.includes('date')) problems.push('Bir sütunu "Tarih" olarak seçin.');
  const metricFields = new Set(FIELD_OPTIONS.filter((f) => f.metric).map((f) => f.value));
  if (!fields.some((f) => metricFields.has(f)) && !columns.some((c) => c.role.kind === 'custom')) {
    problems.push('En az bir metrik sütunu (harcama, gösterim… veya özel metrik) seçin.');
  }
  const dup = fields.filter((f, i) => fields.indexOf(f) !== i);
  for (const f of new Set(dup)) problems.push(`"${FIELD_OPTIONS.find((o) => o.value === f)?.label ?? f}" birden fazla sütuna atanmış.`);
  const labels = columns.flatMap((c) => (c.role.kind === 'custom' ? [c.role.label.trim().toLocaleLowerCase('tr-TR')] : []));
  if (labels.some((l) => !l)) problems.push('Özel metriklere ad verin.');
  if (labels.some((l, i) => l && labels.indexOf(l) !== i)) problems.push('İki özel metrik aynı adı taşıyor.');
  return problems;
}

export default function ColumnMapper({
  preview, onChange, onSheetChange,
}: {
  preview: UploadPreview;
  onChange: (columns: PreviewColumn[]) => void;
  onSheetChange: (sheet: string) => void;
}) {
  const problems = mappingProblems(preview.columns);

  const setRole = (index: number, value: string) => {
    onChange(
      preview.columns.map((c) => {
        if (c.index !== index) return c;
        if (value === 'ignore') return { ...c, role: { kind: 'ignore' } };
        if (value === 'custom') {
          const existing = preview.existing_metrics.find((m) => m.key === c.key);
          return { ...c, role: { kind: 'custom', key: c.key || `sutun${c.index + 1}`, label: existing?.label ?? c.header } };
        }
        return { ...c, role: { kind: 'field', field: value } };
      })
    );
  };
  const setLabel = (index: number, label: string) =>
    onChange(preview.columns.map((c) => (c.index === index && c.role.kind === 'custom' ? { ...c, role: { ...c.role, label } } : c)));

  const sel = 'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <section aria-labelledby="mapper-title" className="rounded-2xl border border-border bg-card p-5 space-y-4 text-left">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 id="mapper-title" className="font-semibold text-foreground">Sütunları kontrol edin</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Her sütunun ne olduğunu seçin. Tanınmayan sayısal sütunlar &quot;Özel metrik&quot; olarak önerildi; oran ve ortalama sütunlarını (CPC, CTR, sonuç başı maliyet) toplanamayacakları için yok sayın.
          </p>
        </div>
        {preview.sheet_names.length > 1 && (
          <label className="text-xs text-muted-foreground">
            Sayfa{' '}
            <select value={preview.sheet_name ?? ''} onChange={(e) => onSheetChange(e.target.value)} className="ml-1 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground">
              {preview.sheet_names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {preview.template_applied && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary"><Wand2 className="w-3.5 h-3.5" /> Bu biçimdeki önceki yüklemenizin eşlemesi uygulandı</span>
        )}
        {preview.platform && <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">Tanınan platform: {preview.platform}</span>}
        <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">Başlık satırı: {preview.headerRowIndex + 1}</span>
      </div>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="align-bottom">
              {preview.columns.map((c) => (
                <th key={c.index} scope="col" className="px-2 pb-2 text-left font-normal min-w-[11rem]">
                  <p className="text-xs font-semibold text-foreground truncate max-w-[14rem]" title={c.header}>{c.header}</p>
                  <select aria-label={`"${c.header}" sütunu`} value={roleValue(c.role)} onChange={(e) => setRole(c.index, e.target.value)} className={`${sel} mt-1 ${c.role.kind === 'ignore' ? 'text-muted-foreground' : ''}`}>
                    <option value="ignore">Yok say</option>
                    <optgroup label="Standart alanlar">
                      {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </optgroup>
                    <option value="custom" disabled={!c.numeric && c.role.kind !== 'custom'}>Özel metrik{!c.numeric ? ' (sayısal değil)' : ''}</option>
                  </select>
                  {c.role.kind === 'custom' && (
                    <input aria-label={`"${c.header}" özel metrik adı`} value={c.role.label} maxLength={60} onChange={(e) => setLabel(c.index, e.target.value)} placeholder="Metrik adı" className={`${sel} mt-1`} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {row.map((cell, j) => (
                  <td key={j} className={`px-2 py-1.5 whitespace-nowrap max-w-[14rem] truncate ${preview.columns[j].role.kind === 'ignore' ? 'text-muted-foreground/60' : 'text-foreground'}`}>{cell || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {problems.length ? (
        <ul role="alert" className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
          {problems.map((p) => <li key={p} className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> {p}</li>)}
        </ul>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Eşleme hazır. Bu eşleme aynı biçimdeki sonraki dosyalar için hatırlanır.</p>
      )}
    </section>
  );
}
