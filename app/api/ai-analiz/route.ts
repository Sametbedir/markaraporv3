export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBrand } from '@/lib/brand';
import { buildBrandRangeReport } from '@/lib/report/brand-report';
import { previousPeriod } from '@/lib/report/metrics';
import { reportToAiContext } from '@/lib/ai/context';
import { dashboardAnalysis } from '@/lib/ai/tasks';
import { AiUnavailableError, aiConfigured } from '@/lib/ai/gemini';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** POST /api/ai-analiz { start_date, end_date, fresh? } — seçili dönemin AI analizi (aktif marka) */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  if (!aiConfigured()) return NextResponse.json({ hata: 'AI kapalı: .env dosyasında GEMINI_API_KEY tanımlı değil.' }, { status: 503 });

  const body = await req.json().catch(() => null);
  const start = String(body?.start_date ?? '');
  const end = String(body?.end_date ?? '');
  if (!ISO.test(start) || !ISO.test(end) || start > end) return NextResponse.json({ hata: 'Geçerli bir tarih aralığı seçin.' }, { status: 400 });

  const report = await buildBrandRangeReport(ctx.brand, { start, end }, previousPeriod(start, end));
  const aiCtx = reportToAiContext(report);
  if (!aiCtx) return NextResponse.json({ hata: 'Bu dönemde analiz edilecek veri yok. Önce veri yükleyin veya tarih aralığını değiştirin.' }, { status: 400 });

  try {
    const res = await dashboardAnalysis(aiCtx, body?.fresh === true);
    return NextResponse.json({ sonuc: res.text, model: res.model, onbellek: res.cached });
  } catch (error) {
    if (error instanceof AiUnavailableError) return NextResponse.json({ hata: error.message }, { status: 503 });
    throw error;
  }
}
