/** Uygulamadaki AI görevleri: her biri uygun model kademesini ve net bir çıktı biçimini kullanır. */

import { HONESTY_RULES, generate, generateJson } from './gemini';
import type { reportToAiContext } from './context';

type Context = NonNullable<ReturnType<typeof reportToAiContext>>;

const ANALYST = `Sen e-ticaret markalarıyla çalışan kıdemli bir performans pazarlama analistisin (Meta, Google, TikTok).
Görevin, verilen dönem verisinden markanın yöneticisinin hemen anlayacağı, somut ve uygulanabilir çıkarımlar yapmak.
Genel geçer tavsiye ("içerik kalitesini artırın") yerine veriye bağlı öneri ver: hangi kampanya/platform, neden (hangi sayı), ne yapılmalı.
${HONESTY_RULES}`;

/** Dashboard: seçili dönemin kısa analizi (düz metin, 3 başlık). */
export async function dashboardAnalysis(ctx: Context, fresh = false) {
  return generate({
    tier: 'standard',
    fresh,
    system: ANALYST,
    prompt: `Aşağıdaki JSON, bir e-ticaret markasının seçili dönem reklam verisidir.

Şu üç başlıkla, toplam 250 kelimeyi geçmeden yaz (başlıkları aynen kullan, her başlık altında 2-4 kısa madde, madde işareti "- "):
Durum özeti
Dikkat edilmesi gerekenler
Önerilen aksiyonlar

VERİ:
${JSON.stringify(ctx)}`,
  });
}

export type ReportDraft = { degerlendirme: string; aksiyonlar: string[] };

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    degerlendirme: { type: 'string', description: 'Ayın 2-3 paragraflık değerlendirmesi; müşteriye gönderilecek rapora girer.' },
    aksiyonlar: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6, description: 'Gelecek ay için somut aksiyonlar; her biri tek cümle.' },
  },
  required: ['degerlendirme', 'aksiyonlar'],
};

/** Aylık rapor: müşteriye gidecek değerlendirme ve aksiyon planı taslağı. Kullanıcı düzenleyip onaylar. */
export async function reportDraft(ctx: Context, fresh = false) {
  return generateJson<ReportDraft>({
    tier: 'standard',
    fresh,
    jsonSchema: DRAFT_SCHEMA,
    system: `${ANALYST}
Bu metin ajansın müşterisine (marka sahibine) gidecek aylık rapora girecek: biz dili ("bu ay ... yaptık / gördük"), saygılı ve net bir ton kullan.
Değerlendirmede önce genel sonucu (harcama, dönüşüm değeri, ROAS ve önceki aya göre değişim), sonra öne çıkan kampanya/platformu ve zayıf kalan alanı anlat.
Aksiyonlar ölçülebilir olsun (ör. "X kampanyasının bütçesini Y kampanyasına kaydırmak"); bütçe tutarı veya hedef sayı uydurma.`,
    prompt: `Aylık rapor verisi (JSON):\n${JSON.stringify(ctx)}`,
  });
}
