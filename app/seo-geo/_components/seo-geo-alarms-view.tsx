'use client';

import React from 'react';
import { ShieldAlert, Calendar } from 'lucide-react';
import { SeoGeoReportResult } from '@/lib/seo-geo';

interface SeoGeoAlarmsViewProps {
  report: SeoGeoReportResult;
}

export default function SeoGeoAlarmsView({ report }: SeoGeoAlarmsViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive text-destructive-foreground">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                🚨 İleriki Tarih Kötü Gidenleri Takip Sistemi & Alarmlar
              </h3>
              <p className="text-xs text-muted-foreground">
                Verileriniz periyodik olarak taranır; düşüş, organik görünürlük kaybı veya rakip atağı durumunda acil aksiyon sinyali verilir.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground">
            {report.trackingRadar.alarms.length} Aktif Sinyal
          </span>
        </div>

        <p className="text-xs font-medium text-foreground bg-background/60 p-3 rounded-xl border border-border">
          {report.trackingRadar.statusMessage}
        </p>
      </div>

      {/* Alarm Cards */}
      <div className="space-y-3">
        {report.trackingRadar.alarms.map((alarm) => (
          <div
            key={alarm.id}
            className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-destructive/40 transition space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    alarm.riskSeverity === 'Kritik'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {alarm.riskSeverity} Risk
                </span>
                <span className="text-xs font-bold text-foreground">
                  {alarm.category}: {alarm.metric}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-destructive">
                {alarm.change}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tespit Edilen Kötü Gidişat: </strong>
              {alarm.description}
            </p>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary font-medium flex items-start gap-2">
              <span className="font-bold shrink-0">⚡ Acil Alınması Gereken Aksiyon:</span>
              <span>{alarm.immediateAction}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Future Risk Indicators */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
        <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Gelecek Tarih Risk Göstergeleri (Takip Listesi)
        </h4>
        <ul className="space-y-2 text-xs text-muted-foreground">
          {report.trackingRadar.futureRiskIndicators.map((risk, i) => (
            <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
              <span className="text-destructive font-bold">•</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground pt-2">
          ⏱ Tarama Sıklığı: <strong>{report.trackingRadar.monitoringInterval}</strong>
        </p>
      </div>
    </div>
  );
}
