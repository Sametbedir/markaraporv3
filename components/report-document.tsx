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
import { moneyFormatter, num, trDate, type Money } from '@/lib/report/format';
import { monthLabel } from '@/lib/report/months';
import { percentChange, type ReportKpis } from '@/lib/report/metrics';

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

function kpiRows(c: ReportKpis, p: ReportKpis | null, money: Money) {
  const rows = [
    { label: 'Reklam harcaması', value: money(c.spend), cur: c.spend, prev: p?.spend ?? null, neutral: true, def: 'Dönemdeki toplam reklam harcaması' },
    { label: 'Dönüşüm değeri', value: money(c.conversionValue), cur: c.conversionValue, prev: p?.conversionValue ?? null, def: 'Reklam platformlarının bildirdiği satış değeri' },
    { label: 'ROAS', value: c.roas === null ? '—' : `${num(c.roas, 2)}x`, cur: c.roas, prev: p?.roas ?? null, def: 'Dönüşüm değeri ÷ harcama' },
    { label: 'Dönüşüm', value: num(c.conversions), cur: c.conversions, prev: p?.conversions ?? null, def: 'Platformların bildirdiği satın alma' },
    { label: 'Dönüşüm başı maliyet', value: money(c.cpa, 2), cur: c.cpa, prev: p?.cpa ?? null, lowerIsBetter: true, def: 'Harcama ÷ dönüşüm' },
    { label: 'Gösterim', value: num(c.impressions), cur: c.impressions, prev: p?.impressions ?? null, def: 'Reklamların gösterilme sayısı' },
    { label: 'Tıklama', value: num(c.clicks), cur: c.clicks, prev: p?.clicks ?? null, def: 'Reklam tıklamaları' },
    { label: 'Tıklama oranı (CTR)', value: c.ctr === null ? '—' : `%${num(c.ctr, 2)}`, cur: c.ctr, prev: p?.ctr ?? null, def: 'Tıklama ÷ gösterim' },
    { label: 'Tıklama başı maliyet', value: money(c.cpc, 2), cur: c.cpc, prev: p?.cpc ?? null, lowerIsBetter: true, def: 'Harcama ÷ tıklama' },
  ];
  if (c.storeOrders !== null) {
    rows.push({ label: 'Mağaza siparişi', value: num(c.storeOrders), cur: c.storeOrders, prev: p?.storeOrders ?? null, def: 'Mağazadan gelen sipariş sayısı' });
  }
  return rows;
}

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
            <div className="doc-kpis">
              {kpiRows(c, r.previous, money).map((k) => (
                <div key={k.label} className="doc-kpi">
                  <p className="doc-kpi-label">{k.label}</p>
                  <p className="doc-kpi-value">{k.value}</p>
                  <p className="doc-kpi-change"><ChangeText cur={k.cur} prev={k.prev} lowerIsBetter={k.lowerIsBetter} neutral={k.neutral} /></p>
                </div>
              ))}
            </div>
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

      {/* 3. Trend ve platformlar */}
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

          <H2>Platformlar</H2>
          <table className="doc-table">
            <thead><tr><th>Platform</th><th>Harcama</th><th>Pay</th><th>Dönüşüm</th><th>Dönüşüm değeri</th><th>ROAS</th></tr></thead>
            <tbody>
              {r.platforms.map((p) => (
                <tr key={p.platform}>
                  <td>{p.platform}</td>
                  <td>{money(p.spend)}</td>
                  <td>{p.spendShare === null ? '—' : `%${num(p.spendShare, 1)}`}</td>
                  <td>{num(p.conversions)}</td>
                  <td>{money(p.conversionValue)}</td>
                  <td>{p.roas === null ? '—' : `${num(p.roas, 2)}x`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Page>
      )}

      {/* 4. Kampanyalar */}
      {c && campaigns.length > 0 && (
        <Page footer={footer}>
          <H2>Kampanyalar</H2>
          <p className="doc-caption">Harcamaya göre sıralı; dönemde hareketi olmayan kampanyalar gösterilmez.</p>
          <table className="doc-table">
            <thead><tr><th>Kampanya</th><th>Platform</th><th>Harcama</th><th>Tıklama</th><th>Dönüşüm</th><th>Dönüşüm değeri</th><th>ROAS</th></tr></thead>
            <tbody>
              {campaigns.map((k) => (
                <tr key={`${k.campaign_id}|${k.platform}`}>
                  <td className="doc-wrap">{k.campaign_name}</td>
                  <td>{k.platform}</td>
                  <td>{money(k.spend)}</td>
                  <td>{num(k.clicks)}</td>
                  <td>{num(k.conversions)}</td>
                  <td>{money(k.revenue)}</td>
                  <td>{k.spend ? `${num(k.revenue / k.spend, 2)}x` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        </ul>
        <p className="doc-caption doc-generated">
          {publishedAt ? `Yayınlanma: ${new Date(publishedAt).toLocaleString('tr-TR')}` : 'Taslak — veriler güncellenebilir'} · MarkaRapor
        </p>
      </Page>
    </div>
  );
}
