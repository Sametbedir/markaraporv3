'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Target, Plus, Trash2, Trophy, Medal, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GoalProgress } from '@/lib/types';

const targetTypeLabels: Record<string, string> = {
  revenue: 'Ciro', spend: 'Harcama', roas: 'ROAS', orders: 'Sipariş', profit: 'Kâr',
};

function getProgressColor(pct: number) {
  if (pct >= 100) return 'bg-violet-500';
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getBadge(pct: number) {
  if (pct >= 100) return { icon: Trophy, label: 'Hedef Tamam!', color: 'text-violet-500' };
  if (pct >= 75) return { icon: Medal, label: 'Harika Gidiyor!', color: 'text-green-500' };
  if (pct >= 50) return { icon: Star, label: 'Yarı Yolda', color: 'text-yellow-500' };
  return null;
}

export default function GoalsClient() {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periodType: 'monthly', targetType: 'revenue', targetValue: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [celebrated, setCelebrated] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, progressRes] = await Promise.all([
        fetch('/api/goals').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/goals/progress').then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      const progressArr: any[] = progressRes ?? [];
      const progressMap: Record<string, any> = {};
      for (const p of progressArr) {
        if (p?.id) progressMap[p.id] = p;
      }
      const merged = (goalsRes ?? []).map((g: any) => {
        const p: any = progressMap[g?.id] ?? null;
        return { ...(g ?? {}), currentValue: p?.currentValue ?? 0, percentage: p?.percentage ?? 0 };
      });
      setGoals(merged);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleCreate = async () => {
    if (!form.targetValue || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, targetValue: Number(form.targetValue) }),
      });
      if (res.ok) { setShowForm(false); setForm({ periodType: 'monthly', targetType: 'revenue', targetValue: '', startDate: '', endDate: '' }); fetchGoals(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/goals/${id}`, { method: 'DELETE' }); fetchGoals(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-7 h-7 text-primary" /> Hedeflerim
          </h1>
          <p className="text-sm text-muted-foreground">Performans hedeflerinizi belirleyin ve takip edin</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Yeni Hedef
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
                <h3 className="text-lg font-semibold text-foreground">Yeni Hedef Oluştur</h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Periyot</label>
                  <select value={form.periodType} onChange={e => setForm({ ...form, periodType: e.target.value })} className="input-field">
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                    <option value="quarterly">3 Aylık</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Hedef Tipi</label>
                  <select value={form.targetType} onChange={e => setForm({ ...form, targetType: e.target.value })} className="input-field">
                    <option value="revenue">Ciro</option>
                    <option value="spend">Harcama</option>
                    <option value="roas">ROAS</option>
                    <option value="orders">Sipariş</option>
                    <option value="profit">Kâr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Hedef Değer</label>
                  <input type="number" value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} className="input-field" placeholder="Ör: 100000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Başlangıç</label>
                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Bitiş</label>
                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-field" />
                  </div>
                </div>
                <button onClick={handleCreate} disabled={saving} className="btn-primary w-full">
                  {saving ? 'Kaydediliyor...' : 'Hedefi Oluştur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration animation */}
      <AnimatePresence>
        {celebrated && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
              <p className="text-3xl font-bold text-foreground">Tebrikler! 🎉</p>
              <p className="text-lg text-muted-foreground mt-2">Hedefinize ulaştınız!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-premium p-6 animate-pulse"><div className="h-16 bg-muted rounded" /></div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="card-premium p-12 text-center">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-foreground">Henüz hedef eklenmemiş</p>
          <p className="text-sm text-muted-foreground mt-1">Yukarıdaki "Yeni Hedef" butonuyla başlayın</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal: any, idx: number) => {
            const pct = Math.min(goal?.percentage ?? 0, 100);
            const badge = getBadge(pct);
            return (
              <motion.div key={goal?.id ?? idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }} className="card-premium p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getProgressColor(pct).replace('bg-', 'bg-')}/10`}>
                      <Target className={`w-5 h-5 ${getProgressColor(pct).replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {targetTypeLabels[goal?.targetType] ?? goal?.targetType} Hedefi
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {goal?.periodType === 'weekly' ? 'Haftalık' : goal?.periodType === 'monthly' ? 'Aylık' : '3 Aylık'}
                        {' • '}
                        {goal?.targetValue?.toLocaleString('tr-TR')}
                        {goal?.targetType === 'roas' ? 'x' : goal?.targetType === 'revenue' || goal?.targetType === 'spend' || goal?.targetType === 'profit' ? ' ₺' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {badge && (
                      <div className={`flex items-center gap-1 ${badge.color}`}>
                        <badge.icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{badge.label}</span>
                      </div>
                    )}
                    <button onClick={() => handleDelete(goal?.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getProgressColor(pct)}`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Mevcut: {(goal?.currentValue ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-bold text-foreground">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
