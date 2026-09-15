// lib/gemini.ts
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("UYARI: GEMINI_API_KEY ortam değişkeni tanımlanmamış!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function eTicaretDanismaniAnalizi(dashboardVerileri: any) {
  try {
    const sistemTalimati = `
      Sen 10 yılı aşkın e-ticaret ve performans pazarlama (Meta, Google Ads vb.) tecrübesine sahip kıdemli bir dijital pazarlama danışmanısın.
      Sana bir e-ticaret markasının panelinden alınan güncel performans verileri verilecek.
      Bu verileri derinlemesine analiz et ve kullanıcıya Türkçe olarak şu başlıklarda net bir rapor sun:
      1. 🩺 Genel Sağlık Özeti
      2. 🚨 Acil Eylem Planı / Uyarılar
      3. 🚀 Büyüme Tavsiyeleri
    `;

    const response = await ai.models.generateContent({
      // BURAYI GÜNCELLİYORUZ: Yeni modeli kullanıyoruz
      model: 'gemini-3.6-flash',
      config: {
        systemInstruction: sistemTalimati,
      },
      contents: `İşte analiz etmem gereken güncel e-ticaret verileri: ${JSON.stringify(dashboardVerileri)}`,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI API Hatası:", error);
    throw new Error("Yapay zeka analizi oluşturulurken bir hata oluştu.");
  }
}