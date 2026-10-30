// app/api/ai-analiz/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { eTicaretDanismaniAnalizi } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hata: 'Yetkisiz erişim.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    // Tüm sayısal değerler 0 ise analiz edilecek gerçek veri yoktur; AI'a boş veri göndermiyoruz.
    const sayisalDegerler = Object.values(body ?? {}).filter((v): v is number => typeof v === 'number');
    if (!sayisalDegerler.some((v) => v !== 0)) {
      return NextResponse.json({ hata: 'Analiz edilecek veri bulunamadı. Önce veri yükleyin.' }, { status: 400 });
    }

    const analizSonucu = await eTicaretDanismaniAnalizi(body);
    if (!analizSonucu) {
      return NextResponse.json(
        { hata: 'AI servisi şu an kullanılamıyor (API anahtarı tanımlı değil veya servis yanıt vermedi). Dashboard metrikleriniz etkilenmez.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ sonuc: analizSonucu });
  } catch (error: any) {
    return NextResponse.json({ hata: error.message || "Sunucu hatası" }, { status: 500 });
  }
}
