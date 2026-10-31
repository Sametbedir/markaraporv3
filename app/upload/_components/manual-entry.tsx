'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

/** Sık kullanılan satış/etkileşim metrikleri. Anahtarlar dosya yüklemedeki aynı adlı sütunlarla eşleşir. */
const PRESETS: { key: string; label: string; format: 'number' | 'money'; group: 'satis' | 'dm' | 'musteri' }[] = [
  { key: 'sepeteeklemeler', label: 'Sepete eklemeler', format: 'number', group: 'satis' },
  { key: 'sepettutari', label: 'Sepet tutarı', format: 'money', group: 'satis' },
  { key: 'odemebaslatma', label: 'Ödeme başlatma', format: 'number', group: 'satis' },
  { key: 'sitesiparis', label: 'Site siparişi', format: 'number', group: 'satis' },
  { key: 'siteciro', label: 'Site cirosu', format: 'money', group: 'satis' },
  { key: 'iadetutari', label: 'İade tutarı', format: 'money', group: 'satis' },
  { key: 'dmmesaj', label: 'DM / mesaj sayısı', format: 'number', group: 'dm' },
  { key: 'dmsatis', label: 'DM satışı', format: 'number', group: 'dm' },
  { key: 'dmciro', label: 'DM cirosu', format: 'money', group: 'dm' },
  { key: 'potansiyelmusteriler', label: 'Potansiyel müşteriler (lead)', format: 'number', group: 'musteri' },
  { key: 'yenimusteri', label: 'Yeni müşteri', format: 'number', group: 'musteri' },
  { key: 'geridonenmusteri', label: 'Geri dönen müşteri', format: 'number', group: 'musteri' },
  { key: 'takipciartisi', label: 'Takipçi artışı', format: 'number', group: 'musteri' },
];

const STANDARD = [
  { key: 'spend', label: 'Reklam harcaması', money: true },
  { key: 'conversionValue', label: 'Dönüşüm değeri (reklam platformu)', money: true },
  { key: 'conversions', label: 'Dönüşüm / satın alma (platform)', money: false },
  { key: 'impressions', label: 'Gösterim', money: false },
  { key: 'clicks', label: 'Tıklama', money: false },
  { key: 'reach', label: 'Erişim', money: false },
];

const PLATFORMS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'Trendyol', 'Hepsiburada', 'Instagram (organik)', 'Web sitesi', 'Mağaza', 'Diğer'];

type Def = { key: string; label: string; kind: string; format: string };
type Extra = { id: number; label: string; value: string; format: 'number' | 'money' };

const today = () => new Date().toISOString().slice(0, 10);
const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

