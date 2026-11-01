import { describe, expect, it } from 'vitest';
import { buildJpegPdf } from '@/lib/pdf/jpeg-pdf';

// Geçerli bir JPEG'in başı/sonu yeterli: PDF yapısını (nesneler, xref) doğruluyoruz
const fakeJpeg = (n: number) => new Uint8Array([0xff, 0xd8, ...Array(n).fill(0x11), 0xff, 0xd9]);
const latin = (b: Uint8Array) => Buffer.from(b).toString('latin1');

describe('JPEG → PDF', () => {
  const pdf = buildJpegPdf(
    [
      { jpeg: fakeJpeg(50), width: 1588, height: 2246 },
      { jpeg: fakeJpeg(80), width: 1588, height: 3000 },
    ],
    { title: 'Örnek Marka · Ekim 2026 raporu' },
  );
  const text = latin(pdf);

  it('PDF başlığı, sayfa sayısı ve bitiş', () => {
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 2');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('xref tablosundaki her ofset ilgili nesnenin başını gösterir', () => {
    const xrefAt = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = [...text.slice(xrefAt).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(9); // 3 genel + 2 sayfa × 3
    entries.forEach((off, i) => expect(text.slice(off, off + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
  });

  it('A4 genişlik; uzun sayfa oranı korunur; görüntü uzunluğu doğru', () => {
    const h = (w: number, hpx: number) => Math.round(((595.28 * hpx) / w) * 100) / 100;
    expect(text).toContain(`/MediaBox [0 0 595.28 ${h(1588, 2246)}]`); // ≈ A4 (841,89)
    expect(h(1588, 2246)).toBeCloseTo(841.9, 0);
    expect(text).toContain(`/MediaBox [0 0 595.28 ${h(1588, 3000)}]`);
    expect(text).toContain('/Width 1588 /Height 3000');
    expect(text).toContain(`/Length ${fakeJpeg(80).length}`);
  });

  it('Türkçe başlık UTF-16 ile yazılır', () => {
    expect(text).toContain('/Title <FEFF00D6');
  });

  it('sayfa yoksa hata', () => {
    expect(() => buildJpegPdf([])).toThrow();
  });
});
