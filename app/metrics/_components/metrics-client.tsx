'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, ArrowUp, ArrowDown, X, Plus, Trash2, RotateCcw, Sigma, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { METRIC_FORMATS } from '@/lib/metrics/catalog';
import { parseFormula } from '@/lib/metrics/formula';

type Def = { key: string; label: string; kind: 'custom' | 'formula'; formula: string | null; format: string };
type Data = {
  brand: string;
  builtin: { key: string; label: string; format: string }[];
  variables: { key: string; label: string }[];
  kpi_keys: string[] | null;
  definitions: Def[];
};

const DEFAULT_KPIS = ['spend', 'conversionValue', 'roas', 'conversions', 'cpa', 'impressions', 'clicks', 'ctr', 'cpc', 'storeOrders'];

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? 'İşlem başarısız');
  return data;
}

const input = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function MetricsClient() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({ label: '', formula: '', format: 'money' });

  const load = useCallback(async () => {
    try {
      const d: Data = await call('/api/metrics', 'GET');
      setData(d);
      setSelected(d.kpi_keys ?? [...DEFAULT_KPIS, ...d.definitions.map((x) => x.key)]);
      setDirty(false);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    data?.builtin.forEach((b) => map.set(b.key, b.label));
    data?.definitions.forEach((d) => map.set(d.key, d.label));
    return map;
  }, [data]);

  const allowed = useMemo(
    () => new Set([...(data?.variables.map((v) => v.key) ?? []), ...(data?.definitions.filter((d) => d.kind === 'custom').map((d) => d.key) ?? [])]),
    [data]
  );
  const formulaCheck = form.formula.trim() ? parseFormula(form.formula, allowed) : null;

  if (error) return <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  const available = [...data.builtin.map((b) => b.key), ...data.definitions.map((d) => d.key)].filter((k) => !selected.includes(k));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...selected];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setSelected(next);
    setDirty(true);
  };

  const saveKpis = async (keys: string[] | null) => {
    try {
      await call('/api/metrics/kpis', 'PUT', { keys });
      toast.success(keys ? 'Rapor metrikleri kaydedildi' : 'Varsayılan metriklere dönüldü');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateDef = async (key: string, patch: Partial<Def>) => {
    try {
      await call(`/api/metrics/${key}`, 'PATCH', patch);
      toast.success('Metrik güncellendi');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await call('/api/metrics', 'POST', form);
      toast.success('Formül metriği eklendi');
      setForm({ label: '', formula: '', format: 'money' });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeFormula = async (d: Def) => {
    if (!confirm(`"${d.label}" silinsin mi? Yalnızca formül tanımı silinir; yüklenen veriler etkilenmez.`)) return;
    try {
      await call(`/api/metrics/${d.key}`, 'DELETE');
      toast.success('Metrik silindi');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const custom = data.definitions.filter((d) => d.kind === 'custom');
  const formulas = data.definitions.filter((d) => d.kind === 'formula');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="w-7 h-7 text-primary" /> Metrikler <span className="text-muted-foreground font-medium">· {data.brand}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Her marka farklı metriklere bakar. Raporda ve müşteri sayfasında hangi metriklerin hangi sırayla görüneceğini seçin, dosyadan gelen özel metrikleri adlandırın, kendi formüllerinizi tanımlayın.
        </p>
      </div>

      {/* Rapor KPI seçimi */}
      <section aria-labelledby="kpi-title" className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 id="kpi-title" className="font-semibold text-foreground">Raporda gösterilecek metrikler</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.kpi_keys ? 'Bu marka için özel seçim kullanılıyor.' : 'Varsayılan seçim kullanılıyor (değeri olan özel metrikler sona eklenir).'}
              {' '}Yayınlanmış raporlar kendi seçimini korur; değişiklik yeniden yayınlayınca yansır.
            </p>
          </div>
          <div className="flex gap-2">
            {data.kpi_keys && (
              <button onClick={() => saveKpis(null)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
                <RotateCcw className="w-4 h-4" /> Varsayılana dön
              </button>
            )}
            <button onClick={() => saveKpis(selected)} disabled={!dirty || selected.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
              Kaydet
            </button>
          </div>
        </div>
        <ol className="space-y-1.5">
          {selected.map((k, i) => (
            <li key={k} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="flex-1 text-sm text-foreground">{labelOf.get(k) ?? k}</span>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${labelOf.get(k)} yukarı`} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label={`${labelOf.get(k)} aşağı`} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => { setSelected(selected.filter((x) => x !== k)); setDirty(true); }} aria-label={`${labelOf.get(k)} kaldır`} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ol>
        {available.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Ekle</p>
            <div className="flex flex-wrap gap-2">
              {available.map((k) => (
                <button key={k} onClick={() => { setSelected([...selected, k]); setDirty(true); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-border hover:bg-accent">
                  <Plus className="w-3.5 h-3.5" /> {labelOf.get(k) ?? k}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Özel metrikler */}
      <section aria-labelledby="custom-title" className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 id="custom-title" className="font-semibold text-foreground flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /> Dosyadan gelen özel metrikler</h2>
        {custom.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Henüz yok. Veri Yükle&apos;de dosya seçtiğinizde tanınmayan sayısal sütunları (ör. potansiyel müşteri, mesaj, sepete ekleme) &quot;Özel metrik&quot; olarak işaretleyebilirsiniz.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {custom.map((d) => <DefRow key={d.key} def={d} onSave={updateDef} />)}
          </ul>
        )}
      </section>

      {/* Formül metrikleri */}
      <section aria-labelledby="formula-title" className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 id="formula-title" className="font-semibold text-foreground flex items-center gap-2"><Sigma className="w-5 h-5 text-primary" /> Formül metrikleri</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dönem toplamları üzerinden hesaplanır. Örn. lead başı maliyet: <code className="px-1 rounded bg-muted">spend / {custom[0]?.key ?? 'leads'}</code>. Payda 0 ise sonuç &quot;—&quot; gösterilir.
          </p>
        </div>
        {formulas.length > 0 && (
          <ul className="divide-y divide-border">
            {formulas.map((d) => <DefRow key={d.key} def={d} onSave={updateDef} onDelete={() => removeFormula(d)} />)}
          </ul>
        )}
        <form onSubmit={createFormula} className="rounded-xl border border-border p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div>
              <label htmlFor="f-label" className="text-sm font-medium text-foreground">Ad</label>
              <input id="f-label" required maxLength={60} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Lead başı maliyet" className={`${input} mt-1 w-full`} />
            </div>
            <div>
              <label htmlFor="f-format" className="text-sm font-medium text-foreground">Biçim</label>
              <select id="f-format" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={`${input} mt-1 w-full`}>
                {METRIC_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="f-formula" className="text-sm font-medium text-foreground">Formül</label>
            <input id="f-formula" required value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} placeholder="spend / leads" className={`${input} mt-1 w-full font-mono`} aria-describedby="f-help" />
            <p id="f-help" className={`mt-1 text-xs ${formulaCheck && 'error' in formulaCheck ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formulaCheck && 'error' in formulaCheck ? formulaCheck.error : 'İşlemler: + − × (*) ÷ (/) ve parantez. Aşağıdaki adlara tıklayarak ekleyin.'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...data.variables, ...custom.map((c) => ({ key: c.key, label: c.label }))].map((v) => (
                <button type="button" key={v.key} onClick={() => setForm((f) => ({ ...f, formula: `${f.formula}${f.formula && !/[\s(]$/.test(f.formula) ? ' ' : ''}${v.key}` }))} className="px-2 py-1 rounded-md text-xs border border-border hover:bg-accent" title={v.label}>
                  <span className="font-mono">{v.key}</span> <span className="text-muted-foreground">· {v.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!formulaCheck || 'error' in formulaCheck || !form.label.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DefRow({ def, onSave, onDelete }: { def: Def; onSave: (key: string, patch: Partial<Def>) => void; onDelete?: () => void }) {
  const [label, setLabel] = useState(def.label);
  const [format, setFormat] = useState(def.format);
  const changed = label.trim() !== def.label || format !== def.format;
  return (
    <li className="py-3 flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-[12rem]">
        <input aria-label="Metrik adı" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} className={`${input} w-full`} />
        <p className="mt-1 text-xs text-muted-foreground font-mono">{def.kind === 'formula' ? `${def.key} = ${def.formula}` : def.key}</p>
      </div>
      <select aria-label="Biçim" value={format} onChange={(e) => setFormat(e.target.value)} className={input}>
        {METRIC_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <button onClick={() => onSave(def.key, { label: label.trim(), format })} disabled={!changed || !label.trim()} className="px-3 py-2 rounded-lg text-sm border border-border hover:bg-accent disabled:opacity-40">Kaydet</button>
      {onDelete && (
        <button onClick={onDelete} aria-label={`${def.label} sil`} className="p-2 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
      )}
    </li>
  );
}
