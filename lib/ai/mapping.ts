/**
 * Tanınmayan sütun başlıkları için Gemini ile eşleme önerisi.
 *
 * Önce kural tabanlı eşleme çalışır (bilinen Meta/Google/TikTok başlıkları). Kuralın tanımadığı
 * sütunlar başlık + birkaç örnek değerle Gemini'ye sorulur. Sonuç yalnızca ÖNERİDİR: kullanıcı
 * önizleme ekranında görür, değiştirebilir; onaylanan eşleme bu dosya biçimi için hatırlanır,
 * böylece aynı biçimde Gemini bir daha çağrılmaz.
 */

import { generateJson, HONESTY_RULES } from './gemini';
import { FIELD_LABELS, type AdField } from '@/lib/import/headers';
import { metricKey, metricLabel, type ColumnRole, type PreviewColumn } from '@/lib/import/preview';
import { guessFormat } from '@/lib/metrics/catalog';

const FIELD_HELP: Record<AdField, string> = {
  date: 'satırın günü (tarih). Gün bazlı satırlarda bu seçilir.',
  dateEnd: 'yalnızca satır bir tarih aralığıysa aralığın bitiş tarihi; günlük satırlarda seçme',
  platform: 'reklam kanalı/platform adı (Meta, Google, TikTok...)',
  campaign: 'kampanya adı',
  currency: 'para birimi kodu (TRY, USD...)',
  spend: 'reklama harcanan tutar (maliyet)',
  conversionValue: 'reklam platformunun bildirdiği satış/dönüşüm değeri (ciro); sepete ekleme değeri DEĞİL',
  conversions: 'reklam platformunun bildirdiği satın alma/dönüşüm adedi',
  impressions: 'gösterim sayısı',
  clicks: 'tıklama sayısı (tercihen bağlantı tıklaması)',
  reach: 'erişim (tekil kişi)',
};

const SCHEMA = {
  type: 'object',
  properties: {
    columns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          role: { type: 'string', enum: [...Object.keys(FIELD_HELP), 'custom', 'ignore'] },
          label: { type: 'string', description: 'role=custom ise metriğin kısa Türkçe adı' },
          format: { type: 'string', enum: ['number', 'money'] },
        },
        required: ['index', 'role'],
      },
    },
  },
  required: ['columns'],
};

type AiColumn = { index: number; role: string; label?: string; format?: 'number' | 'money' };

export type AiMappingResult = { columns: PreviewColumn[]; changed: number[]; model: string };

/**
 * Kuralın alan olarak eşlemediği sütunları Gemini'ye sorar. Zaten eşlenmiş alanlar (ör. tarih)
 * Gemini'ye seçenek olarak verilmez; bir alan iki sütuna atanmaz.
 */
export async function aiSuggestRoles(columns: PreviewColumn[], rows: string[][]): Promise<AiMappingResult | null> {
  const used = new Set(columns.flatMap((c) => (c.role.kind === 'field' ? [c.role.field] : [])));
  const pending = columns.filter((c) => c.role.kind !== 'field');
  if (!pending.length) return null;
  const free = (Object.keys(FIELD_HELP) as AdField[]).filter((f) => !used.has(f));

  const payload = pending.map((c) => ({
    index: c.index,
    baslik: c.header,
    sayisal: c.numeric,
    ornekler: rows.slice(0, 5).map((r) => r[columns.indexOf(c)]).filter((v) => v !== ''),
  }));

  const res = await generateJson<{ columns: AiColumn[] }>({
    tier: 'standard',
    jsonSchema: SCHEMA,
    system: `Sen e-ticaret ve reklam raporlarını veri tabanına aktaran bir veri mühendisisin. Excel/CSV sütunlarının ne olduğunu başlık ve örnek değerlerden anlarsın; Türkçe, İngilizce ve kısaltmalı başlıkları tanırsın.
${HONESTY_RULES}`,
    prompt: `Bir reklam/e-ticaret raporundaki sütunları sınıflandır. Her sütun için role seç:

Kullanılabilir standart alanlar (her biri EN FAZLA bir sütuna):
${free.map((f) => `- ${f}: ${FIELD_LABELS[f]} — ${FIELD_HELP[f]}`).join('\n')}
- custom: yukarıdakilere uymayan ama satırlar boyunca TOPLANABİLEN sayısal metrik (sepete ekleme, mesaj, lead, video izlenme, sepet değeri, site cirosu...). label ver; tutar/değer/ciro ise format=money, sayım ise number.
- ignore: toplanamayan veya metrik olmayan sütun: oran, ortalama, yüzde, "başına maliyet", CPM/CPC/CTR/ROAS, sıklık, bütçe, kimlik/kod, durum, metin, tarih aralığı bilgisi, hesap/reklam/reklam seti adı.

Emin değilsen ignore seç. Yalnızca aşağıdaki index'ler için yanıt ver.

SÜTUNLAR (JSON):
${JSON.stringify(payload)}`,
  });
  if (!res) return null;

  const taken = new Set(used);
  // AI'nın yanıt vermediği sütunlardaki özel metrik anahtarları da dolu sayılır
  const answered = new Set(res.data.columns.map((x) => x.index));
  const keys = new Set<string>(columns.flatMap((c) => (c.role.kind === 'custom' && !answered.has(c.index) ? [c.role.key] : [])));
  const changed: number[] = [];
  const out = columns.map((c) => {
    const ai = res.data.columns.find((x) => x.index === c.index);
    if (!ai || c.role.kind === 'field') return c;
    let role: ColumnRole | null = null;
    if (ai.role === 'ignore') role = { kind: 'ignore' };
    else if (ai.role === 'custom') {
      if (!c.numeric) role = { kind: 'ignore' };
      else {
        const label = metricLabel(ai.label?.trim() || c.header);
        const key = metricKey(c.header) || metricKey(label);
        if (key && !keys.has(key)) {
          keys.add(key);
          role = { kind: 'custom', key, label };
        }
      }
    } else if (ai.role in FIELD_HELP && !taken.has(ai.role as AdField)) {
      taken.add(ai.role as AdField);
      role = { kind: 'field', field: ai.role as AdField };
    }
    if (!role || JSON.stringify(role) === JSON.stringify(c.role)) return c;
    changed.push(c.index);
    return { ...c, role, ai: true, format: role.kind === 'custom' ? ai.format ?? (guessFormat(role.label) === 'money' ? 'money' : 'number') : undefined } as PreviewColumn;
  });
  return { columns: out, changed, model: res.model };
}
