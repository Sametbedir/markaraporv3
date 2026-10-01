'use client';

import React, { useRef } from 'react';
import { FileDown, X, Printer, CheckCircle, TrendingUp, DollarSign, Wallet, ShoppingCart, BarChart3, Package, Target } from 'lucide-react';
import type { DashboardSummary, CampaignPerformance, ChannelBreakdown } from '@/lib/types';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DashboardSummary | null;
  campaigns: CampaignPerformance[];
  channels: ChannelBreakdown[];
  dateStart: string;
  dateEnd: string;
}

export default function PdfReportModal({
  isOpen,
  onClose,
  summary,
  campaigns,
  channels,
  dateStart,
  dateEnd,
}: PdfReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const fmtCurrency = (n: number) => `₺${Math.round(n).toLocaleString('tr-TR')}`;
  const fmtNumber = (n: number) => Math.round(n).toLocaleString('tr-TR');

  const sStart = dateStart ? new Date(dateStart).toLocaleDateString('tr-TR') : '—';
  const sEnd = dateEnd ? new Date(dateEnd).toLocaleDateString('tr-TR') : '—';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0 animate-fade-in overflow-y-auto">
      {/* Modal Kutusu */}
      <div className="bg-background text-foreground border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:rounded-none">
        {/* Üst Bar (Baskıda Gizlenir) */}
        <div className="sticky top-0 bg-background/90 backdrop-blur border-b border-border p-4 flex items-center justify-between print:hidden z-10">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">E-Ticaret ve Reklam Performans Raporu (PDF Çıktısı)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 rounded-xl shadow font-semibold"
            >
              <Printer className="w-4 h-4" /> PDF Olarak Kaydet / Yazdır
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Yazdırılabilir Rapor Sayfası */}
        <div className="p-8 sm:p-10 space-y-8 bg-card print:bg-white print:text-black print:p-6" id="printable-report">
          {/* Rapor Başlığı */}
          <div className="border-b border-border print:border-neutral-300 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-black uppercase bg-primary text-primary-foreground print:bg-black print:text-white">
                  Marka Raporu
                </span>
                <span className="text-xs text-muted-foreground font-medium">Resmi Ajans Raporu</span>
              </div>
              <h1 className="text-2xl font-black text-foreground print:text-black mt-2 tracking-tight">
                Reklam &amp; Satış Performans Değerlendirmesi
              </h1>
              <p className="text-sm text-muted-foreground print:text-neutral-600 mt-1">
                Tarih Aralığı: <strong className="text-foreground print:text-black">{sStart} – {sEnd}</strong>
              </p>
            </div>
            <div className="text-right sm:text-right print:text-right">
              <span className="text-xs text-muted-foreground print:text-neutral-500 block">Rapor Oluşturma Tarihi</span>
              <span className="text-xs font-semibold text-foreground print:text-black block">
                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Temel KPI Özet Kartları (3x3 Grid) */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-neutral-700 mb-3">
              1. Temel Performans Göstergeleri (KPI)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">Toplam Ciro</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 print:text-black mt-1 block">
                  {summary ? fmtCurrency(summary.total_revenue) : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-red-500/20 bg-red-50/50 dark:bg-red-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">Reklam Harcaması</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400 print:text-black mt-1 block">
                  {summary ? fmtCurrency(summary.total_spend) : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">ROAS (Getiri)</span>
                <span className="text-xl font-bold text-primary print:text-black mt-1 block">
                  {summary ? `${(summary.avg_roas || 0).toFixed(2)}x` : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">Sipariş Sayısı</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 print:text-black mt-1 block">
                  {summary ? fmtNumber(summary.total_orders) : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">AOV (Ort. Sepet)</span>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400 print:text-black mt-1 block">
                  {summary ? fmtCurrency(summary.avg_aov || (summary.total_orders ? summary.total_revenue / summary.total_orders : 0)) : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">CPC (Tık Başı Maliyet)</span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 print:text-black mt-1 block">
                  {summary ? `₺${(summary.avg_cpc || 0).toFixed(2)}` : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">CTR (Tıklama Oranı)</span>
                <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400 print:text-black mt-1 block">
                  {summary ? `%${(summary.avg_ctr || 0).toFixed(2)}` : '—'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20 print:border-neutral-300 print:bg-neutral-50">
                <span className="text-[11px] font-semibold text-muted-foreground print:text-neutral-600 block">Net Kâr / Marj</span>
                <span className="text-xl font-bold text-teal-600 dark:text-teal-400 print:text-black mt-1 block">
                  {summary ? fmtCurrency(summary.total_profit) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Kanal Dağılımı Tablosu */}
          {channels.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-neutral-700 mb-3">
                2. Kanal Dağılımı (Satış &amp; Ciro Dağılımı)
              </h2>
              <div className="border border-border print:border-neutral-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 print:bg-neutral-100 font-bold border-b border-border print:border-neutral-300">
                    <tr>
                      <th className="p-3">Kanal / Platform</th>
                      <th className="p-3 text-right">Sipariş Sayısı</th>
                      <th className="p-3 text-right">Toplam Ciro</th>
                      <th className="p-3 text-right">Ciro Payı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border print:divide-neutral-200">
                    {channels.map((ch, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold text-foreground print:text-black">{ch.channel}</td>
                        <td className="p-3 text-right font-medium">{fmtNumber(ch.order_count)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600 print:text-black">{fmtCurrency(ch.total_revenue)}</td>
                        <td className="p-3 text-right font-medium">%{ch.percentage?.toFixed(1) || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kampanya Performans Tablosu */}
          {campaigns.length > 0 && (
            <div className="page-break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-neutral-700 mb-3">
                3. Kampanya Bazlı Performans Raporu
              </h2>
              <div className="border border-border print:border-neutral-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 print:bg-neutral-100 font-bold border-b border-border print:border-neutral-300">
                    <tr>
                      <th className="p-3">Kampanya Adı</th>
                      <th className="p-3">Platform</th>
                      <th className="p-3 text-right">Harcama</th>
                      <th className="p-3 text-right">Ciro</th>
                      <th className="p-3 text-right">ROAS</th>
                      <th className="p-3 text-right">Tıklama</th>
                      <th className="p-3 text-right">Dönüşüm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border print:divide-neutral-200">
                    {campaigns.slice(0, 15).map((c, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-3 font-medium text-foreground print:text-black max-w-[200px] truncate">{c.campaign_name}</td>
                        <td className="p-3 text-muted-foreground print:text-neutral-600">{c.platform}</td>
                        <td className="p-3 text-right font-medium text-red-600 print:text-black">{fmtCurrency(c.spend)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600 print:text-black">{fmtCurrency(c.revenue)}</td>
                        <td className="p-3 text-right font-bold text-primary print:text-black">{(c.roas || 0).toFixed(2)}x</td>
                        <td className="p-3 text-right font-medium">{fmtNumber(c.clicks)}</td>
                        <td className="p-3 text-right font-medium">{fmtNumber(c.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ajans İmza & Dipnot */}
          <div className="pt-6 border-t border-border print:border-neutral-300 flex items-center justify-between text-xs text-muted-foreground print:text-neutral-500">
            <span>MarkaRapor E-Ticaret ve Performans Pazarlama İstihbarat Platformu</span>
            <span>Sayfa 1 / 1 • Doğrulanmış Veri</span>
          </div>
        </div>
      </div>
    </div>
  );
}
