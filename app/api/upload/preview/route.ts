export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { SUPPORTED_EXTENSIONS, previewUploadedFile } from '@/lib/import/file';
import { type TemplateEntry, applyTemplate } from '@/lib/import/preview';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/upload/preview (file, sheet?) — dosyayı KAYDETMEDEN okur; sütunları, örnek satırları ve
 * önerilen eşlemeyi döndürür. Bu marka aynı başlıklarda bir dosyayı daha önce yüklediyse o eşleme uygulanır.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return NextResponse.json({ error: `".${ext}" formatı desteklenmiyor. CSV, TSV, XLSX veya XLS yükleyin.` }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: 'Dosya boş görünüyor.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Dosya 10 MB sınırını aşıyor.' }, { status: 400 });

  const sheet = formData?.get('sheet');
  let result;
  try {
    result = await previewUploadedFile(await file.arrayBuffer(), ext, typeof sheet === 'string' && sheet ? sheet : undefined);
  } catch (e: any) {
    return NextResponse.json({ error: `Dosya okunamadı: ${e?.message ?? 'Format hatası'}.` }, { status: 400 });
  }
  if (!result.preview) {
    return NextResponse.json({ error: 'Dosyada başlık satırı ve veri bulunamadı.', sheet_names: result.sheetNames }, { status: 400 });
  }

  let preview = result.preview;
  const saved = await prisma.importTemplate.findUnique({
    where: { brandId_signature: { brandId: ctx.brandId, signature: preview.signature } },
  });
  let templateApplied = false;
  if (saved) {
    try {
      preview = { ...preview, columns: applyTemplate(preview.columns, JSON.parse(saved.mappingJson) as TemplateEntry[]) };
      templateApplied = true;
    } catch {
      // Bozuk şablon yok sayılır; otomatik öneri kullanılır
    }
  }

  const definitions = await prisma.metricDefinition.findMany({
    where: { brandId: ctx.brandId, kind: 'custom' },
    select: { key: true, label: true },
  });

  return NextResponse.json({
    sheet_name: result.sheetName,
    sheet_names: result.sheetNames,
    template_applied: templateApplied,
    existing_metrics: definitions,
    ...preview,
  });
}