function NumberField({ id, label, value, onChange, money }: { id: string; label: string; value: string; onChange: (v: string) => void; money?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" className={`${input} ${money ? 'pr-8' : ''}`} />
        {money && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₺</span>}
      </div>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5">
      <legend className="px-1 text-sm font-semibold text-foreground">{title}</legend>
      {hint && <p className="text-xs text-muted-foreground mb-3">{hint}</p>}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export default function ManualEntry({ onSaved }: { onSaved: () => void }) {
  const [period, setPeriod] = useState<'day' | 'range'>('day');
  const [date, setDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [platform, setPlatform] = useState('Meta Ads');
  const [campaign, setCampaign] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [brandDefs, setBrandDefs] = useState<Def[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Markanın daha önce tanımlanmış özel metrikleri de alan olarak gelir
  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBrandDefs((d?.definitions ?? []).filter((x: Def) => x.kind === 'custom')))
      .catch(() => {});
  }, []);

  const presetKeys = useMemo(() => new Set(PRESETS.map((p) => p.key)), []);
  const brandOnly = brandDefs.filter((d) => !presetKeys.has(d.key));
  const labelFor = (key: string, fallback: string) => brandDefs.find((d) => d.key === key)?.label ?? fallback;

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));
  const filled = Object.values(values).filter((v) => v.trim()).length + extras.filter((x) => x.value.trim()).length;

  const resetValues = () => {
    setValues({});
    setExtras([]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filled) {
      setResult({ ok: false, message: 'En az bir değer girin. Tüm alanlar isteğe bağlıdır.' });
      return;
    }
    setSaving(true);
    setResult(null);
    const custom = [
      ...PRESETS.map((p) => ({ key: p.key, label: labelFor(p.key, p.label), value: values[`c:${p.key}`] ?? '', format: p.format })),
      ...brandOnly.map((d) => ({ key: d.key, label: d.label, value: values[`c:${d.key}`] ?? '', format: d.format })),
      ...extras.map((x) => ({ label: x.label, value: x.value, format: x.format })),
    ].filter((c) => String(c.value).trim());
    try {
      const res = await fetch('/api/upload/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          endDate: period === 'range' ? endDate : null,
          platform,
          campaign,
          metrics: Object.fromEntries(STANDARD.map((s) => [s.key, values[s.key] ?? ''])),
          custom,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: data.message ?? 'Kaydedildi.' });
        toast.success('Veri kaydedildi');
        // Tarih, platform ve kampanya kalır: aynı kampanyanın başka gününü hızlıca girmek için
        resetValues();
        onSaved();
        fetch('/api/metrics').then((r) => (r.ok ? r.json() : null)).then((d) => d && setBrandDefs(d.definitions.filter((x: Def) => x.kind === 'custom'))).catch(() => {});
      } else {
        setResult({ ok: false, message: data?.error ?? 'Kaydedilemedi.' });
      }
    } catch {
      setResult({ ok: false, message: 'Bağlantı hatası. Tekrar deneyin.' });
    }
    setSaving(false);
  };

  const presetGroup = (group: 'satis' | 'dm' | 'musteri') =>
    PRESETS.filter((p) => p.group === group).map((p) => (
      <NumberField key={p.key} id={`m-${p.key}`} label={labelFor(p.key, p.label)} money={p.format === 'money'} value={values[`c:${p.key}`] ?? ''} onChange={(v) => set(`c:${p.key}`, v)} />
    ));

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-4 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Dönem">
          {(['day', 'range'] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-sm border ${period === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
              {p === 'day' ? 'Tek gün' : 'Dönem toplamı'}
            </button>
          ))}
          {period === 'range' && (
            <span className="text-xs text-muted-foreground">Toplam, dönemin ilk gününe yazılır: aylık raporda doğru görünür, günlük grafikte tek günde toplanır.</span>
          )}
        </div>
        <div>
          <label htmlFor="m-date" className="block text-xs font-medium text-muted-foreground mb-1">{period === 'day' ? 'Tarih' : 'Başlangıç'}</label>
          <input id="m-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </div>
        {period === 'range' && (
          <div>
            <label htmlFor="m-end" className="block text-xs font-medium text-muted-foreground mb-1">Bitiş</label>
            <input id="m-end" type="date" required min={date} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={input} />
          </div>
        )}
        <div>
          <label htmlFor="m-platform" className="block text-xs font-medium text-muted-foreground mb-1">Kaynak / platform</label>
          <input id="m-platform" list="m-platforms" value={platform} onChange={(e) => setPlatform(e.target.value)} className={input} />
          <datalist id="m-platforms">{PLATFORMS.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div className={period === 'range' ? '' : 'md:col-span-2'}>
          <label htmlFor="m-campaign" className="block text-xs font-medium text-muted-foreground mb-1">Kampanya (isteğe bağlı)</label>
          <input id="m-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder={`${platform || 'Manuel Giriş'} (manuel)`} className={input} />
        </div>
      </div>

      <Group title="Reklam metrikleri" hint="Reklam panelinde gördüğünüz değerler. Boş bırakılan alan 0 sayılmaz, 'veri yok' olarak kalır.">
        {STANDARD.map((s) => (
          <NumberField key={s.key} id={`m-${s.key}`} label={s.label} money={s.money} value={values[s.key] ?? ''} onChange={(v) => set(s.key, v)} />
        ))}
      </Group>

      <Group title="Satış ve sepet">{presetGroup('satis')}</Group>
      <Group title="DM / mesaj">{presetGroup('dm')}</Group>
      <Group title="Müşteri ve etkileşim">{presetGroup('musteri')}</Group>

      {brandOnly.length > 0 && (
        <Group title="Bu markanın diğer metrikleri" hint="Daha önce dosyadan veya elle eklenen metrikler.">
          {brandOnly.map((d) => (
            <NumberField key={d.key} id={`m-${d.key}`} label={d.label} money={d.format === 'money'} value={values[`c:${d.key}`] ?? ''} onChange={(v) => set(`c:${d.key}`, v)} />
          ))}
        </Group>
      )}

      <fieldset className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <legend className="px-1 text-sm font-semibold text-foreground">Yeni metrik</legend>
        <p className="text-xs text-muted-foreground">Listede olmayan her şeyi ekleyebilirsiniz (ör. kupon kullanımı, WhatsApp tıklaması). Eklenen metrik markaya kaydedilir ve Metrikler sayfasında rapora eklenebilir.</p>
        {extras.map((x, i) => (
          <div key={x.id} className="grid gap-2 grid-cols-2 sm:grid-cols-[1fr_8rem_7rem_auto] items-end">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor={`x-label-${x.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Metrik adı</label>
              <input id={`x-label-${x.id}`} value={x.label} maxLength={60} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} placeholder="Kupon kullanımı" className={input} />
            </div>
            <div>
              <label htmlFor={`x-value-${x.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Değer</label>
              <input id={`x-value-${x.id}`} inputMode="decimal" value={x.value} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} className={input} />
            </div>
            <div>
              <label htmlFor={`x-format-${x.id}`} className="block text-xs font-medium text-muted-foreground mb-1">Biçim</label>
              <select id={`x-format-${x.id}`} value={x.format} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, format: e.target.value as Extra['format'] } : y)))} className={input}>
                <option value="number">Sayı</option>
                <option value="money">Para (₺)</option>
              </select>
            </div>
            <button type="button" onClick={() => setExtras(extras.filter((_, j) => j !== i))} aria-label="Metriği kaldır" className="p-2 mb-0.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setExtras([...extras, { id: Date.now(), label: '', value: '', format: 'number' }])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-accent">
          <Plus className="w-4 h-4" /> Metrik ekle
        </button>
      </fieldset>

      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${result.ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
          {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />} {result.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground mr-auto">{filled ? `${filled} alan dolu` : 'Tüm alanlar isteğe bağlı'}</span>
        <button type="button" onClick={resetValues} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm hover:bg-accent">
          <RotateCcw className="w-4 h-4" /> Temizle
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
