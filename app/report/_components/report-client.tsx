'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, FileDown, FileSpreadsheet, ImageDown, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import type { CampaignPerformance, DashboardSummary, TrendDataPoint } from '@/lib/types';
import {
  ReportKpis,
  activeCampaigns,
  hasActivity,
  kpis,
  percentChange,
  platformBreakdown,
  previousPeriod,
  totalsFromSummary,
} from '@/lib/report/metrics';

type UploadLog = {
  id: string;
  fileName: string;
  fileType: string;
  dateStart: string | null;
  dateEnd: string | null;
  platforms: string | null;
  currency?: string | null;
  createdAt: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const trDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('tr-TR');

const CURRENCY_SYMBOL: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* tarayıcı depolaması kapalı olabilir; not yalnızca bu oturumda kalır */
  }
}

export default function ReportClient() {
  const searchParams = useSearchParams();
  const reportRef = useRef<HTMLDivElement>(null);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [agencyName, setAgencyName] = useState('');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);

  /* ── Başlangıç: URL'deki tarih, yoksa yüklü verinin son 30 günü ── */
  useEffect(() => {
    (async () => {
      const qs = searchParams.get('start_date');
      const qe = searchParams.get('end_date');
      if (qs && qe) {
        setStart(qs);
        setEnd(qe);
      } else {
        const range = await fetch('/api/dashboard/data-range').then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const last = range?.end ? new Date(`${range.end}T00:00:00Z`) : new Date();
        const first = new Date(last.getTime() - 29 * 86400000);
        const dataStart = range?.start ? new Date(`${range.start}T00:00:00Z`) : first;
        setEnd(iso(last));
        setStart(iso(first > dataStart ? first : dataStart));
      }
      setClientName(readStorage('markarapor_report_client'));
      const settings = await fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).catch(() => null);
      setAgencyName(settings?.company_name ?? '');
    })();
  }, [searchParams]);

  const notesKey = `markarapor_report_notes_${start}_${end}`;
  useEffect(() => {
    if (start && end) setNotes(readStorage(notesKey));
  }, [notesKey, start, end]);

  const fetchData = useCallback(async () => {
    if (!start || !end || start > end) return;
    setLoading(true);
    const prev = previousPeriod(start, end);
    const q = (s: string, e: string) => `?start_date=${s}&end_date=${e}`;
    const json = <T,>(url: string, fallback: T): Promise<T> =>
      fetch(url).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
    const [s, p, t, c, l] = await Promise.all([
      json<DashboardSummary | null>(`/api/dashboard/summary${q(start, end)}`, null),
      json<DashboardSummary | null>(`/api/dashboard/summary${q(prev.start, prev.end)}`, null),
      json<TrendDataPoint[]>(`/api/dashboard/trend${q(start, end)}`, []),
      json<CampaignPerformance[]>(`/api/dashboard/campaigns${q(start, end)}`, []),
      json<UploadLog[]>('/api/upload/logs', []),
    ]);
    setSummary(s);
    setPrevSummary(p);
    setTrend(Array.isArray(t) ? t : []);
    setCampaigns(Array.isArray(c) ? c : []);
    setLogs(Array.isArray(l) ? l : []);
    setLoading(false);
  }, [start, end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Türetilmiş veriler ── */
  const totals = totalsFromSummary(summary);
  const prevTotals = totalsFromSummary(prevSummary);
  const current = totals ? kpis(totals) : null;
  const previous = prevTotals && hasActivity(prevTotals) ? kpis(prevTotals) : null;
  const campaignRows = useMemo(() => activeCampaigns(campaigns), [campaigns]);
  const platformRows = useMemo(() => platformBreakdown(campaignRows), [campaignRows]);
  // Sıfır günler de gösterilir (zaman ekseni kesintisiz kalsın); hiç hareket yoksa grafik çizilmez
  const trendRows = useMemo(() => (trend.some((d) => d.spend || d.revenue) ? trend : []), [trend]);

  const sources = useMemo(
    () =>
      logs.filter((l) => l.dateStart && l.dateEnd && l.dateStart.slice(0, 10) <= end && l.dateEnd.slice(0, 10) >= start),
    [logs, start, end]
  );
  const currencies = [...new Set(sources.map((l) => l.currency).filter((c): c is string => !!c))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const symbol = currency ? CURRENCY_SYMBOL[currency] ?? currency : '';

  const money = (v: number | null, digits = 0) =>
    v === null ? '—' : `${symbol}${v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  const num = (v: number | null, digits = 0) =>
    v === null ? '—' : v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const periodLabel = start && end ? `${trDate(start)} – ${trDate(end)}` : '';
  const prev = start && end ? previousPeriod(start, end) : null;
  const fileBase = `MarkaRapor_${(clientName || 'Rapor').replace(/[^\p{L}\p{N}]+/gu, '_')}_${start}_${end}`;

  /* ── Dışa aktarma ── */
  const exportPng = async () => {
    if (!reportRef.current) return;
    setExporting('png');
    try {
      const { toPng } = await import('html-to-image');
      const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
      reportRef.current.classList.add('is-exporting');
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        backgroundColor: bg,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileBase}.png`;
      a.click();
      toast.success('PNG indirildi.');
    } catch (e) {
      console.error(e);
      toast.error('PNG oluşturulamadı. Sayfayı yenileyip tekrar deneyin.');
    } finally {
      reportRef.current?.classList.remove('is-exporting');
    }
    setExporting(null);
  };

  const exportExcel = async () => {
    if (!current) return;
    setExporting('xlsx');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const kpiRows = kpiDefinitions(current, previous).map((k) => ({
        Metrik: k.label,
        'Bu dönem': k.raw,
        'Önceki dönem': k.prevRaw,
        'Değişim (%)': k.change === null ? null : Math.round(k.change * 10) / 10,
        Formül: k.formula,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Metrik: 'Müşteri', 'Bu dönem': clientName || '' },
        { Metrik: 'Dönem', 'Bu dönem': periodLabel },
        { Metrik: 'Önceki dönem', 'Bu dönem': prev ? `${trDate(prev.start)} – ${trDate(prev.end)}` : '' },
        { Metrik: 'Para birimi', 'Bu dönem': currency ?? 'Belirtilmemiş' },
        {},
        ...kpiRows,
      ]), 'Özet');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(platformRows.map((p) => ({
        Platform: p.platform, Harcama: p.spend, 'Dönüşüm değeri (platform)': p.conversionValue,
        Dönüşüm: p.conversions, ROAS: p.roas, 'Harcama payı (%)': p.spendShare,
      }))), 'Platformlar');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(campaignRows.map((c) => ({
        Kampanya: c.campaign_name, Platform: c.platform, Harcama: c.spend, 'Dönüşüm değeri (platform)': c.revenue,
        Dönüşüm: c.conversions, ROAS: c.spend ? c.revenue / c.spend : null, Gösterim: c.impressions, Tıklama: c.clicks,
        'CTR (%)': c.impressions ? (c.clicks / c.impressions) * 100 : null,
      }))), 'Kampanyalar');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendRows.map((d) => ({
        Tarih: d.date, Harcama: d.spend, 'Dönüşüm değeri (platform)': d.revenue, Gösterim: d.impressions, Tıklama: d.clicks,
      }))), 'Günlük');
      if (notes.trim()) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Notlar ve aksiyon planı'], [notes]]), 'Notlar');
      XLSX.writeFile(wb, `${fileBase}.xlsx`);
      toast.success('Excel indirildi.');
    } catch (e) {
      console.error(e);
      toast.error('Excel oluşturulamadı.');
    }
    setExporting(null);
  };

  const hasData = hasActivity(totals);

  return (
    <div className="space-y-6">
      {/* ── Kontroller (çıktıya girmez) ── */}
      <div className="print-hidden flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Müşteri Raporu</h1>
          <p className="text-sm text-muted-foreground">Dönemi seçin, notlarınızı ekleyin ve PDF, PNG veya Excel olarak dışa aktarın.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-muted-foreground">
            Müşteri / marka
            <input
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); writeStorage('markarapor_report_client', e.target.value); }}
              placeholder="Örn. Marka adı"
              className="input-field mt-1 w-44 py-2"
            />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            Başlangıç
            <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className="input-field mt-1 w-40 py-2" />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            Bitiş
            <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="input-field mt-1 w-40 py-2" />
          </label>
          <button type="button" onClick={fetchData} className="btn-secondary px-3 py-2" aria-label="Verileri yenile">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="print-hidden flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} disabled={!hasData} className="btn-primary gap-2 py-2">
          <FileDown className="h-4 w-4" /> PDF olarak kaydet
        </button>
        <button type="button" onClick={exportPng} disabled={!hasData || exporting !== null} className="btn-secondary gap-2 py-2">
          <ImageDown className="h-4 w-4" /> {exporting === 'png' ? 'Hazırlanıyor…' : 'PNG indir'}
        </button>
        <button type="button" onClick={exportExcel} disabled={!hasData || exporting !== null} className="btn-secondary gap-2 py-2">
          <FileSpreadsheet className="h-4 w-4" /> {exporting === 'xlsx' ? 'Hazırlanıyor…' : 'Excel indir'}
        </button>
        <p className="w-full text-xs text-muted-foreground">
          PDF için açılan yazdırma penceresinde “Hedef: PDF olarak kaydet” seçin.
        </p>
      </div>

      {start && end && start > end && (
        <div role="alert" className="card-premium p-4 text-sm text-destructive">Başlangıç tarihi bitiş tarihinden sonra olamaz.</div>
      )}

      {/* ── Rapor (dışa aktarılan alan) ── */}
      <div ref={reportRef} className="report-sheet space-y-6 rounded-2xl bg-background">
        {/* Başlık */}
        <header className="card-premium flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2.5">
              <BarChart3 className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reklam Performans Raporu</p>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{clientName || 'Müşteri adı girilmedi'}</h2>
            </div>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold text-foreground">{periodLabel}</p>
            {prev && <p className="text-xs text-muted-foreground">Karşılaştırma: {trDate(prev.start)} – {trDate(prev.end)}</p>}
            {agencyName && <p className="text-xs text-muted-foreground">Hazırlayan: {agencyName}</p>}
          </div>
        </header>

        {loading ? (
          <div className="card-premium flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !hasData || !current ? (
          <div className="card-premium p-10 text-center text-sm text-muted-foreground">
            Bu dönemde veri yok. Tarih aralığını değiştirin veya önce “Veri Yükle” sayfasından dosya yükleyin.
          </div>
        ) : (
          <>
            {/* KPI'lar */}
            <section aria-labelledby="kpi-title">
              <h3 id="kpi-title" className="section-title mb-3">Özet metrikler</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {kpiDefinitions(current, previous).map((k) => (
                  <div key={k.label} className="card-premium p-4">
                    <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{k.format(k.raw, money, num)}</p>
                    <ChangeBadge change={k.change} lowerIsBetter={k.lowerIsBetter} neutral={k.neutral} />
                  </div>
                ))}
              </div>
            </section>

            {/* Trend */}
            {trendRows.length > 1 && (
              <section className="card-premium p-6" aria-labelledby="trend-title">
                <h3 id="trend-title" className="section-title mb-4">Günlük harcama ve dönüşüm değeri</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="reportValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(d: string) => d.slice(5).split('-').reverse().join('.')} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} width={60} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => money(v)} labelFormatter={(d: string) => trDate(d)} />
                      <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="revenue" name="Dönüşüm değeri (platform)" stroke="#6366f1" fill="url(#reportValue)" strokeWidth={2} isAnimationActive={false} />
                      <Area type="monotone" dataKey="spend" name="Harcama" stroke="#f43f5e" fill="transparent" strokeWidth={2} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Platformlar */}
            {platformRows.length > 0 && (
              <section className="card-premium overflow-hidden" aria-labelledby="platform-title">
                <h3 id="platform-title" className="section-title p-6 pb-3">Platform kırılımı</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-6 py-2 text-left font-medium">Platform</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Harcama</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Pay</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Dönüşüm değeri</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Dönüşüm</th>
                        <th scope="col" className="px-6 py-2 text-right font-medium">ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformRows.map((p) => (
                        <tr key={p.platform} className="border-t border-border">
                          <td className="px-6 py-2 font-medium text-foreground">{p.platform}</td>
                          <td className="px-4 py-2 text-right">{money(p.spend)}</td>
                          <td className="px-4 py-2 text-right">{p.spendShare === null ? '—' : `%${num(p.spendShare, 1)}`}</td>
                          <td className="px-4 py-2 text-right">{money(p.conversionValue)}</td>
                          <td className="px-4 py-2 text-right">{num(p.conversions)}</td>
                          <td className="px-6 py-2 text-right">{p.roas === null ? '—' : `${num(p.roas, 2)}x`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Kampanyalar */}
            {campaignRows.length > 0 && (
              <section className="card-premium overflow-hidden" aria-labelledby="campaign-title">
                <h3 id="campaign-title" className="section-title p-6 pb-3">Kampanyalar</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-6 py-2 text-left font-medium">Kampanya</th>
                        <th scope="col" className="px-4 py-2 text-left font-medium">Platform</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Harcama</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Dönüşüm değeri</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Dönüşüm</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">ROAS</th>
                        <th scope="col" className="px-6 py-2 text-right font-medium">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignRows.map((c) => (
                        <tr key={c.campaign_id} className="border-t border-border">
                          <td className="px-6 py-2 font-medium text-foreground">{c.campaign_name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{c.platform}</td>
                          <td className="px-4 py-2 text-right">{money(c.spend)}</td>
                          <td className="px-4 py-2 text-right">{money(c.revenue)}</td>
                          <td className="px-4 py-2 text-right">{num(c.conversions)}</td>
                          <td className="px-4 py-2 text-right">{c.spend ? `${num(c.revenue / c.spend, 2)}x` : '—'}</td>
                          <td className="px-6 py-2 text-right">{c.impressions ? `%${num((c.clicks / c.impressions) * 100, 2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Notlar */}
            <section className="card-premium p-6" aria-labelledby="notes-title">
              <h3 id="notes-title" className="section-title mb-3">Değerlendirme ve aksiyon planı</h3>
              <textarea
                data-export-ignore="true"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); writeStorage(notesKey, e.target.value); }}
                rows={6}
                placeholder={'Müşteriye iletmek istediğiniz yorumları ve sonraki adımları yazın.\nÖrn: 1) … 2) …'}
                className="input-field print-hidden resize-y"
                aria-label="Değerlendirme ve aksiyon planı"
              />
              {notes.trim() ? (
                <p className="report-notes hidden whitespace-pre-line text-sm text-foreground">{notes}</p>
              ) : (
                <p className="report-notes hidden text-sm text-muted-foreground">Bu dönem için not eklenmedi.</p>
              )}
            </section>

            {/* Yöntem ve kaynaklar */}
            <section className="card-premium p-6 text-xs text-muted-foreground" aria-labelledby="method-title">
              <h3 id="method-title" className="mb-2 text-sm font-semibold text-foreground">Veri kaynakları ve yöntem</h3>
              <ul className="list-disc space-y-1 pl-4">
                <li>“Dönüşüm değeri” ve “dönüşüm”, reklam platformlarının bildirdiği değerlerdir; mağaza cirosu ve sipariş sayısıyla eşitlenmemiştir.</li>
                <li>ROAS = dönüşüm değeri ÷ harcama · Dönüşüm başı maliyet = harcama ÷ dönüşüm · CTR = tıklama ÷ gösterim · CPC = harcama ÷ tıklama.</li>
                <li>Önceki dönem, seçilen dönemle aynı gün sayısındaki bir önceki aralıktır. Önceki dönemde veri yoksa değişim “—” gösterilir.</li>
                <li>Para birimi: {currency ?? (currencies.length > 1 ? `karışık (${currencies.join(', ')}) — toplamlar karşılaştırılamaz` : 'dosyalarda belirtilmemiş')}. Tutarlar yüklenen dosyalardaki gibidir; KDV ayrımı yapılmamıştır.</li>
                {current.storeOrders === null && <li>Mağaza sipariş verisi yüklenmediği için sipariş ve kârlılık metrikleri rapora eklenmedi.</li>}
                {sources.length > 0 && (
                  <li>
                    Kaynak dosyalar:{' '}
                    {sources.map((s) => `${s.fileName} (${trDate(s.dateStart!.slice(0, 10))} – ${trDate(s.dateEnd!.slice(0, 10))})`).join(', ')}
                  </li>
                )}
              </ul>
              <p className="mt-3">Oluşturulma: {new Date().toLocaleString('tr-TR')} · MarkaRapor</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── KPI tanımları: etiket, formül, biçim ─── */
type Fmt = (v: number | null, digits?: number) => string;
function kpiDefinitions(c: ReportKpis, p: ReportKpis | null) {
  const defs: {
    label: string;
    raw: number | null;
    prevRaw: number | null;
    formula: string;
    lowerIsBetter?: boolean;
    /** Artış ya da azalış tek başına iyi/kötü sayılmaz (örn. harcama) */
    neutral?: boolean;
    format: (v: number | null, money: Fmt, num: Fmt) => string;
  }[] = [
    { label: 'Reklam harcaması', raw: c.spend, prevRaw: p?.spend ?? null, formula: 'Toplam harcama', neutral: true, format: (v, m) => m(v) },
    { label: 'Dönüşüm değeri (platform)', raw: c.conversionValue, prevRaw: p?.conversionValue ?? null, formula: 'Platformun bildirdiği toplam', format: (v, m) => m(v) },
    { label: 'ROAS', raw: c.roas, prevRaw: p?.roas ?? null, formula: 'Dönüşüm değeri ÷ harcama', format: (v, _m, n) => (v === null ? '—' : `${n(v, 2)}x`) },
    { label: 'Dönüşüm (platform)', raw: c.conversions, prevRaw: p?.conversions ?? null, formula: 'Platformun bildirdiği toplam', format: (v, _m, n) => n(v) },
    { label: 'Dönüşüm başı maliyet', raw: c.cpa, prevRaw: p?.cpa ?? null, formula: 'Harcama ÷ dönüşüm', lowerIsBetter: true, format: (v, m) => m(v, 2) },
    { label: 'Gösterim', raw: c.impressions, prevRaw: p?.impressions ?? null, formula: 'Toplam gösterim', format: (v, _m, n) => n(v) },
    { label: 'Tıklama', raw: c.clicks, prevRaw: p?.clicks ?? null, formula: 'Toplam tıklama', format: (v, _m, n) => n(v) },
    { label: 'CTR', raw: c.ctr, prevRaw: p?.ctr ?? null, formula: 'Tıklama ÷ gösterim × 100', format: (v, _m, n) => (v === null ? '—' : `%${n(v, 2)}`) },
    { label: 'CPC', raw: c.cpc, prevRaw: p?.cpc ?? null, formula: 'Harcama ÷ tıklama', lowerIsBetter: true, format: (v, m) => m(v, 2) },
  ];
  if (c.storeOrders !== null) {
    defs.push({ label: 'Mağaza siparişi', raw: c.storeOrders, prevRaw: p?.storeOrders ?? null, formula: 'Mağazadan gelen sipariş sayısı', format: (v, _m, n) => n(v) });
  }
  return defs.map((d) => ({ ...d, change: percentChange(d.raw, d.prevRaw) }));
}

function ChangeBadge({ change, lowerIsBetter, neutral }: { change: number | null; lowerIsBetter?: boolean; neutral?: boolean }) {
  if (change === null) return <p className="mt-1 text-xs text-muted-foreground">Önceki dönem: —</p>;
  const up = change >= 0;
  const good = lowerIsBetter ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={`mt-1 flex flex-wrap items-center gap-x-1 text-xs font-medium ${neutral ? 'text-foreground' : good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {up ? '+' : ''}
      {change.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}% <span className="text-muted-foreground">önceki döneme göre</span>
    </p>
  );
}
