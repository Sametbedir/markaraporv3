'use client';

/**
 * Müşteriye gönderilebilir A4 rapor belgesi.
 *
 * Uygulama temasından bağımsızdır: renkler sabit (her zaman açık zemin), boyutlar A4.
 * Ekranda sayfalar alt alta kart olarak, yazdırmada (PDF) her biri ayrı sayfa olarak çıkar.
 * PNG dışa aktarımı her `.doc-page` öğesini ayrı görüntüye çevirir.
 */

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { ReportDocumentData } from '@/lib/report/document';
import { splitLines } from '@/lib/report/document';
import { reportHighlights } from '@/lib/report/highlights';
import { moneyFormatter, num, trDate } from '@/lib/report/format';
import { monthLabel } from '@/lib/report/months';
import { percentChange } from '@/lib/report/metrics';
import { DOCUMENT_DEFAULT_KPIS, reportKpiItems } from '@/lib/report/kpi-items';
import { campaignTable, comparisonRows, funnel, platformExtras, weeklyBreakdown } from '@/lib/report/insights';

const INK = '#111827';
const MUTED = '#6b7280';
const ACCENT = '#4f46e5';

function Page({ children, footer, className = '' }: { children: React.ReactNode; footer?: string; className?: string }) {
  return (
    <section className={`doc-page ${className}`}>
      <div className="doc-body">{children}</div>
      {footer && <footer className="doc-footer">{footer}</footer>}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="doc-h2">{children}</h2>;
}

function ChangeText({ cur, prev, lowerIsBetter, neutral }: { cur: number | null; prev: number | null; lowerIsBetter?: boolean; neutral?: boolean }) {
  const change = percentChange(cur, prev);
  if (change === null) return <span style={{ color: MUTED }}>Önceki ay: —</span>;
  if (Math.abs(change) < 0.05) return <span style={{ color: MUTED }}>Önceki aya göre değişmedi</span>;
  const up = change >= 0;
  const good = lowerIsBetter ? !up : up;
  const color = neutral ? INK : good ? '#047857' : '#be123c';
  return (
    <span style={{ color }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{change.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}%{' '}
      <span style={{ color: MUTED }}>önceki aya göre</span>
    </span>
  );
}

function ChangeCell({ change, lowerIsBetter, neutral }: { change: number | null; lowerIsBetter?: boolean; neutral?: boolean }) {
  if (change === null) return <span style={{ color: MUTED }}>—</span>;
  if (Math.abs(change) < 0.05) return <span style={{ color: MUTED }}>0%</span>;
  const up = change >= 0;
  const good = lowerIsBetter ? !up : up;
  const color = neutral ? INK : good ? '#047857' : '#be123c';
  return <span style={{ color }}>{up ? '▲ +' : '▼ '}{change.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}%</span>;
}

function ShareBar({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: MUTED }}>—</span>;
  return (
    <span className="doc-share">
      <span className="doc-share-track"><span style={{ width: `${Math.min(100, Math.max(2, value))}%` }} /></span>
      %{num(value, 1)}
    </span>
  );
}

const HERO_KEYS = ['spend', 'conversionValue', 'roas'];

export default function ReportDocument({ data }: { data: ReportDocumentData }) {
  // Grafik metin ölçümü sunucu ve tarayıcıda farklı sonuç verir; yalnızca tarayıcıda çizilir
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { brand, report: r, summary, actions, preparedBy, publishedAt } = data;
  const money = moneyFormatter(r.currency);
  const period = `${trDate(r.start)} – ${trDate(r.end)}`;
  const footer = `${brand.name} · ${monthLabel(r.month)} performans raporu`;
  const c = r.current;
  const highlights = reportHighlights(r, money);
  const actionItems = splitLines(actions);
  const campaigns = r.campaigns;
  const items = c ? reportKpiItems(r, money, DOCUMENT_DEFAULT_KPIS) : [];
  const heroPicked = items.filter((k) => HERO_KEYS.includes(k.key));
  const hero = heroPicked.length ? heroPicked : items.slice(0, 3);
  // Özet sayfası tek A4'e sığsın: varsayılan seçimde 6, markanın kendi seçiminde en fazla 9 ek kart.
  // Diğer metrikler bir sonraki sayfadaki karşılaştırma tablosunda yer alır.
  const rest = items.filter((k) => !hero.includes(k)).slice(0, r.kpiKeys ? 9 : 6);
  const comparison = comparisonRows(r, money);
  const funnelSteps = funnel(r);
  const maxLog = Math.log10(Math.max(10, ...funnelSteps.map((f) => f.value)));
  // Huni adımları çok farklı büyüklükte (milyon gösterim, onlarca satış); çubuklar logaritmik ölçekte
  const funnelWidth = (v: number) => Math.max(6, (Math.log10(Math.max(1, v)) / maxLog) * 100);
  const weeks = weeklyBreakdown(r);
  const bestDay = r.trend.length > 1 ? r.trend.reduce((a, d) => (d.conversionValue > a.conversionValue ? d : a)) : null;
  const campTable = campaignTable(campaigns, 20);
  const platformInfo = platformExtras(campaigns);

  return (
    <div className="report-doc">
      {/* 1. Kapak */}
      <Page className="doc-cover">
        <div className="doc-cover-band" />
        <div className="doc-cover-inner">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={`${brand.name} logosu`} className="doc-logo" />
          ) : (
            <div className="doc-logo doc-logo-fallback">{brand.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</div>
          )}
          <p className="doc-eyebrow">Aylık performans raporu</p>
          <h1 className="doc-title">{brand.name}</h1>
          <p className="doc-subtitle">{monthLabel(r.month)}</p>
          <dl className="doc-cover-meta">
            <div><dt>Dönem</dt><dd>{period}</dd></div>
            {preparedBy && <div><dt>Hazırlayan</dt><dd>{preparedBy}</dd></div>}
            <div>
              <dt>{publishedAt ? 'Yayın tarihi' : 'Durum'}</dt>
              <dd>{publishedAt ? new Date(publishedAt).toLocaleDateString('tr-TR') : <span className="doc-draft">TASLAK</span>}</dd>
            </div>
          </dl>
        </div>
      </Page>

      {/* 2. Yönetici özeti */}
      <Page footer={footer}>
        <H2>Yönetici özeti</H2>
        {c ? (
          <>
            <div className="doc-hero">
              {hero.map((k) => (
                <div key={k.key} className="doc-hero-item">
                  <p className="doc-kpi-label">{k.label}</p>
                  <p className="doc-hero-value">{k.value}</p>
                  <p className="doc-kpi-change"><ChangeText cur={k.cur} prev={k.prev} lowerIsBetter={k.lowerIsBetter} neutral={k.neutral} /></p>
                </div>
              ))}
            </div>
            {rest.length > 0 && (
              <div className="doc-kpis">
                {rest.map((k) => (
                  <div key={k.key} className="doc-kpi">
                    <p className="doc-kpi-label">{k.label}</p>
                    <p className="doc-kpi-value">{k.value}</p>
                    <p className="doc-kpi-change"><ChangeText cur={k.cur} prev={k.prev} lowerIsBetter={k.lowerIsBetter} neutral={k.neutral} /></p>
                  </div>
                ))}
              </div>
            )}
            {r.mixedCurrencies && (
              <p className="doc-note">Bu ayın verileri birden fazla para biriminde; tutarlar simgesiz gösterilmiştir.</p>
            )}
            {highlights.length > 0 && (
              <>
                <h3 className="doc-h3">Öne çıkanlar</h3>
                <ul className="doc-list">{highlights.map((h) => <li key={h}>{h}</li>)}</ul>
              </>
            )}
            {summary.trim() && (
              <>
                <h3 className="doc-h3">Değerlendirme</h3>
                <p className="doc-text">{summary.trim()}</p>
              </>
            )}
          </>
        ) : (
          <p className="doc-text">Bu ay için kayıtlı reklam verisi yok.</p>
        )}
      </Page>

      {/* 3. Ay karşılaştırması */}
      {c && (
        <Page footer={footer}>
          <H2>{r.previous ? `${monthLabel(r.month)} ile önceki ay` : `${monthLabel(r.month)} metrikleri`}</H2>
          <table className="doc-table doc-compare">
            <thead><tr><th>Metrik</th><th className="num">Bu ay</th><th className="num">Önceki ay</th><th className="num">Değişim</th></tr></thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.label}>
                  <td className="doc-wrap">{row.label}</td>
                  <td className="num strong">{row.current}</td>
                  <td className="num">{row.previous}</td>
                  <td className="num"><ChangeCell change={row.change} lowerIsBetter={row.lowerIsBetter} neutral={row.neutral} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!r.previous && <p className="doc-caption">Önceki ay için veri olmadığından değişim hesaplanmadı.</p>}

        </Page>
      )}

      {/* 4. Günlük/haftalık gidişat ve satış hunisi */}
      {c && (
        <Page footer={footer}>
          <H2>Günlük gidişat</H2>
          {r.trend.length > 1 ? (
            <div className="doc-chart" style={{ height: 250 }}>
              {mounted && <AreaChart width={660} height={250} data={r.trend.map((d) => ({ ...d, label: trDate(d.date).slice(0, 5) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={{ stroke: '#d1d5db' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => num(Number(v))} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11, color: INK }} />
                <Area isAnimationActive={false} type="monotone" dataKey="conversionValue" name="Dönüşüm değeri" stroke={ACCENT} fill={ACCENT} fillOpacity={0.12} strokeWidth={2} />
                <Area isAnimationActive={false} type="monotone" dataKey="spend" name="Harcama" stroke="#d97706" fill="#d97706" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>}
            </div>
          ) : (
            <p className="doc-text">Günlük grafik için yeterli veri yok.</p>
          )}
          {bestDay && (
            <p className="doc-caption">
              En yüksek dönüşüm değeri: {trDate(bestDay.date)} ({money(bestDay.conversionValue)}, harcama {money(bestDay.spend)}).
            </p>
          )}

          {weeks.length > 1 && (
            <>
              <H2>Haftalık kırılım</H2>
              <table className="doc-table">
                <thead><tr><th>Hafta</th><th className="num">Harcama</th><th className="num">Dönüşüm değeri</th><th className="num">ROAS</th>{weeks[0].conversions !== null && <><th className="num">Dönüşüm</th><th className="num">Dönüşüm başı maliyet</th></>}</tr></thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.label}>
                      <td>{w.label}</td>
                      <td className="num">{money(w.spend)}</td>
                      <td className="num">{money(w.conversionValue)}</td>
                      <td className="num strong">{w.roas === null ? '—' : `${num(w.roas, 2)}x`}</td>
                      {w.conversions !== null && <><td className="num">{num(w.conversions)}</td><td className="num">{money(w.cpa, 2)}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {funnelSteps.length >= 3 && (
            <>
              <H2>Satış hunisi</H2>
              <div className="doc-funnel">
                {funnelSteps.map((step) => (
                  <div key={step.label} className="doc-funnel-row">
                    <span className="doc-funnel-label">{step.label}</span>
                    <span className="doc-funnel-bar"><span style={{ width: `${funnelWidth(step.value)}%` }} /></span>
                    <span className="doc-funnel-value">{num(step.value)}</span>
                    <span className="doc-funnel-rate">{step.rate === null ? '' : `%${num(step.rate, step.rate < 1 ? 2 : 1)}`}</span>
                  </div>
                ))}
              </div>
              <p className="doc-caption">Yüzdeler bir önceki adıma göre geçiş oranıdır. Sepete ekleme ve ödeme başlatma, yüklenen dosyada veya manuel girişte bu metrikler varsa gösterilir.</p>
            </>
          )}
        </Page>
      )}

      {/* 5. Platformlar ve kampanyalar */}
      {c && (r.platforms.length > 0 || campaigns.length > 0) && (
        <Page footer={footer}>
          {r.platforms.length > 0 && (
            <>
              <H2>Platformlar</H2>
              <table className="doc-table">
                <thead><tr><th>Platform</th><th className="num">Harcama</th><th>Harcama payı</th><th className="num">Tıklama</th><th className="num">Dönüşüm</th><th className="num">Dönüşüm başı maliyet</th><th className="num">Dönüşüm değeri</th><th className="num">ROAS</th></tr></thead>
                <tbody>
                  {r.platforms.map((p) => {
                    const x = platformInfo.get(p.platform);
                    return (
                      <tr key={p.platform}>
                        <td>{p.platform}</td>
                        <td className="num">{money(p.spend)}</td>
                        <td><ShareBar value={p.spendShare} /></td>
                        <td className="num">{num(x?.clicks ?? null)}</td>
                        <td className="num">{num(p.conversions)}</td>
                        <td className="num">{money(x?.cpa ?? null, 2)}</td>
                        <td className="num">{money(p.conversionValue)}</td>
                        <td className="num strong">{p.roas === null ? '—' : `${num(p.roas, 2)}x`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {campaigns.length > 0 && (
            <>
              <H2>Kampanyalar</H2>
              <p className="doc-caption">
                Harcamaya göre sıralı{campTable.other ? `; ilk ${campTable.rows.length} kampanya ayrı, kalanlar tek satırda` : ''}. Dönemde hareketi olmayan kampanyalar gösterilmez.
              </p>
              <table className="doc-table">
                <thead><tr><th>Kampanya</th><th>Platform</th><th className="num">Harcama</th><th className="num">Pay</th><th className="num">Dönüşüm</th><th className="num">Dönüşüm başı maliyet</th><th className="num">Dönüşüm değeri</th><th className="num">ROAS</th></tr></thead>
                <tbody>
                  {[...campTable.rows, ...(campTable.other ? [campTable.other] : [])].map((k, i) => (
                    <tr key={`${k.name}|${k.platform}|${i}`} className={k === campTable.other ? 'doc-row-muted' : ''}>
                      <td className="doc-wrap">{k.name}</td>
                      <td>{k.platform}</td>
                      <td className="num">{money(k.spend)}</td>
                      <td className="num">{k.share === null ? '—' : `%${num(k.share, 1)}`}</td>
                      <td className="num">{num(k.conversions)}</td>
                      <td className="num">{money(k.cpa, 2)}</td>
                      <td className="num">{money(k.revenue)}</td>
                      <td className="num strong">{k.roas === null ? '—' : `${num(k.roas, 2)}x`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Page>
      )}

      {/* 5. Aksiyon planı ve yöntem */}
      <Page footer={footer}>
        {actionItems.length > 0 && (
          <>
            <H2>Aksiyon planı</H2>
            <ol className="doc-actions">{actionItems.map((a, i) => <li key={i}>{a}</li>)}</ol>
          </>
        )}
        <H2>Yöntem ve tanımlar</H2>
        <ul className="doc-list doc-small">
          <li>Veriler reklam platformlarından alınan raporlardan (dosya yükleme veya manuel giriş) derlenmiştir; eksik değerler tahminle doldurulmamıştır.</li>
          <li>&quot;Dönüşüm&quot; ve &quot;dönüşüm değeri&quot; reklam platformlarının kendi ölçümüdür. Mağaza cirosu ve sipariş sayısıyla aynı değildir; platformlar aynı satışı birden fazla kez sayabilir.</li>
          <li>ROAS = dönüşüm değeri ÷ harcama. Dönüşüm başı maliyet = harcama ÷ dönüşüm. CTR = tıklama ÷ gösterim.</li>
          <li>Önceki aya göre değişim, aynı takvim ayının tamamı ile önceki takvim ayının tamamı karşılaştırılarak hesaplanır; önceki ayda değer yoksa gösterilmez.</li>
          <li>&quot;Öne çıkanlar&quot; bölümü rapordaki sayılardan otomatik üretilmiştir; harcaması toplamın %5&apos;inden az olan kampanyalar karşılaştırmaya alınmaz.</li>
          <li>Ortalama sepet = dönüşüm değeri ÷ dönüşüm; dönüşüm oranı = dönüşüm ÷ tıklama. Satış hunisindeki yüzdeler bir önceki adıma göre geçiş oranıdır.</li>
          <li>Haftalar ayın günlerine göre 1–7, 8–14, 15–21, 22–28 ve 29–son gün olarak gruplanmıştır. Dönem toplamı olarak elle girilen veriler dönemin ilk gününde görünür.</li>
        </ul>
        <p className="doc-caption doc-generated">
          {publishedAt ? `Yayınlanma: ${new Date(publishedAt).toLocaleString('tr-TR')}` : 'Taslak — veriler güncellenebilir'} · MarkaRapor
        </p>
      </Page>
    </div>
  );
}
