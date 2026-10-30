'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Store, Plus, Pencil, Archive, ArchiveRestore, Check, X, ImagePlus, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { BrandSummary } from '@/components/brand-switcher';
import ShareLinksPanel from './share-links-panel';

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
const LOGO_MAX_BYTES = 200 * 1024;

type FormState = { name: string; website: string; industry: string; currency: string; logo_url: string | null };
const emptyForm: FormState = { name: '', website: '', industry: '', currency: 'TRY', logo_url: null };

async function request(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? 'İşlem başarısız');
  return data;
}

function BrandForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (form: FormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Logo PNG, JPEG veya WebP olmalı');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error('Logo en fazla 200 KB olabilir');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo_url: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center gap-4">
        {form.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.logo_url} alt="Logo önizleme" className="w-16 h-16 rounded-xl object-contain bg-background border border-border" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
            <Store className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm cursor-pointer hover:bg-accent focus-within:ring-2 focus-within:ring-primary">
            <ImagePlus className="w-4 h-4" /> Logo seç
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
          </label>
          {form.logo_url && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, logo_url: null }))} className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
              Logoyu kaldır
            </button>
          )}
          <p className="w-full text-xs text-muted-foreground">PNG, JPEG veya WebP, en fazla 200 KB. Raporlarda ve müşteri sayfasında görünür.</p>
        </div>
      </div>
      <div>
        <label htmlFor="brand-name" className="text-sm font-medium text-foreground">Marka adı *</label>
        <input id="brand-name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${input} mt-1`} />
      </div>
      <div>
        <label htmlFor="brand-website" className="text-sm font-medium text-foreground">Web sitesi</label>
        <input id="brand-website" placeholder="ornekmarka.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={`${input} mt-1`} />
      </div>
      <div>
        <label htmlFor="brand-industry" className="text-sm font-medium text-foreground">Sektör</label>
        <input id="brand-industry" placeholder="Örn. giyim, kozmetik" maxLength={80} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={`${input} mt-1`} />
      </div>
      <div>
        <label htmlFor="brand-currency" className="text-sm font-medium text-foreground">Raporlama para birimi</label>
        <select id="brand-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={`${input} mt-1`}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm hover:bg-accent">Vazgeç</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
          {saving ? 'Kaydediliyor…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function BrandsClient() {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await request('/api/brands', 'GET');
      setBrands(data.brands);
      setActiveId(data.active_id);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toPayload = (f: FormState) => ({ name: f.name, website: f.website, industry: f.industry, currency: f.currency, logo_url: f.logo_url });

  const create = async (f: FormState) => {
    await request('/api/brands', 'POST', toPayload(f));
    toast.success(`${f.name} oluşturuldu ve aktif marka yapıldı`);
    // Menüdeki seçici ve tüm sayfalar yeni markaya geçsin
    window.location.reload();
  };

  const update = async (id: string, f: FormState) => {
    await request(`/api/brands/${id}`, 'PATCH', toPayload(f));
    toast.success('Marka güncellendi');
    setEditingId(null);
    if (id === activeId) window.location.reload();
    else load();
  };

  const setArchived = async (b: BrandSummary, archived: boolean) => {
    if (archived && !confirm(`"${b.name}" arşivlensin mi? Verileri silinmez; istediğiniz zaman geri alabilirsiniz.`)) return;
    try {
      await request(`/api/brands/${b.id}`, 'PATCH', { archived });
      toast.success(archived ? 'Marka arşivlendi' : 'Marka geri alındı');
      if (b.id === activeId) window.location.reload();
      else load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const activate = async (id: string) => {
    try {
      await request('/api/brands/active', 'POST', { id });
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const live = brands.filter((b) => !b.archived);
  const archived = brands.filter((b) => b.archived);

  const card = (b: BrandSummary) => {
    const isActive = b.id === activeId;
    if (editingId === b.id) {
      return (
        <li key={b.id} className="rounded-2xl border border-primary/40 bg-card p-5">
          <BrandForm
            initial={{ name: b.name, website: b.website ?? '', industry: b.industry ?? '', currency: b.currency, logo_url: b.logo_url }}
            submitLabel="Kaydet"
            onSubmit={(f) => update(b.id, f)}
            onCancel={() => setEditingId(null)}
          />
        </li>
      );
    }
    return (
      <li key={b.id} className={`rounded-2xl border bg-card p-5 flex flex-col gap-4 ${isActive ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border'} ${b.archived ? 'opacity-70' : ''}`}>
        <div className="flex items-start gap-3">
          {b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-background border border-border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-foreground truncate">{b.name}</h2>
              {isActive && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Aktif</span>}
              {b.archived && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Arşivde</span>}
            </div>
            {b.website && (
              <a href={b.website} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground truncate">
                <Globe className="w-3 h-3 shrink-0" /> {b.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[b.industry, b.currency].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!b.archived && !isActive && (
            <button onClick={() => activate(b.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
              <Check className="w-4 h-4" /> Bu markaya geç
            </button>
          )}
          {!b.archived && (
            <button onClick={() => setEditingId(b.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-accent">
              <Pencil className="w-4 h-4" /> Düzenle
            </button>
          )}
          <button onClick={() => setArchived(b, !b.archived)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent">
            {b.archived ? <><ArchiveRestore className="w-4 h-4" /> Geri al</> : <><Archive className="w-4 h-4" /> Arşivle</>}
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-7 h-7 text-primary" /> Markalar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Her markanın verisi, hedefleri, takipleri ve raporları ayrı tutulur. Menüdeki seçiciyle markalar arasında geçiş yapın.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Yeni marka
          </button>
        )}
      </div>

      {creating && (
        <section aria-label="Yeni marka" className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Yeni marka</h2>
            <button onClick={() => setCreating(false)} aria-label="Kapat" className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <BrandForm initial={emptyForm} submitLabel="Oluştur" onSubmit={create} onCancel={() => setCreating(false)} />
        </section>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">{live.map(card)}</ul>
          {archived.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Arşivlenen markalar</h2>
              <ul className="grid gap-4 md:grid-cols-2">{archived.map(card)}</ul>
            </section>
          )}
        </>
      )}

      {!loading && !error && activeId && <ShareLinksPanel />}

      <p className="text-xs text-muted-foreground">
        Gider yapısı (komisyon, kargo, iade, ürün maliyeti) aktif markaya göre Ayarlar sayfasından girilir.
      </p>
    </div>
  );
}
