/**
 * JPEG sayfa görüntülerinden PDF dosyası üretir (bağımlılıksız, tarayıcıda çalışır).
 *
 * Rapor belgesinin her A4 sayfası yüksek çözünürlükte görüntüye çevrilir ve PDF'e tam sayfa
 * yerleştirilir. Böylece yazdırma penceresi, kenar boşluğu veya "arka plan grafikleri" ayarı
 * gerekmeden ekranda görülenle birebir aynı, indirilebilir bir PDF elde edilir.
 */

export type PdfPage = { jpeg: Uint8Array; width: number; height: number };

const A4_WIDTH_PT = 595.28;
const enc = new TextEncoder();

/** PDF metin dizesi: Türkçe karakterler için UTF-16BE onaltılık */
function pdfText(s: string): string {
  let hex = 'FEFF';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) continue;
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}

export function buildJpegPdf(pages: PdfPage[], meta: { title?: string; author?: string } = {}): Uint8Array {
  if (!pages.length) throw new Error('PDF için en az bir sayfa gerekli');
  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (id: number, body: string | (() => void)) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    if (typeof body === 'string') push(body);
    else body();
    push('\nendobj\n');
  };

  // Nesne numaraları: 1 katalog, 2 sayfalar, 3 bilgi; her sayfa için 3 nesne (sayfa, içerik, görüntü)
  const pageId = (i: number) => 4 + i * 3;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  obj(3, `<< /Producer ${pdfText('MarkaRapor')}${meta.title ? ` /Title ${pdfText(meta.title)}` : ''}${meta.author ? ` /Author ${pdfText(meta.author)}` : ''} >>`);

  pages.forEach((p, i) => {
    // Sayfa genişliği A4; yükseklik görüntü oranından (taşan uzun sayfa kesilmez)
    const h = Math.round(((A4_WIDTH_PT * p.height) / p.width) * 100) / 100;
    const [pid, cid, iid] = [pageId(i), pageId(i) + 1, pageId(i) + 2];
    obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${h}] /Resources << /XObject << /Im0 ${iid} 0 R >> >> /Contents ${cid} 0 R >>`);
    const content = `q ${A4_WIDTH_PT} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    obj(cid, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    obj(iid, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push('\nendstream');
    });
  });

  const size = pageId(pages.length);
  const xrefAt = length;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
