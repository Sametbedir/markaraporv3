'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, Plus, Trash2, Globe, CheckCircle2, XCircle, AlertTriangle, Clock, X, ShieldCheck, ShieldAlert,
  Pause, Play, RefreshCw, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MonitorSummary } from '@/lib/uptime/summary';
import { formatDuration } from '@/lib/uptime/stats';

const REFRESH_MS = 60_000;

const STATUS = {
  up: { label: 'Çalışıyor', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
  warning: { label: 'Uyarı', icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400' },
  down: { label: 'Erişilemiyor', icon: XCircle, cls: 'text-rose-600 dark:text-rose-400' },
} as const;

const pct = (v: number | null) => (v === null ? '—' : `%${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`);
const ms = (v: number | null) => (v === null ? '—' : `${Math.round(v).toLocaleString('tr-TR')} ms`);
const dt = (iso: string) => new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? 'İşlem başarısız');
  return data;
}

/** Son kontrollerin yanıt süresi; erişilemeyen kontroller kırmızı çizgi */
function Sparkline({ points }: { points: MonitorSummary['recent'] }) {
  if (points.length < 2) return null;
  const W = 240;
  const H = 36;
  const max = Math.max(1, ...points.map((p) => p.ms ?? 0));
  const step = W / (points.length - 1);
  const y = (v: number) => H - 2 - (v / max) * (H - 4);
  const path = points
    .map((p, i) => (p.ms === null ? null : `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p.ms).toFixed(1)}`))
    .filter(Boolean)
    .join(' ')
    .replace(/^L/, 'M');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-9" role="img" aria-label={`Son ${points.length} kontrolün yanıt süresi`}>
      {points.map((p, i) => (p.status === 'down' ? <line key={i} x1={i * step} x2={i * step} y1={0} y2={H} stroke="#e11d48" strokeOpacity={0.5} strokeWidth={2} /> : null))}
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
    </svg>
  );
}

function SslBadge({ m }: { m: MonitorSummary }) {
  if (!m.url.startsWith('https://')) return <span className="text-xs text-muted-foreground">SSL yok (http)</span>;
  const s = m.ssl;
  const bad = s.state === 'expired' || s.state === 'invalid';
  const warn = s.state === 'expiring';
  const Icon = bad || warn ? ShieldAlert : ShieldCheck;
  const text =
    s.state === 'expired' ? 'SSL süresi dolmuş'
      : s.state === 'invalid' ? (s.error ?? 'SSL geçersiz')
        : s.state === 'unknown' ? 'SSL henüz okunmadı'
          : `SSL ${s.daysLeft} gün geçerli${s.expires_at ? ` (${new Date(s.expires_at).toLocaleDateString('tr-TR')})` : ''}`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${bad ? 'text-rose-600 dark:text-rose-400' : warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} title={s.issuer ? `Sağlayıcı: ${s.issuer}` : undefined}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {text}
    </span>
  );
}

