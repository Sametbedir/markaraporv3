import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
let behaviour: Record<string, () => unknown> = {};

vi.mock('@google/genai', () => ({
  ThinkingLevel: { LOW: 'LOW', MEDIUM: 'MEDIUM' },
  GoogleGenAI: class {
    models = {
      generateContent: async ({ model }: { model: string }) => {
        calls.push(model);
        const b = behaviour[model];
        if (!b) throw new Error(`{"error":{"code":503,"message":"high demand"}}`);
        return b();
      },
    };
  },
}));

const load = async () => {
  vi.resetModules();
  (globalThis as any).markaRaporAi = undefined;
  process.env.GEMINI_API_KEY = 'test-anahtari';
  return import('@/lib/ai/gemini');
};

beforeEach(() => {
  calls.length = 0;
  behaviour = {};
});

describe('hata sınıflama', () => {
  it('kota 0, hız sınırı, yoğunluk, bulunamadı', async () => {
    const { classifyAiError } = await load();
    expect(classifyAiError(new Error('{"error":{"code":429,"message":"quota ... limit: 0, model: gemini-pro"}}'))).toEqual({ kind: 'zero_quota', retryMs: null });
    expect(classifyAiError(new Error('{"error":{"code":429,"message":"Please retry in 17.5s"}}'))).toEqual({ kind: 'rate_limited', retryMs: 17500 });
    expect(classifyAiError(new Error('{"error":{"code":503,"message":"high demand"}}')).kind).toBe('overloaded');
    expect(classifyAiError(new Error('{"error":{"code":404,"message":"no longer available"}}')).kind).toBe('not_found');
    expect(classifyAiError(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })).kind).toBe('timeout');
  });
});

describe('model yedekleme', () => {
  it('ilk model yoğunsa sıradakine geçer, sonucu önbelleğe alır', async () => {
    const { generate } = await load();
    behaviour['gemini-3.8-flash'] = () => ({ text: 'analiz', modelVersion: 'gemini-3.8-flash' });
    const req = { tier: 'standard' as const, system: 's', prompt: 'p' };
    const a = await generate(req);
    expect(a).toMatchObject({ text: 'analiz', model: 'gemini-3.8-flash', cached: false });
    expect(calls).toEqual(['gemini-3.6-flash', 'gemini-3.8-flash']);
    const b = await generate(req);
    expect(b.cached).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('kotası 0 olan model sonraki isteklerde hiç denenmez', async () => {
    const { generate } = await load();
    behaviour['gemini-3.6-flash'] = () => { throw new Error('{"error":{"code":429,"message":"limit: 0"}}'); };
    behaviour['gemini-3.8-flash'] = () => ({ text: 'ok' });
    await generate({ tier: 'standard', system: 's', prompt: '1' });
    calls.length = 0;
    await generate({ tier: 'standard', system: 's', prompt: '2' });
    expect(calls).toEqual(['gemini-3.8-flash']);
  });

  it('boş yanıtı başarı saymaz; hiçbiri yanıt vermezse açık hata verir', async () => {
    const { generate, AiUnavailableError } = await load();
    behaviour['gemini-3.5-flash-lite'] = () => ({ text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] });
    await expect(generate({ tier: 'fast', system: 's', prompt: 'p' })).rejects.toBeInstanceOf(AiUnavailableError);
    expect(calls).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']);
  });

  it('anahtar yoksa çağrı yapılmaz', async () => {
    const mod = await load();
    process.env.GEMINI_API_KEY = '';
    expect(mod.aiConfigured()).toBe(false);
    await expect(mod.generate({ tier: 'fast', system: 's', prompt: 'p' })).rejects.toBeInstanceOf(mod.AiUnavailableError);
    expect(calls).toHaveLength(0);
  });
});
