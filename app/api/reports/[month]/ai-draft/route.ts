export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { isMonth } from '@/lib/report/months';
import { buildBrandMonthReport } from '@/lib/report/brand-report';
import { reportToAiContext } from '@/lib/ai/context';
import { reportDraft } from '@/lib/ai/tasks';
import { AiUnavailableError, aiConfigured } from '@/lib/ai/gemini';

/**
 * POST /api/reports/:month/ai-draft { fresh? } — değerlendirme ve aksiyon planı TASLAĞI üretir.
 * Kaydetmez: metin forma gelir, kullanıcı düzenler; kaydetme ve yayınlama yine kullanıcıdadır.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ month: string }> }) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const { month } = await params;
  if (!isMonth(month)) return NextResponse.json({ error: 'Geçersiz ay' }, { status: 400 });
  if (!aiConfigured()) return NextResponse.json({ error: 'AI kapalı: .env dosyasında GEMINI_API_KEY tanımlı değil.' }, { status: 503 });
  const body = await req.json().catch(() => null);

  const aiCtx = reportToAiContext(await buildBrandMonthReport(ctx.brand, month));
  if (!aiCtx) return NextResponse.json({ error: 'Bu ay için veri yok.' }, { status: 400 });

  try {
    const res = await reportDraft(aiCtx, body?.fresh === true);
    if (!res || !res.data.degerlendirme || !Array.isArray(res.data.aksiyonlar)) {
      return NextResponse.json({ error: 'AI yanıtı beklenen biçimde değildi. Tekrar deneyin.' }, { status: 502 });
    }
    return NextResponse.json({
      summary: res.data.degerlendirme.trim(),
      actions: res.data.aksiyonlar.map((a) => `- ${String(a).trim()}`).join('\n'),
      model: res.model,
    });
  } catch (error) {
    if (error instanceof AiUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
}
