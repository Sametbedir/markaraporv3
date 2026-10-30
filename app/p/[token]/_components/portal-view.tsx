'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Store, FileDown, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle, Target, Activity, BarChart3 } from 'lucide-react';
import type { PortalUptime as UptimeSummary } from '@/lib/uptime/summary';
import { formatDuration } from '@/lib/uptime/stats';
import type { ReportDocumentData } from '@/lib/report/document';
import { splitLines } from '@/lib/report/document';
import { reportHighlights } from '@/lib/report/highlights';
import type { GoalProgressRow } from '@/lib/report/goal-progress';
import type { ShareSection } from '@/lib/share-token';
import { percentChange } from '@/lib/report/metrics';
import { PORTAL_DEFAULT_KPIS, reportKpiItems } from '@/lib/report/kpi-items';
import { monthLabel } from '@/lib/report/months';
import { moneyFormatter, num, trDate } from '@/lib/report/format';

type Props = {
  brand: { name: string; logoUrl: string | null; website: string | null; currency: string };
  sections: ShareSection[];
  months: string[];
  document: ReportDocumentData | null;
  printHref: string | null;
  goals: GoalProgressRow[] | null;
  uptime: UptimeSummary[] | null;
  generatedAt: string;
};

function Change({ current, previous, lowerIsBetter, neutral }: { current: number | null; previous: number | null; lowerIsBetter?: boolean; neutral?: boolean }) {
  const change = percentChange(current, previous);
  if (change === null) return <p className="mt-1 text-xs text-muted-foreground">Önceki ay: —</p>;
  const up = change >= 0;
  const good = lowerIsBetter ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${neutral ? 'text-foreground' : good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {up ? '+' : ''}{change.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}%
      <span className="text-muted-foreground font-normal">önceki aya göre</span>
    </p>
  );
}

