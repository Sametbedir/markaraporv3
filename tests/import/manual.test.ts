import { describe, expect, it } from 'vitest';
import { validateManualEntry } from '@/lib/import/manual';

const ok = (body: unknown) => {
  const r = validateManualEntry(body);
  if ('error' in r) throw new Error(r.error);
  return r.entry;
};

describe('manuel giriş', () => {
  it('tüm alanlar isteğe bağlı; boş alan null kalır (0 değil)', () => {
    const e = ok({ date: '2026-10-05', metrics: { spend: '1.250,50' }, custom: [] });
    expect(e.metrics).toEqual({ spend: 1250.5, conversionValue: null, conversions: null, impressions: null, clicks: null, reach: null });
    expect(e.platform).toBe('Manuel Giriş');
  });
  it('Türkçe ve İngilizce sayı biçimi', () => {
    expect(ok({ date: '2026-10-05', metrics: { conversionValue: '1234.56', clicks: '1.500' } }).metrics).toMatchObject({ conversionValue: 1234.56, clicks: 1500 });
  });
  it('özel metrikler: anahtar dosya sütunuyla eşleşir, tutarlar para biçimi alır, boşlar atlanır', () => {
    const e = ok({
      date: '2026-10-05',
      custom: [
        { key: 'sepeteeklemeler', label: 'Sepete eklemeler', value: '45' },
        { label: 'DM cirosu', value: '12.500' },
        { label: 'Kupon kullanımı', value: '' },
        { label: 'WhatsApp tıklaması', value: '7', format: 'number' },
      ],
    });
    expect(e.custom).toEqual([
      { key: 'sepeteeklemeler', label: 'Sepete eklemeler', format: 'number', value: 45 },
      { key: 'dmcirosu', label: 'DM cirosu', format: 'money', value: 12500 },
      { key: 'whatsapptiklamasi', label: 'WhatsApp tıklaması', format: 'number', value: 7 },
    ]);
  });
  it('yalnızca özel metrik girilebilir', () => {
    expect(ok({ date: '2026-10-05', custom: [{ label: 'Takipçi artışı', value: '30' }] }).custom).toHaveLength(1);
  });
  it('hatalar: değer yok, negatif, okunamayan, adsız metrik, tekrar, ters dönem', () => {
    expect(validateManualEntry({ date: '2026-10-05', metrics: {} })).toEqual({ error: 'En az bir değer girin.' });
    expect(validateManualEntry({ date: '2026-10-05', metrics: { spend: '-5' } })).toHaveProperty('error');
    expect(validateManualEntry({ date: '2026-10-05', metrics: { clicks: 'abc' } })).toHaveProperty('error');
    expect(validateManualEntry({ date: '2026-10-05', custom: [{ label: '', value: '5' }] })).toHaveProperty('error');
    expect(validateManualEntry({ date: '2026-10-05', custom: [{ label: 'Lead', value: '1' }, { label: 'lead', value: '2' }] })).toHaveProperty('error');
    expect(validateManualEntry({ date: '2026-10-05', endDate: '2026-10-01', metrics: { spend: '1' } })).toEqual({ error: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    expect(validateManualEntry({ date: 'dün', metrics: { spend: '1' } })).toEqual({ error: 'Geçerli bir tarih girin.' });
  });
  it('dönem toplamı; aynı gün seçilirse tek gün sayılır; eski istemcinin "revenue" alanı', () => {
    expect(ok({ date: '2026-10-01', endDate: '2026-10-31', metrics: { spend: '9000' } }).endDate).toBe('2026-10-31');
    expect(ok({ date: '2026-10-01', endDate: '2026-10-01', metrics: { spend: '1' } }).endDate).toBeNull();
    expect(ok({ date: '2026-10-01', revenue: '500' }).metrics.conversionValue).toBe(500);
  });
  it('hazır metrik adıyla çakışan özel ad ayrıştırılır', () => {
    expect(ok({ date: '2026-10-01', custom: [{ label: 'Clicks', value: '3' }] }).custom[0].key).toBe('clicks_ozel');
  });
});
