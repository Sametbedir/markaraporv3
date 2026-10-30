import { describe, expect, it } from 'vitest';
import { pickBrand, validateBrandInput } from '@/lib/brand-select';

const b = (id: string, archived = false) => ({ id, archivedAt: archived ? new Date() : null });

describe('pickBrand', () => {
  it('çerezdeki markayı seçer', () => {
    expect(pickBrand([b('a'), b('b')], 'b')?.id).toBe('b');
  });
  it('çerezdeki marka başkasına aitse (listede yoksa) ilk markaya düşer', () => {
    expect(pickBrand([b('a'), b('b')], 'baskasinin-markasi')?.id).toBe('a');
  });
  it('çerezdeki marka arşivlenmişse seçmez', () => {
    expect(pickBrand([b('a', true), b('b')], 'a')?.id).toBe('b');
  });
  it('çerez yoksa ilk aktif marka', () => {
    expect(pickBrand([b('a', true), b('b'), b('c')], undefined)?.id).toBe('b');
  });
  it('aktif marka yoksa null', () => {
    expect(pickBrand([b('a', true)], 'a')).toBeNull();
    expect(pickBrand([], null)).toBeNull();
  });
});

describe('validateBrandInput', () => {
  it('ad zorunlu ve kırpılır', () => {
    expect(validateBrandInput({ name: '   ' })).toEqual({ error: 'Marka adı gereklidir.' });
    expect(validateBrandInput({ name: '  Örnek  ' })).toEqual({ data: { name: 'Örnek' } });
  });
  it('güncellemede gönderilmeyen alanlara dokunmaz', () => {
    expect(validateBrandInput({ currency: 'usd' }, true)).toEqual({ data: { currency: 'USD' } });
  });
  it('web sitesine https ekler, boşsa null yapar, geçersizi reddeder', () => {
    expect(validateBrandInput({ name: 'A', website: 'ornek.com' })).toEqual({ data: { name: 'A', website: 'https://ornek.com' } });
    expect(validateBrandInput({ name: 'A', website: '' })).toEqual({ data: { name: 'A', website: null } });
    expect(validateBrandInput({ name: 'A', website: 'olmayan adres' })).toHaveProperty('error');
  });
  it('desteklenmeyen para birimini reddeder', () => {
    expect(validateBrandInput({ name: 'A', currency: 'XYZ' })).toHaveProperty('error');
  });
  it('logo: PNG kabul, SVG ve büyük dosya red, null kaldırır', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(validateBrandInput({ name: 'A', logo_url: png })).toEqual({ data: { name: 'A', logoUrl: png } });
    expect(validateBrandInput({ name: 'A', logo_url: 'data:image/svg+xml;base64,PHN2Zz4=' })).toHaveProperty('error');
    const big = `data:image/png;base64,${'A'.repeat(300 * 1024)}`;
    expect(validateBrandInput({ name: 'A', logo_url: big })).toEqual({ error: 'Logo en fazla 200 KB olabilir.' });
    expect(validateBrandInput({ logo_url: null }, true)).toEqual({ data: { logoUrl: null } });
  });
});
