// Mevcut (eski) ayrıştırıcının bilinen hatalarını belgeler.
// `it.fails` ile işaretli testler hatanın HÂLÂ var olduğunu doğrular; hata düzelince bu testler kırmızıya döner
// ve kaldırılmalıdır. Yeni ayrıştırıcının testleri tests/import/ altındadır.
import { describe, expect, it } from 'vitest';
import { findValue, normalizeHeader, numberFrom } from '@/lib/demo-data';

const SPEND = ['harcama', 'spend', 'cost', 'maliyet', 'amount_spent'];
const REVENUE = ['gelir', 'ciro', 'revenue', 'sales', 'conversion_value', 'purchase_value'];
const ORDERS = ['siparis', 'orders', 'conversions', 'purchases', 'result', 'results'];

function normalizedRow(raw: Record<string, string>) {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [normalizeHeader(k), v]));
}

describe('eski numberFrom', () => {
  it('Türkçe biçimi okur', () => {
    expect(numberFrom('1.234,56')).toBe(1234.56);
  });

  it.fails('İngilizce binlik ayracını okur (bugün 0 döner)', () => {
    expect(numberFrom('1,234.56')).toBe(1234.56);
  });

  it.fails('boş hücreyi 0 ile karıştırmaz (bugün 0 döner)', () => {
    expect(numberFrom('')).toBeNull();
  });
});

describe('eski findValue', () => {
  const meta = normalizedRow({
    'Cost per result': '125',
    'Amount spent (TRY)': '1500',
    'Purchases conversion value': '6000',
    Purchases: '12',
  });

  it.fails('Meta harcamasını "Cost per result" yerine "Amount spent" sütunundan okur', () => {
    expect(findValue(meta, SPEND)).toBe('1500');
  });

  it.fails('Meta dönüşüm değerini ciro olarak bulur', () => {
    expect(findValue(meta, REVENUE)).toBe('6000');
  });

  it.fails('Meta satın alma sayısını dönüşüm değeriyle karıştırmaz', () => {
    expect(findValue(meta, ORDERS)).toBe('12');
  });
});
