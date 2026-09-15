// app/api/ai-analiz/route.ts
import { NextResponse } from 'next/server';
import { eTicaretDanismaniAnalizi } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ hata: "Analiz edilecek veri bulunamadı." }, { status: 400 });
    }

    // Fonksiyon adı lib/gemini.ts içindeki isimle birebir aynı yapıldı:
    const analizSonucu = await eTicaretDanismaniAnalizi(body);

    return NextResponse.json({ sonuc: analizSonucu });
  } catch (error: any) {
    return NextResponse.json({ hata: error.message || "Sunucu hatası" }, { status: 500 });
  }
}