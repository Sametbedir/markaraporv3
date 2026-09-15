// lib/gemini.ts
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export async function eTicaretDanismaniAnalizi(dashboardVerileri: any) {
  try {
    // Yapay zekaya rolünü ve kurallarını anlatıyoruz
    const sistemTalimati = `
      Sen kıdemli bir e-ticaret ve dijital pazarlama veri analistisin. 
      Sana JSON formatında bir e-ticaret markasının performans verileri (harcama, ciro, ROAS, kâr marjı vb.) verilecek.
      Bu verileri incele ve işletme sahibine Türkçe olarak şunları sun:
      1. Genel Sağlık Özeti (İşler iyi mi gidiyor, kötü mü?)
      2. Acil Eylem Planı / Uyarılar (Örn: "ROAS ölmüş, kampanya kapatılmalı" veya "Kâr marjı harika, bütçe artırılabilir").
      3. 2-3 adet somut büyüme tavsiyesi.
      Cevabın net, maddeler halinde, profesyonel ama samimi bir danışman dilinde olsun.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      config: {
        systemInstruction: sistemTalimati,
      },
      // Dashboard verilerini metne çevirip gönderiyoruz
      contents: `İşte analiz etmem gereken güncel e-ticaret verileri: ${JSON.stringify(dashboardVerileri)}`,
    });

    return response.text;
  } catch (error) {
    console.error("AI Analiz Hatası:", error);
    return "Şu anda analiz yapılamıyor, lütfen daha sonra tekrar deneyin.";
  }
}