function Kpis({ report, money }: { report: ReportDocumentData['report']; money: ReturnType<typeof moneyFormatter> }) {
  const items = reportKpiItems(report, money, PORTAL_DEFAULT_KPIS);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((k) => (
        <div key={k.key} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{k.label}</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground tabular-nums">{k.value}</p>
          <Change current={k.cur} previous={k.prev} lowerIsBetter={k.lowerIsBetter} neutral={k.neutral} />
          <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby={`h-${title}`}>
      <h2 id={`h-${title}`} className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Icon className="w-5 h-5 text-primary" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

const th = 'px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap';
const td = 'px-3 py-2 text-sm text-foreground whitespace-nowrap tabular-nums';

function ReportSection({ doc, months, money, printHref }: { doc: ReportDocumentData | null; months: string[]; money: ReturnType<typeof moneyFormatter>; printHref: string | null }) {
  if (!doc) {
    return (
      <Section icon={BarChart3} title="Aylık performans">
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Henüz yayınlanmış rapor yok.</p>
      </Section>
    );
  }
  const report = doc.report;
  const highlights = reportHighlights(report, money);
  const actionItems = splitLines(doc.actions);
  return (
    <Section icon={BarChart3} title={`Aylık performans · ${monthLabel(report.month)}`}>
      {months.length > 1 && (
        <nav aria-label="Ay seçimi" className="flex gap-2 overflow-x-auto pb-1">
          {months.slice(0, 12).map((m) => (
            <a
              key={m}
              href={`?ay=${m}`}
              aria-current={m === report.month ? 'page' : undefined}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm border ${m === report.month ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'}`}
            >
              {monthLabel(m)}
            </a>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {doc.publishedAt && `Yayın tarihi: ${new Date(doc.publishedAt).toLocaleDateString('tr-TR')}`}
          {doc.preparedBy && ` · Hazırlayan: ${doc.preparedBy}`}
        </p>
        {printHref && (
          <a href={printHref} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
            <FileDown className="w-4 h-4" aria-hidden="true" /> Raporu indir (PDF / PNG)
          </a>
        )}
      </div>

      {(highlights.length > 0 || doc.summary.trim()) && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {highlights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Öne çıkanlar</h3>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground">{highlights.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
          {doc.summary.trim() && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Değerlendirme</h3>
              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{doc.summary.trim()}</p>
            </div>
          )}
        </div>
      )}

      {report.mixedCurrencies && (
        <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Bu ayın verileri birden fazla para biriminde; tutarlar para birimi simgesi olmadan gösterilir ve toplamlar dikkatle yorumlanmalıdır.
        </p>
      )}

      {report.current ? (
        <>
          <Kpis report={report} money={money} />

          {report.trend.length > 1 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Günlük harcama ve dönüşüm değeri</h3>
              <div className="h-64" role="img" aria-label="Günlük harcama ve dönüşüm değeri grafiği">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.trend.map((d) => ({ ...d, label: trDate(d.date).slice(0, 5) }))} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} width={56} tickFormatter={(v) => num(Number(v))} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => money(Number(v))} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="conversionValue" name="Dönüşüm değeri" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="spend" name="Harcama" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {report.platforms.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <table className="w-full">
                <caption className="px-3 pt-3 text-left text-sm font-semibold text-foreground">Platformlar</caption>
                <thead><tr><th className={th}>Platform</th><th className={th}>Harcama</th><th className={th}>Pay</th><th className={th}>Dönüşüm değeri</th><th className={th}>ROAS</th></tr></thead>
                <tbody>
                  {report.platforms.map((p) => (
                    <tr key={p.platform} className="border-t border-border">
                      <td className={td}>{p.platform}</td>
                      <td className={td}>{money(p.spend)}</td>
                      <td className={td}>{p.spendShare === null ? '—' : `%${num(p.spendShare, 1)}`}</td>
                      <td className={td}>{money(p.conversionValue)}</td>
                      <td className={td}>{p.roas === null ? '—' : `${num(p.roas, 2)}x`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.campaigns.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <table className="w-full">
                <caption className="px-3 pt-3 text-left text-sm font-semibold text-foreground">Kampanyalar</caption>
                <thead><tr><th className={th}>Kampanya</th><th className={th}>Platform</th><th className={th}>Harcama</th><th className={th}>Dönüşüm</th><th className={th}>Dönüşüm değeri</th><th className={th}>ROAS</th></tr></thead>
                <tbody>
                  {report.campaigns.slice(0, 25).map((c) => (
                    <tr key={`${c.campaign_id}|${c.platform}`} className="border-t border-border">
                      <td className={`${td} max-w-[16rem] truncate`} title={c.campaign_name}>{c.campaign_name}</td>
                      <td className={td}>{c.platform}</td>
                      <td className={td}>{money(c.spend)}</td>
                      <td className={td}>{num(c.conversions)}</td>
                      <td className={td}>{money(c.revenue)}</td>
                      <td className={td}>{c.spend ? `${num(c.revenue / c.spend, 2)}x` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.campaigns.length > 25 && (
                <p className="px-3 pb-3 text-xs text-muted-foreground">Harcamaya göre ilk 25 kampanya gösteriliyor ({report.campaigns.length} kampanya).</p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Bu ay için veri yok.</p>
      )}

      {actionItems.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Aksiyon planı</h3>
          <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-foreground">{actionItems.map((a, i) => <li key={i}>{a}</li>)}</ol>
        </div>
      )}
    </Section>
  );
}

const GOAL_LABELS: Record<string, string> = { revenue: 'Dönüşüm değeri', spend: 'Harcama', roas: 'ROAS', orders: 'Sipariş', profit: 'Dönüşüm değeri − harcama' };

function GoalsSection({ goals, money }: { goals: GoalProgressRow[]; money: ReturnType<typeof moneyFormatter> }) {
  const fmt = (g: GoalProgressRow, v: number) => (g.targetType === 'roas' ? `${num(v, 2)}x` : g.targetType === 'orders' ? num(v) : money(v));
  return (
    <Section icon={Target} title="Hedefler">
      {goals.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Tanımlı aktif hedef yok.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.max(0, g.percentage);
            return (
              <li key={g.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{GOAL_LABELS[g.targetType] ?? g.targetType}</p>
                  <p className="text-xs text-muted-foreground">{trDate(g.startDate)} – {trDate(g.endDate)}</p>
                </div>
                <p className="mt-2 text-sm text-foreground tabular-nums">
                  {fmt(g, g.currentValue)} <span className="text-muted-foreground">/ {fmt(g, g.targetValue)}</span>
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Hedef ilerlemesi">
                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">%{num(pct, 0)} tamamlandı</p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

const STATUS = {
  up: { label: 'Çalışıyor', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
  warning: { label: 'Uyarı', icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400' },
  down: { label: 'Erişilemiyor', icon: XCircle, cls: 'text-rose-600 dark:text-rose-400' },
} as const;

function UptimeSection({ uptime }: { uptime: UptimeSummary[] }) {
  return (
    <Section icon={Activity} title="Site erişilebilirliği (son 30 gün)">
      {uptime.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Takip edilen site yok.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {uptime.map((m) => {
            const s = m.status ? STATUS[m.status as keyof typeof STATUS] : null;
            return (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground truncate">{m.name}</p>
                  {s ? (
                    <span className={`flex items-center gap-1 text-sm font-medium ${s.cls}`}><s.icon className="w-4 h-4" aria-hidden="true" /> {s.label}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Kontrol yok</span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Erişilebilirlik</dt><dd className="font-semibold tabular-nums">{m.uptimePercent === null ? '—' : `%${num(m.uptimePercent, 2)}`}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Ort. yanıt süresi</dt><dd className="font-semibold tabular-nums">{m.avgResponseMs === null ? '—' : `${num(m.avgResponseMs)} ms`}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Kesinti</dt><dd className="font-semibold tabular-nums">{m.incidents === 0 ? 'Yok' : `${m.incidents} (toplam ${formatDuration(m.downtimeMs)})`}</dd></div>
                  {m.sslState !== 'none' && (
                    <div>
                      <dt className="text-xs text-muted-foreground">SSL sertifikası</dt>
                      <dd className={`font-semibold ${m.sslState === 'ok' ? '' : 'text-amber-600 dark:text-amber-400'}`}>
                        {m.sslState === 'expired' ? 'Süresi dolmuş' : m.sslState === 'invalid' ? 'Geçersiz' : m.sslDaysLeft === null ? '—' : `${m.sslDaysLeft} gün geçerli`}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {m.checks} kontrol{m.checkedAt ? ` · son kontrol ${new Date(m.checkedAt).toLocaleString('tr-TR')}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export default function PortalView({ brand, sections, months, document, printHref, goals, uptime, generatedAt }: Props) {
  const money = moneyFormatter(document ? document.report.currency : brand.currency);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={`${brand.name} logosu`} className="w-12 h-12 rounded-xl object-contain bg-background border border-border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center"><Store className="w-6 h-6 text-muted-foreground" aria-hidden="true" /></div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{brand.name}</h1>
            <p className="text-sm text-muted-foreground">Performans raporu</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {sections.includes('report') && <ReportSection doc={document} months={months} money={money} printHref={printHref} />}
        {sections.includes('goals') && goals && <GoalsSection goals={goals} money={money} />}
        {sections.includes('uptime') && uptime && <UptimeSection uptime={uptime} />}

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground space-y-1">
          {sections.includes('report') && (
            <p>
              Dönüşüm değeri ve dönüşüm sayıları reklam platformlarının bildirdiği değerlerdir; mağaza cirosu ile aynı değildir.
              Önceki aya göre değişim, önceki ayda veri yoksa gösterilmez.
            </p>
          )}
          <p>Güncelleme: {new Date(generatedAt).toLocaleString('tr-TR')} · Bu sayfa salt okunurdur.</p>
        </footer>
      </main>
    </div>
  );
}
