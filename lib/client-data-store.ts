'use client';

/**
 * client-data-store.ts
 * Offline-first ve kalıcı veri saklama motoru.
 * Sunucu DB uykuda veya erişilemez olduğunda bile yüklenen verilerin
 * anında silinmesini engeller, tarayıcıda kalıcı olarak saklar.
 */

import { DashboardSummary, TrendDataPoint, CampaignPerformance, ChannelBreakdown, MonthlyItem } from './types';

export interface StoredReport {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  sourceType: string;
  rowCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  summary: DashboardSummary;
  trend: TrendDataPoint[];
  campaigns: CampaignPerformance[];
  channels: ChannelBreakdown[];
  monthlyBreakdown?: MonthlyItem[];
}

const STORAGE_KEY = 'markarapor_active_report_v2';
const HISTORY_KEY = 'markarapor_upload_history_v2';

export function saveActiveReport(report: StoredReport): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));

    const history = getUploadHistory();
    const filtered = history.filter((h) => h.id !== report.id);
    filtered.unshift(report);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 20)));

    window.dispatchEvent(new Event('markarapor_data_updated'));
  } catch (e) {
    console.error('Kalıcı veri kaydedilemedi:', e);
  }
}

export function getActiveReport(): StoredReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Kalıcı veri okunamadı:', e);
    return null;
  }
}

export function getUploadHistory(): StoredReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Geçmiş okunamadı:', e);
    return [];
  }
}

export function deleteStoredReport(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getUploadHistory();
    const remaining = history.filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));

    const active = getActiveReport();
    if (active && active.id === id) {
      if (remaining.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining[0]));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    window.dispatchEvent(new Event('markarapor_data_updated'));
  } catch (e) {
    console.error('Rapor silinirken hata:', e);
  }
}

export function clearAllStoredReports(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new Event('markarapor_data_updated'));
  } catch (e) {
    console.error('Tüm raporlar temizlenirken hata:', e);
  }
}
