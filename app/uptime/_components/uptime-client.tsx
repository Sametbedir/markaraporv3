'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Plus, Trash2, Globe, CheckCircle, XCircle, Clock, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UptimeMonitor } from '@/lib/types';

export default function UptimeClient() {
  const [monitors, setMonitors] = useState<UptimeMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', interval_seconds: 300, timeout_seconds: 10 });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/uptime/monitors');
      if (res.ok) setMonitors(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMonitors(); }, [fetchMonitors]);

  const handleCreate = async () => {
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      const res = await fetch('/api/uptime/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ name: '', url: '', interval_seconds: 300, timeout_seconds: 10 }); fetchMonitors(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/uptime/monitors/${id}`, { method: 'DELETE' }); fetchMonitors(); } catch (e) { console.error(e); }
  };

  const handleCheck = async (id: string) => {
    setChecking(id);
    try { await fetch(`/api/uptime/monitors/${id}/check`, { method: 'POST' }); fetchMonitors(); } catch (e) { console.error(e); }
    setChecking(null);
  };

  const getStatusIcon = (status: string | undefined) => {
    if (status === 'up') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'down') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" /> Uptime Takibi
          </h1>
          <p className="text-sm text-muted-foreground">Web sitelerinizin erişilebilirliğini izleyin</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Yeni Monitör
        </button>
      </div>

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card-premium p-6 w-full max-w-md" onClick={(e: any) => e?.stopPropagation?.()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Yeni Monitör Ekle</h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Monitör Adı</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Ana Site" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">URL</label>
                  <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="input-field" placeholder="https://example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Kontrol Aralığı (sn)</label>
                    <input type="number" value={form.interval_seconds} onChange={e => setForm({ ...form, interval_seconds: Number(e.target.value) })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Zaman Aşımı (sn)</label>
                    <input type="number" value={form.timeout_seconds} onChange={e => setForm({ ...form, timeout_seconds: Number(e.target.value) })} className="input-field" />
                  </div>
                </div>
                <button onClick={handleCreate} disabled={saving} className="btn-primary w-full">
                  {saving ? 'Ekleniyor...' : 'Monitörü Ekle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monitor list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card-premium p-6 animate-pulse"><div className="h-16 bg-muted rounded" /></div>)}
        </div>
      ) : monitors.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-foreground">Henüz monitör yok</p>
          <p className="text-sm text-muted-foreground mt-1">Yukarıdaki butonla ilk monitörünüzü ekleyin</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monitors.map((mon: any, idx: number) => (
            <motion.div key={mon?.id ?? idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }} className="card-premium p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(mon?.current?.status)}
                  <div>
                    <h3 className="font-semibold text-foreground">{mon?.name ?? 'Monitör'}</h3>
                    <p className="text-xs text-muted-foreground">{mon?.url ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {mon?.current?.response_time_ms != null && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {mon.current.response_time_ms}ms
                    </span>
                  )}
                  {mon?.current?.status_code && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${mon.current.status_code < 400 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {mon.current.status_code}
                    </span>
                  )}
                  <button onClick={() => handleCheck(mon?.id)} disabled={checking === mon?.id}
                    className="btn-secondary text-xs">
                    {checking === mon?.id ? '...' : 'Kontrol Et'}
                  </button>
                  <button onClick={() => handleDelete(mon?.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {mon?.current?.error_message && (
                <p className="text-xs text-red-500 mt-2">{mon.current.error_message}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
