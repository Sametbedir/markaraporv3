'use client';

import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, ShoppingCart, BarChart3, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { SimulationResult } from '@/lib/types';

export default function SimulationClient() {
  const [currentBudget, setCurrentBudget] = useState(10000);
  const [newBudget, setNewBudget] = useState(15000);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_budget: currentBudget, new_budget: newBudget }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setResult(null);
        setError(data?.error ?? 'Simülasyon çalıştırılamadı.');
      }
    } catch (e) {
      console.error(e);
      setError('Sunucuya bağlanılamadı.');
    }
    setLoading(false);
  };

  const chartData = result ? [
    { name: 'Harcama', mevcut: currentBudget, projeksiyon: result?.projected_spend ?? 0 },
    { name: 'Ciro', mevcut: (currentBudget * (result?.historical?.avg_roas ?? 0)), projeksiyon: result?.projected_revenue ?? 0 },
    { name: 'Kâr', mevcut: 0, projeksiyon: result?.projected_profit ?? 0 },
  ] : [];

  const confidenceColor = (result?.confidence_score ?? 0) >= 80 ? 'text-green-500' : (result?.confidence_score ?? 0) >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="w-7 h-7 text-primary" /> Bütçe Simülatörü
        </h1>
        <p className="text-sm text-muted-foreground">Bütçe değişikliklerinin etkisini simüle edin</p>
      </div>

      {/* Input area */}
      <div className="card-premium p-6">
        <h3 className="font-semibold text-foreground mb-4">Bütçe Ayarları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Mevcut Aylık Bütçe</label>
            <div className="flex items-center gap-3">
              <input type="range" min={1000} max={200000} step={1000} value={currentBudget}
                onChange={e => setCurrentBudget(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-lg font-bold text-foreground min-w-[100px] text-right">₺{currentBudget.toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Yeni Bütçe (Projeksiyon)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={1000} max={200000} step={1000} value={newBudget}
                onChange={e => setNewBudget(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-lg font-bold text-primary min-w-[100px] text-right">₺{newBudget.toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Değişim: <span className={newBudget >= currentBudget ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>
              {currentBudget > 0 ? ((newBudget - currentBudget) / currentBudget * 100).toFixed(1) : 0}%
            </span>
          </span>
          <button onClick={handleSimulate} disabled={loading} className="btn-primary ml-auto flex items-center gap-1.5">
            {loading ? 'Hesaplanıyor...' : 'Simülasyonu Çalıştır'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="card-premium p-4 text-sm text-destructive border border-destructive/30">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Confidence */}
          <div className="card-premium p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gauge className={`w-6 h-6 ${confidenceColor}`} />
              <span className="text-sm font-medium text-muted-foreground">Güven Skoru</span>
            </div>
            <p className={`text-4xl font-bold ${confidenceColor}`}>{result?.confidence_score ?? 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">{result?.historical?.data_points ?? 0} günlük veri ile hesaplandı</p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tahmini Ciro', value: result?.projected_revenue ?? 0, prefix: '₺', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'Tahmini ROAS', value: result?.projected_roas ?? 0, suffix: 'x', icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Tahmini Sipariş', value: result?.projected_orders ?? 0, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Tahmini Kâr', value: result?.projected_profit ?? 0, prefix: '₺', icon: TrendingUp, color: (result?.projected_profit ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500', bg: (result?.projected_profit ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
            ].map((c, i) => (
              <div key={i} className="card-premium p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${c.bg}`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <p className={`text-xl font-bold ${c.color}`}>{c.prefix ?? ''}{(c.value ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}{c.suffix ?? ''}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card-premium p-6">
            <h3 className="font-semibold text-foreground mb-4">Mevcut vs Projeksiyon</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="mevcut" fill="#A19AD3" name="Mevcut" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projeksiyon" fill="#60B5FF" name="Projeksiyon" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical */}
          <div className="card-premium p-6">
            <h3 className="font-semibold text-foreground mb-3">Geçmiş Verileri (Referans)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ort. ROAS', value: `${(result?.historical?.avg_roas ?? 0).toFixed(2)}x` },
                { label: 'Ort. CTR', value: `${(result?.historical?.avg_ctr ?? 0).toFixed(2)}%` },
                { label: 'Ort. CPC', value: `₺${(result?.historical?.avg_cpc ?? 0).toFixed(2)}` },
                { label: 'Veri Noktası', value: `${result?.historical?.data_points ?? 0} gün` },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