function MonitorCard({ m, onChanged }: { m: MonitorSummary; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const status = m.current ? STATUS[m.current.status as keyof typeof STATUS] : null;

  const run = async (kind: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(kind);
    try {
      await fn();
      if (ok) toast.success(ok);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(null);
  };

  return (
    <li className={`rounded-2xl border bg-card p-5 space-y-4 ${m.alerts.some((a) => a.level === 'critical') ? 'border-rose-500/40' : 'border-border'} ${m.is_active ? '' : 'opacity-70'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {status ? <status.icon className={`w-6 h-6 shrink-0 ${status.cls}`} aria-hidden="true" /> : <Globe className="w-6 h-6 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
              {m.name}
              {!m.is_active && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Duraklatıldı</span>}
            </h3>
            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground break-all">{m.url}</a>
            <p className={`text-sm mt-1 ${status?.cls ?? 'text-muted-foreground'}`}>
              {status ? status.label : 'Henüz kontrol edilmedi'}
              {m.current?.status_code ? ` · ${m.current.status_code}` : ''}
              {m.current?.error_message && m.current.status !== 'up' ? ` · ${m.current.error_message}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => run('check', () => call(`/api/uptime/monitors/${m.id}/check`, 'POST'))} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-accent disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${busy === 'check' ? 'animate-spin' : ''}`} /> Şimdi kontrol et
          </button>
          <button onClick={() => run('pause', () => call(`/api/uptime/monitors/${m.id}`, 'PATCH', { is_active: !m.is_active }), m.is_active ? 'Monitör duraklatıldı' : 'Monitör devam ediyor')} disabled={!!busy} aria-label={m.is_active ? 'Duraklat' : 'Devam et'} title={m.is_active ? 'Otomatik kontrolü duraklat' : 'Otomatik kontrole devam et'} className="p-2 rounded-lg hover:bg-accent disabled:opacity-50">
            {m.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => confirm(`"${m.name}" ve tüm kontrol geçmişi silinsin mi?`) && run('delete', () => call(`/api/uptime/monitors/${m.id}`, 'DELETE'), 'Monitör silindi')}
            disabled={!!busy} aria-label="Sil" className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Son 24 saat</dt><dd className="font-semibold tabular-nums">{pct(m.stats.day.percent)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Son 7 gün</dt><dd className="font-semibold tabular-nums">{pct(m.stats.week.percent)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Son 30 gün</dt><dd className="font-semibold tabular-nums">{pct(m.stats.month.percent)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Ort. yanıt (24 sa)</dt><dd className="font-semibold tabular-nums">{ms(m.stats.day.avgResponseMs)}</dd></div>
      </dl>

      <Sparkline points={m.recent} />

      <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
        <SslBadge m={m} />
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {Math.round(m.interval_seconds / 60)} dakikada bir{m.current ? ` · son kontrol ${dt(m.current.checked_at)}` : ''}</span>
      </div>

      <div>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 text-sm text-foreground hover:underline">
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          Kesintiler (30 gün): {m.incidents.length === 0 ? 'yok' : m.incidents.length}
        </button>
        {open && (
          m.incidents.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Son 30 günde kesinti kaydı yok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {m.incidents.map((i) => (
                <li key={i.started_at} className="py-2 flex flex-wrap justify-between gap-2">
                  <span className="text-foreground">
                    {dt(i.started_at)} – {i.ended_at ? dt(i.ended_at) : <strong className="text-rose-600 dark:text-rose-400">sürüyor</strong>}
                  </span>
                  <span className="text-muted-foreground">{formatDuration(i.duration_ms)}{i.reason ? ` · ${i.reason}` : ''}</span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </li>
  );
}

export default function UptimeClient() {
  const [monitors, setMonitors] = useState<MonitorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', interval_seconds: 300, timeout_seconds: 15 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMonitors(await call('/api/uptime/monitors', 'GET'));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    // Arka plan kontrollerinin sonuçlarını görmek için sayfa açıkken dakikada bir yenile
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await call('/api/uptime/monitors', 'POST', form);
      toast.success('Monitör eklendi ve ilk kontrol yapıldı');
      setShowForm(false);
      setForm({ name: '', url: '', interval_seconds: 300, timeout_seconds: 15 });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const alerts = monitors?.flatMap((m) => m.alerts) ?? [];
  const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" /> Uptime Takibi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Siteler uygulama açıkken kendi aralığında otomatik kontrol edilir; SSL sertifikası günde iki kez okunur.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" /> Yeni monitör
          </button>
        )}
      </div>

      {alerts.length > 0 && (
        <section role="alert" aria-label="Uyarılar" className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-1.5">
          {alerts.map((a, i) => (
            <p key={i} className={`flex items-start gap-2 text-sm ${a.level === 'critical' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {a.level === 'critical' ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span><strong>{a.name}:</strong> {a.message}</span>
            </p>
          ))}
        </section>
      )}

      {showForm && (
        <form onSubmit={create} className="rounded-2xl border border-border bg-card p-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Yeni monitör</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Kapat" className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
          </div>
          <div>
            <label htmlFor="m-name" className="text-sm font-medium text-foreground">Ad</label>
            <input id="m-name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mağaza ana sayfa" className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="m-url" className="text-sm font-medium text-foreground">Adres</label>
            <input id="m-url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://ornekmarka.com" className={`${input} mt-1`} />
          </div>
          <div>
            <label htmlFor="m-interval" className="text-sm font-medium text-foreground">Kontrol aralığı</label>
            <select id="m-interval" value={form.interval_seconds} onChange={(e) => setForm({ ...form, interval_seconds: Number(e.target.value) })} className={`${input} mt-1`}>
              {[60, 300, 600, 1800, 3600].map((s) => <option key={s} value={s}>{s < 3600 ? `${s / 60} dakika` : '1 saat'}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="m-timeout" className="text-sm font-medium text-foreground">Zaman aşımı (saniye)</label>
            <input id="m-timeout" type="number" min={1} max={60} value={form.timeout_seconds} onChange={(e) => setForm({ ...form, timeout_seconds: Number(e.target.value) })} className={`${input} mt-1`} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm hover:bg-accent">Vazgeç</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
              {saving ? 'Ekleniyor ve kontrol ediliyor…' : 'Ekle'}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : monitors === null ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : monitors.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="font-medium text-foreground">Henüz monitör yok</p>
          <p className="text-sm text-muted-foreground mt-1">Markanın sitesini ekleyin; erişilebilirlik ve SSL otomatik takip edilir.</p>
        </div>
      ) : (
        <ul className="space-y-4">{monitors.map((m) => <MonitorCard key={m.id} m={m} onChanged={load} />)}</ul>
      )}
    </div>
  );
}
