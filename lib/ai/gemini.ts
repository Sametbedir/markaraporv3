/**
 * Ortak Gemini istemcisi (Google AI Studio, ücretsiz katman).
 *
 * İş türüne göre model kademesi seçilir; bir model yoğunsa (503), kotası dolmuşsa (429) veya
 * süre aşılırsa sıradaki modele geçilir. Kotası 0 olan modeller (ücretsiz katmanda Pro'lar)
 * bir gün boyunca hiç denenmez. Aynı girdinin sonucu kısa süre önbellekte tutulur ki
 * ücretsiz kota boşa harcanmasın.
 *
 * Kademeler 31.10.2026'da bu anahtarla ölçülerek seçildi:
 * - Pro modeller (gemini-4-argon, gemini-pro-latest, 3.1-pro) ücretsiz katmanda kota 0.
 * - Google Arama ile zenginleştirme ücretsiz katmanda kapalı; AI canlı veriye erişemez.
 */

import { createHash } from 'node:crypto';
import { GoogleGenAI, ThinkingLevel, type GenerateContentConfig } from '@google/genai';

export type AiTier = 'fast' | 'standard' | 'deep';

type TierConfig = { models: string[]; thinking: ThinkingLevel | null; timeoutMs: number; maxOutputTokens: number };

export const TIERS: Record<AiTier, TierConfig> = {
  // Kısa, yapılandırılmış işler: düşünmesiz hafif modeller
  fast: { models: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'], thinking: null, timeoutMs: 30_000, maxOutputTokens: 4_096 },
  // Analiz ve rapor yorumu: hızlı ve güçlü Flash, gerekirse en güçlü Flash, en son hafif model
  standard: { models: ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'], thinking: ThinkingLevel.LOW, timeoutMs: 60_000, maxOutputTokens: 8_192 },
  // Uzun strateji raporları: en güçlü ücretsiz model, daha fazla düşünme
  deep: { models: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'], thinking: ThinkingLevel.MEDIUM, timeoutMs: 120_000, maxOutputTokens: 16_384 },
};

export class AiUnavailableError extends Error {}

const CACHE_TTL_MS = 30 * 60 * 1000;
const DISABLE_ON_ZERO_QUOTA_MS = 24 * 60 * 60 * 1000;

type State = {
  client: GoogleGenAI | null;
  key: string | null;
  /** model → bu zamana kadar denenmez */
  cooldown: Map<string, number>;
  cache: Map<string, { at: number; value: AiResult }>;
};
const g = globalThis as typeof globalThis & { markaRaporAi?: State };
const state: State = g.markaRaporAi ?? (g.markaRaporAi = { client: null, key: null, cooldown: new Map(), cache: new Map() });

export function aiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

function client(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiUnavailableError('GEMINI_API_KEY tanımlı değil.');
  if (!state.client || state.key !== key) {
    state.client = new GoogleGenAI({ apiKey: key });
    state.key = key;
  }
  return state.client;
}

export type AiResult = { text: string; model: string; cached: boolean };

/** Hata gövdesinden kota bilgisi: limit 0 ise model bu katmanda hiç kullanılamaz; retryDelay varsa o kadar beklenir. */
export function classifyAiError(err: unknown): { kind: 'zero_quota' | 'rate_limited' | 'overloaded' | 'not_found' | 'timeout' | 'other'; retryMs: number | null } {
  const msg = String((err as any)?.message ?? err);
  if ((err as any)?.name === 'AbortError' || /aborted|timeout/i.test(msg)) return { kind: 'timeout', retryMs: null };
  const code = Number((msg.match(/"code":\s*(\d{3})/) ?? [])[1] ?? (err as any)?.status ?? 0);
  if (code === 429) {
    if (/limit:\s*0\b/.test(msg)) return { kind: 'zero_quota', retryMs: null };
    // "Please retry in 17.49s" veya "retryDelay": "17s"
    const s = msg.match(/retry(?:Delay)?\D{0,6}?(\d+(?:\.\d+)?)s/i);
    return { kind: 'rate_limited', retryMs: s ? Math.ceil(Number(s[1]) * 1000) : 60_000 };
  }
  if (code === 503 || code === 500) return { kind: 'overloaded', retryMs: 30_000 };
  if (code === 404) return { kind: 'not_found', retryMs: null };
  return { kind: 'other', retryMs: null };
}

export type AiRequest = {
  tier: AiTier;
  /** Sistem talimatı: rol, kurallar, yazım biçimi */
  system: string;
  prompt: string;
  /** Verilirse yanıt bu JSON şemasına uygun döner */
  jsonSchema?: Record<string, unknown>;
  /** Şemasız JSON çıktısı (uzun, esnek yapılı raporlar için) */
  json?: boolean;
  /** Aynı girdi için önbellek kullanılmasın (ör. "yeniden üret") */
  fresh?: boolean;
};

/**
 * Kademedeki modelleri sırayla dener. Hiçbiri yanıt vermezse AiUnavailableError fırlatır;
 * çağıran taraf kullanıcıya durumu açıkça söyler, yerine şablon/uydurma metin koymaz.
 */
export async function generate(req: AiRequest): Promise<AiResult> {
  const tier = TIERS[req.tier];
  const cacheKey = createHash('sha256').update(JSON.stringify([req.tier, req.system, req.prompt, req.jsonSchema ?? null])).digest('hex');
  const hit = state.cache.get(cacheKey);
  if (!req.fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.value, cached: true };

  const ai = client();
  const errors: string[] = [];
  for (const [i, model] of tier.models.entries()) {
    const until = state.cooldown.get(model);
    if (until && until > Date.now()) {
      errors.push(`${model}: beklemede`);
      continue;
    }
    // Yedek modellere daha kısa süre tanınır; kullanıcı dakikalarca beklemesin
    const timeoutMs = i === 0 ? tier.timeoutMs : Math.min(tier.timeoutMs, 60_000);
    const config: GenerateContentConfig = {
      systemInstruction: req.system,
      maxOutputTokens: tier.maxOutputTokens,
      temperature: 0.4,
      abortSignal: AbortSignal.timeout(timeoutMs),
      ...(req.jsonSchema ? { responseMimeType: 'application/json', responseJsonSchema: req.jsonSchema } : req.json ? { responseMimeType: 'application/json' } : {}),
      // Lite modeller düşünme ayarını desteklemez; yalnızca Flash'larda kullanılır
      ...(tier.thinking && !model.includes('lite') ? { thinkingConfig: { thinkingLevel: tier.thinking } } : {}),
    };
    try {
      const res = await ai.models.generateContent({ model, contents: req.prompt, config });
      const text = res.text?.trim();
      if (!text) {
        errors.push(`${model}: boş yanıt (${res.candidates?.[0]?.finishReason ?? 'bilinmiyor'})`);
        continue;
      }
      const value: AiResult = { text, model: res.modelVersion ?? model, cached: false };
      state.cache.set(cacheKey, { at: Date.now(), value });
      if (state.cache.size > 200) state.cache.delete(state.cache.keys().next().value!);
      return value;
    } catch (err) {
      const { kind, retryMs } = classifyAiError(err);
      if (kind === 'zero_quota' || kind === 'not_found') state.cooldown.set(model, Date.now() + DISABLE_ON_ZERO_QUOTA_MS);
      else if (retryMs) state.cooldown.set(model, Date.now() + retryMs);
      errors.push(`${model}: ${kind}`);
      console.warn(`[ai] ${model} (${req.tier}) başarısız: ${kind}`);
    }
  }
  throw new AiUnavailableError(`Gemini şu an yanıt vermedi (${errors.join(', ')}). Biraz sonra tekrar deneyin.`);
}

/** JSON yanıtı ayrıştırır; model şema dışına çıkarsa null. */
export async function generateJson<T>(req: AiRequest & { jsonSchema: Record<string, unknown> }): Promise<{ data: T; model: string } | null> {
  const res = await generate(req);
  try {
    return { data: JSON.parse(res.text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T, model: res.model };
  } catch {
    return null;
  }
}

/** Tüm AI çağrılarına eklenen ortak kurallar */
export const HONESTY_RULES = `
VERİ DÜRÜSTLÜĞÜ (KESİN KURALLAR):
- Yalnızca sana verilen sayıları kullan. Verilmeyen hiçbir sayıyı (arama hacmi, pazar payı, sektör ortalaması, tahmini ciro, yüzde artış) uydurma.
- Canlı internete, Google Trends'e, rakip verisine veya reklam hesabına erişimin YOK; erişmiş gibi yazma.
- Bir sayıdan bahsedeceksen verilen değeri aynen ve Türkçe biçimle yaz (1.234,56). Kendi hesapladığın oranı belirt ("harcama ÷ dönüşüm").
- "Dönüşüm değeri" reklam platformunun bildirdiğidir; mağaza cirosu değildir. Bu ikisini karıştırma.
- Emin olmadığın yerde "veride görünmüyor" de; varsayımını açıkça varsayım olarak işaretle.
- Türkçe, sade ve profesyonel yaz; emoji kullanma.`;
