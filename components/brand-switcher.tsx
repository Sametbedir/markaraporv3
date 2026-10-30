'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { toast } from 'sonner';

export type BrandSummary = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  logo_url: string | null;
  currency: string;
  archived: boolean;
  created_at: string;
};

/** Kenar menüsündeki aktif marka seçici. Marka değişince sayfa yeniden yüklenir; tüm veriler o markaya geçer. */
export default function BrandSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch('/api/brands')
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? 'Markalar yüklenemedi');
        setBrands((body.brands as BrandSummary[]).filter((b) => !b.archived));
        setActiveId(body.active_id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const switchTo = async (id: string) => {
    setSwitching(true);
    const res = await fetch('/api/brands/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    if (!res?.ok) {
      setSwitching(false);
      toast.error('Marka değiştirilemedi');
      return;
    }
    window.location.reload();
  };

  const active = brands.find((b) => b.id === activeId);

  return (
    <div className="mt-4 relative z-10">
      <label htmlFor="brand-switcher" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Aktif marka
      </label>
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          {active?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-background border border-border" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <select
            id="brand-switcher"
            value={activeId}
            disabled={switching || brands.length === 0}
            onChange={(e) => switchTo(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {brands.length === 0 && <option value="">Yükleniyor…</option>}
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}
      <Link href="/brands" onClick={onNavigate} className="mt-1.5 inline-block text-xs text-primary hover:underline">
        Markaları yönet
      </Link>
    </div>
  );
}
