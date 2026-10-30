'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Copy, Ban, Plus, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';

type Section = 'report' | 'goals' | 'uptime';
const SECTION_LABELS: Record<Section, string> = {
  report: 'Aylık performans raporu',
  goals: 'Hedef ilerlemesi',
  uptime: 'Site erişilebilirliği (uptime)',
};

type LinkRow = {
  id: string;
  label: string;
  sections: Section[];
  state: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  created_at: string;
};

const STATE_LABEL = { active: 'Aktif', revoked: 'İptal edildi', expired: 'Süresi doldu' };
const trDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR');

/** Aktif markanın müşteri linkleri: oluştur, kopyala, iptal et. */
export default function ShareLinksPanel() {
  const [brand, setBrand] = useState('');
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ label: string; sections: Section[]; expires_at: string }>({ label: '', sections: ['report'], expires_at: '' });
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/share-links').catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error ?? 'Linkler yüklenemedi');
      return;
    }
    setBrand(data.brand);
    setLinks(data.links);
    setError(null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (s: Section) =>
    setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/share-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      toast.error(data?.error ?? 'Link oluşturulamadı');
      return;
    }
    setNewUrl(`${window.location.origin}${data.path}`);
    setCreating(false);
    setForm({ label: '', sections: ['report'], expires_at: '' });
    load();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link kopyalandı');
    } catch {
      toast.error('Kopyalanamadı; linki elle seçip kopyalayın');
    }
  };

  const revoke = async (l: LinkRow) => {
    if (!confirm(`"${l.label}" iptal edilsin mi? Bu linki açan kişi artık raporu göremez. Geri alınamaz; gerekirse yeni link oluşturursunuz.`)) return;
    const res = await fetch(`/api/share-links/${l.id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) {
      toast.success('Link iptal edildi');
      load();
    } else toast.error('Link iptal edilemedi');
  };

  const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <section aria-labelledby="share-links-title" className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="share-links-title" className="font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" /> Müşteri linkleri{brand && ` · ${brand}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Müşteriniz bu linkle giriş yapmadan yalnızca seçtiğiniz bölümleri görür; menü, diğer markalar ve ayarlar görünmez.
          </p>
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setNewUrl(null); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Link oluştur
          </button>
        )}
      </div>

      {newUrl && (
        <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Link hazır. Şimdi kopyalayın: güvenlik için bir daha gösterilmeyecek.</p>
            <button onClick={() => setNewUrl(null)} aria-label="Kapat" className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-2">
            <input readOnly value={newUrl} onFocus={(e) => e.target.select()} aria-label="Müşteri linki" className={`${input} font-mono text-xs`} />
            <button onClick={() => copy(newUrl)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground shrink-0">
              <Copy className="w-4 h-4" /> Kopyala
            </button>
            <a href={newUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border hover:bg-accent shrink-0">
              <ExternalLink className="w-4 h-4" /> Aç
            </a>
          </div>
        </div>
      )}

      {creating && (
        <form onSubmit={create} className="rounded-xl border border-border p-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="link-label" className="text-sm font-medium text-foreground">Link adı</label>
            <input id="link-label" maxLength={80} placeholder="Örn. Ayşe Hanım – aylık rapor" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="link-expiry" className="text-sm font-medium text-foreground">Bitiş tarihi (isteğe bağlı)</label>
            <input id="link-expiry" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={`${input} mt-1`} />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-foreground">Müşterinin göreceği bölümler</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
                <label key={s} className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={form.sections.includes(s)} onChange={() => toggle(s)} className="w-4 h-4 accent-primary" />
                  {SECTION_LABELS[s]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm hover:bg-accent">Vazgeç</button>
            <button type="submit" disabled={saving || form.sections.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
              {saving ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu marka için henüz link yok.</p>
      ) : (
        <ul className="divide-y divide-border">
          {links.map((l) => (
            <li key={l.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                  {l.label}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${l.state === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {STATE_LABEL[l.state]}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.sections.map((s) => SECTION_LABELS[s]).join(' · ')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Oluşturma {trDate(l.created_at)}
                  {l.expires_at && ` · bitiş ${trDate(l.expires_at)}`}
                  {' · '}
                  {l.last_viewed_at ? `son görüntülenme ${new Date(l.last_viewed_at).toLocaleString('tr-TR')} (${l.view_count} kez)` : 'henüz açılmadı'}
                </p>
              </div>
              {l.state === 'active' && (
                <button onClick={() => revoke(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10">
                  <Ban className="w-4 h-4" /> İptal et
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
