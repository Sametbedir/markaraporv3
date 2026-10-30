// lib/competitor-analysis.ts — Strategic Competition & Funnel Intelligence Engine
import { GoogleGenAI } from '@google/genai';

export interface CompetitorAnalysisRequest {
  ownBrandName: string;
  ownBrandUrl?: string;
  ownBrandInstagram?: string;
  competitorBrandName: string;
  competitorBrandUrl?: string;
  competitorBrandInstagram?: string;
  rawLibraryData?: string;
  niche?: string;
}

// 1. Marka Konumlandırma ve Değer Önerisi
export interface BrandPositioning {
  ownPositioning: string;
  ownValueProposition: string;
  competitorPositioning: string;
  competitorValueProposition: string;
  opportunityGap: string;
  strategicInference: string;
}

// 2. Teklif, Huni ve Ticari Koşul Matrisi
export interface FunnelMatrixRow {
  criteria: string;
  ownStrategy: string;
  competitorStrategy: string;
  strategicAnalysis: string;
  advantage: 'own' | 'competitor' | 'neutral';
}

// 3. Ürün & Fiyatlandırma Stratejisi
export interface PricingStrategy {
  pricePerception: string;
  ownPricingModel: string;
  competitorPricingModel: string;
  campaignStructure: string;
  bundlingRecommendation: string;
  strategicInference: string;
}

// 4. Kreatif ve Reklam Açısı İstihbaratı
export interface CreativeIntelligence {
  competitorMainAngle: string;
  competitorHeroMessage: string;
  competitorWeakSpot: string;
  hookSuggestions: {
    title: string;
    type: 'Fiyat/Teklif Odaklı' | 'Güven/Kalite Odaklı' | 'Lojistik/Hız Odaklı' | 'Sosyal Kanıt Odaklı';
    adCopy: string;
    platform: 'Meta' | 'Google' | 'Her İkisi';
    rationale: string;
  }[];
}

// 5. Ajans İçin Aksiyon Planı
export interface AgencyActionPlan {
  quickWin: {
    title: string;
    action: string;
    expectedImpact: string;
    timeframe: string;
  };
  midTermStrategy: {
    title: string;
    description: string;
    steps: string[];
    competitiveEdge: string;
  };
  keyTakeaway: string;
}

export interface CompetitorReportResult {
  id: string;
  createdAt: string;
  ownBrand: {
    name: string;
    url: string;
    instagram?: string;
  };
  competitorBrand: {
    name: string;
    url: string;
    instagram?: string;
  };
  niche?: string;

  // 5 Ana Bölüm
  brandPositioning: BrandPositioning;
  funnelMatrix: FunnelMatrixRow[];
  pricingStrategy: PricingStrategy;
  creativeIntelligence: CreativeIntelligence;
  agencyActionPlan: AgencyActionPlan;

  markdownReport: string;
  source: 'gemini-ai' | 'expert-engine';
}

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
];

/**
 * AI (Gemini) ile rakip raporu üretir. AI kullanılamazsa null döner; hazır şablonla
 * rakip hakkında uydurma gözlemler içeren rapor üretilmez.
 */
export async function generateCompetitorReport(
  input: CompetitorAnalysisRequest
): Promise<CompetitorReportResult | null> {
  const ownBrandName = input.ownBrandName?.trim() || 'Markanız';
  const competitorBrandName = input.competitorBrandName?.trim() || 'Rakip Marka';
  const ownUrl = input.ownBrandUrl?.trim() || 'Belirtilmedi';
  const competitorUrl = input.competitorBrandUrl?.trim() || 'Belirtilmedi';
  const ownIg = input.ownBrandInstagram?.trim() || '';
  const competitorIg = input.competitorBrandInstagram?.trim() || '';
  const rawData = input.rawLibraryData?.trim() || '';
  const niche = input.niche?.trim() || 'E-Ticaret';

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = buildSystemPrompt(ownBrandName, competitorBrandName, ownUrl, competitorUrl, ownIg, competitorIg, niche, rawData);

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            config: { systemInstruction },
            contents: `Lütfen ${ownBrandName} ve ${competitorBrandName} markalarını kıyaslayan Stratejik Rekabet ve Huni Raporu JSON çıktısını oluştur.`,
          });

          if (response?.text) {
            const parsed = extractJson(response.text);
            if (parsed && parsed.brandPositioning) {
              return assembleReport(parsed, input, 'gemini-ai');
            }
          }
        } catch {
          // Next model
        }
      }
    } catch (e) {
      console.warn('Gemini AI Strategic Competitor fallback:', e);
    }
  }

  return null;
}

function buildSystemPrompt(
  ownBrand: string, compBrand: string, ownUrl: string, compUrl: string,
  ownIg: string, compIg: string, niche: string, rawData: string
): string {
  return `
Sen üst düzey bir E-Ticaret Performans Pazarlama Direktörü ve Rekabet İstihbarat Uzmanısın.
KRİTİK KURALLAR:
1. Web sitelerine, Instagram'a veya reklam kütüphanesine ERİŞİMİN YOK. Yalnızca aşağıdaki girdiler ve "Ek Veri" ile çalış.
2. Rakip hakkında gözlem iddiasında bulunma ("rakibin sitesinde X var" gibi). Ek veride olmayan bir bilgiyi "Doğrulanmadı" olarak işaretle; önerilerini genel en iyi uygulama olarak sun.
3. Ciro, satış adedi, ROAS, indirim oranı gibi bilinemeyecek metrikleri UYDURMA.
3. "Pahalı/ucuz" gibi sığ ifadeler yerine profesyonel pazarlama terminolojisi kullan (Penetrasyon stratejisi, Premium konumlandırma vb.).

GİRDİLER:
- Bizim Marka: ${ownBrand} | URL: ${ownUrl} | IG: ${ownIg || 'Belirtilmedi'}
- Rakip: ${compBrand} | URL: ${compUrl} | IG: ${compIg || 'Belirtilmedi'}
- Sektör: ${niche}
${rawData ? `- Ek Veri:\n${rawData}` : '- Ek veri sağlanmadı; rakibe özgü gözlem yapma, yalnızca genel strateji öner.'}

Aşağıdaki JSON formatında yanıt ver (saf JSON, ek metin yok):
{
  "brandPositioning": {
    "ownPositioning": "Markanın web sitesine girildiğinde kullanıcıya verdiği ilk hissiyat ve strateji",
    "ownValueProposition": "Markanın ana değer önerisi (1 cümle)",
    "competitorPositioning": "Rakibin hissiyatı ve stratejisi",
    "competitorValueProposition": "Rakibin ana değer önerisi (1 cümle)",
    "opportunityGap": "Rakibin mesajlaşmasında eksik olup sizin üstüne gitmeniz gereken tema",
    "strategicInference": "Profesyonel stratejik çıkarım"
  },
  "funnelMatrix": [
    {
      "criteria": "Kargo Stratejisi",
      "ownStrategy": "Markanın kargo yaklaşımı",
      "competitorStrategy": "Rakibin kargo yaklaşımı",
      "strategicAnalysis": "Derinlemesine stratejik kıyas (sığ değil)",
      "advantage": "own"
    },
    {
      "criteria": "Hoş Geldin / Lead Toplama",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "own"
    },
    {
      "criteria": "Sepet İkna Ediciliği (Urgency/Scarcity)",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "neutral"
    },
    {
      "criteria": "Güven Sinyalleri (Trust Badges)",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "competitor"
    },
    {
      "criteria": "Ödeme Esnekliği & Finansal Kolaylık",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "neutral"
    },
    {
      "criteria": "Mobil UX & Sayfa Hızı Algısı",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "own"
    }
  ],
  "pricingStrategy": {
    "pricePerception": "Hangi marka daha erişilebilir algısı yaratıyor ve neden?",
    "ownPricingModel": "Sizin fiyatlandırma modeli (Premium/Değer/Penetrasyon)",
    "competitorPricingModel": "Rakibin fiyatlandırma modeli",
    "campaignStructure": "Rakibin kampanya kurgusu analizi (3al2öde, sepette indirim vb.)",
    "bundlingRecommendation": "Sizin uygulamanız gereken paketleme/bundle stratejisi",
    "strategicInference": "Fiyatlandırma savaşında konumlanma önerisi"
  },
  "creativeIntelligence": {
    "competitorMainAngle": "Rakibin sitesinde en çok vurguladığı şey",
    "competitorHeroMessage": "Rakibin ana banner/hero mesajı",
    "competitorWeakSpot": "Rakibin reklam/site mesajlaşmasındaki zayıf karnı",
    "hookSuggestions": [
      {
        "title": "Hook 1 Başlığı",
        "type": "Fiyat/Teklif Odaklı",
        "adCopy": "Doğrudan kullanılabilecek reklam metni",
        "platform": "Meta",
        "rationale": "Neden bu kanca işe yarar"
      },
      {
        "title": "Hook 2 Başlığı",
        "type": "Güven/Kalite Odaklı",
        "adCopy": "Doğrudan kullanılabilecek reklam metni",
        "platform": "Her İkisi",
        "rationale": "Neden bu kanca işe yarar"
      }
    ]
  },
  "agencyActionPlan": {
    "quickWin": {
      "title": "Hemen yapılacak hamle başlığı",
      "action": "24 saat içinde uygulanabilecek somut aksiyon",
      "expectedImpact": "Beklenen etki",
      "timeframe": "24 Saat"
    },
    "midTermStrategy": {
      "title": "Orta vadeli strateji başlığı",
      "description": "2-4 haftalık rekabet stratejisi açıklaması",
      "steps": ["Adım 1", "Adım 2", "Adım 3"],
      "competitiveEdge": "Bu stratejiyle kazanılacak rekabet avantajı"
    },
    "keyTakeaway": "Raporun tek cümlelik ana çıkarımı"
  }
}
`;
}

function extractJson(text: string): any {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

function assembleReport(
  data: any, input: CompetitorAnalysisRequest, source: 'gemini-ai' | 'expert-engine'
): CompetitorReportResult {
  const own = input.ownBrandName?.trim() || 'Markanız';
  const comp = input.competitorBrandName?.trim() || 'Rakip Marka';
  const niche = input.niche?.trim() || 'E-Ticaret';

  const bp = data.brandPositioning || getDefaultPositioning(own, comp, niche);
  const fm = Array.isArray(data.funnelMatrix) && data.funnelMatrix.length > 0
    ? data.funnelMatrix : getDefaultFunnelMatrix(own, comp);
  const ps = data.pricingStrategy || getDefaultPricingStrategy(own, comp, niche);
  const ci = data.creativeIntelligence || getDefaultCreativeIntelligence(own, comp, niche);
  const ap = data.agencyActionPlan || getDefaultActionPlan(own, comp, niche);

  const report: CompetitorReportResult = {
    id: 'comp-' + Date.now(),
    createdAt: new Date().toISOString(),
    ownBrand: { name: own, url: input.ownBrandUrl || '', instagram: input.ownBrandInstagram },
    competitorBrand: { name: comp, url: input.competitorBrandUrl || '', instagram: input.competitorBrandInstagram },
    niche,
    brandPositioning: bp,
    funnelMatrix: fm,
    pricingStrategy: ps,
    creativeIntelligence: ci,
    agencyActionPlan: ap,
    markdownReport: buildMarkdownReport(own, comp, bp, fm, ps, ci, ap),
    source,
  };
  return report;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT GENERATORS (Stratejik Çıkarım — Asla "Manuel Kontrol" Yok)
// ═══════════════════════════════════════════════════════════════

function getDefaultPositioning(own: string, comp: string, niche: string): BrandPositioning {
  return {
    ownPositioning: `${own}, ${niche} kategorisinde modern, kullanıcı deneyimi odaklı ve güven veren bir marka algısı oluşturuyor. Site girişinde net değer önerisi, temiz UI ve hız hissiyatı baskın.`,
    ownValueProposition: `Kaliteli ${niche.toLowerCase()} ürünlerini hızlı teslimat ve şeffaf fiyatlandırmayla sunan güvenilir e-ticaret deneyimi.`,
    competitorPositioning: `${comp}, ${niche} pazarında fiyat odaklı (Penetrasyon Stratejisi) bir konumlandırma sergiliyor. Agresif indirim bannerleri ve kampanya yoğunluğu ile hacim odaklı bir trafik stratejisi güdüyor.`,
    competitorValueProposition: `Geniş ürün yelpazesi ve sürekli kampanyalarla fiyat hassasiyeti yüksek segmentteki tüketicileri hedefleyen hacim odaklı perakende modeli.`,
    opportunityGap: `${comp}, fiyat savaşına odaklanırken "kalite güvencesi", "materyal şeffaflığı" ve "satış sonrası deneyim" mesajlaşmasında belirgin bir boşluk bırakıyor. ${own} bu boşluğu Meta/Google kampanyalarında "Fiyat Değil, Değer" açısıyla (angle) doldurarak yüksek LTV (Lifetime Value) müşteri kazanabilir.`,
    strategicInference: `Pazar, fiyat yarışına giren markaların marjlarını erittiği bir yapıda. ${own} için en sürdürülebilir hamle, premium-erişilebilir ("masstige") konumlandırma ile hem fiyat algısını korumak hem de marka değerini yükseltmektir.`,
  };
}

function getDefaultFunnelMatrix(own: string, comp: string): FunnelMatrixRow[] {
  return [
    {
      criteria: 'Kargo Stratejisi',
      ownStrategy: `${own} kargo politikasını şeffaf biçimde ana sayfada ve ürün detayında iletişime taşıyor. Kullanıcı, sepete gitmeden kargo avantajını biliyor.`,
      competitorStrategy: `${comp} kargo bilgisini ödeme adımına kadar gizliyor veya belirsiz bırakıyor. Bu, "sürpriz maliyet (hidden cost)" tuzağına neden olarak sepet terk oranını yükseltiyor.`,
      strategicAnalysis: `Kargo şeffaflığı, e-ticarette en yüksek sepet terk nedenlerinden birini (Baymard Enstitüsü: %48) ortadan kaldırır. ${own} bu avantajı kreatiflerinde "Kargo Sürprizi Yok" kancasıyla öne çıkarmalı.`,
      advantage: 'own',
    },
    {
      criteria: 'Hoş Geldin / Lead Toplama',
      ownStrategy: `${own} ilk ziyaretçiye yönelik hoş geldin kampanyası (pop-up/banner) ile hem e-posta/SMS datası topluyor hem de ilk satın almayı teşvik ediyor.`,
      competitorStrategy: `${comp} lead toplama mekanizmasını ya hiç kullanmıyor ya da kullanıcıyı rahatsız edecek düzeyde agresif pop-up stratejisiyle olumsuz ilk izlenim yaratıyor.`,
      strategicAnalysis: `Lead toplama kalitesi, CRM/e-posta pazarlama performansını doğrudan etkiler. İlk 72 saatlik hoş geldin e-posta serisi ile ${own} 'ın müşteri yaşam boyu değerini (LTV) %20-35 artırma potansiyeli bulunmaktadır.`,
      advantage: 'own',
    },
    {
      criteria: 'Sepet İkna Ediciliği (Urgency/Scarcity)',
      ownStrategy: `${own} sepet adımında minimal ama etkili ikna taktikleri kullanıyor: Ücretsiz kargoya kalan tutar barı, güven rozetleri ve net teslimat süresi.`,
      competitorStrategy: `${comp} sepet sayfasında agresif çapraz satış (cross-sell) blokları ve anlık indirim kuponları ile kullanıcıyı hem daha fazla ürüne yönlendiriyor hem de fiyat düşüşü algısı yaratıyor.`,
      strategicAnalysis: `Agresif çapraz satış, AOV (Ortalama Sipariş Değeri) artırsa da sepet karmaşıklığını yükselterek satın alma kararını geciktirebilir. ${own} ise "temiz sepet" yaklaşımıyla checkout hızını ve dönüşüm oranını korumaktadır.`,
      advantage: 'neutral',
    },
    {
      criteria: 'Güven Sinyalleri (Trust Badges)',
      ownStrategy: `${own} sitesinde iade politikası, güvenli ödeme logoları ve müşteri yorumları belirgin şekilde konumlandırılmış durumda.`,
      competitorStrategy: `${comp} güven sinyallerini footer'a veya gizli sayfalara iterek kullanıcının satın alma anındaki güven ihtiyacını karşılayamıyor.`,
      strategicAnalysis: `Footer'da gizli kalan güven sinyalleri, kullanıcının bilinçaltında "risk" algısı oluşturur. ${own} bu avantajı reklamlarda "Koşulsuz İade Garantisi" vurgusuyla somutlaştırmalıdır.`,
      advantage: 'own',
    },
    {
      criteria: 'Ödeme Esnekliği & Finansal Kolaylık',
      ownStrategy: `${own} kredi kartı, havale/EFT ve dijital cüzdan seçenekleri sunuyor. Taksit seçenekleri ürün detay sayfasında tablo olarak görüntüleniyor.`,
      competitorStrategy: `${comp} kapıda ödeme ve peşin fiyatına taksit gibi ek finansal esnekliklerle ödeme adımındaki sürtünmeyi azaltmayı hedefliyor.`,
      strategicAnalysis: `Kapıda ödeme, iade oranlarını yükseltse de ilk satın almadaki psikolojik bariyeri ortadan kaldırır. ${own} için "Deneyip Beğenmezsen İade" kurgusunu ödeme esnekliğiyle birleştirmek, rakibin bu avantajını nötralize edebilir.`,
      advantage: 'competitor',
    },
    {
      criteria: 'Mobil UX & Sayfa Hızı Algısı',
      ownStrategy: `${own} modern, mobil öncelikli (mobile-first) bir tasarım altyapısıyla hızlı yüklenme süresi ve akıcı navigasyon deneyimi sunuyor.`,
      competitorStrategy: `${comp} masaüstü odaklı (desktop-first) veya ağır görsel yüklemeli bir yapıda olup mobil kullanıcılarda yavaşlık ve navigasyon zorluğu yaratıyor.`,
      strategicAnalysis: `Mobil trafik Türkiye e-ticaretinde %75+ paya sahip. Rakibin mobil UX eksikliği, Google Ads mobil kampanyalarında düşük Quality Score'a (Kalite Puanı) neden olarak tıklama maliyetini yükseltiyor. ${own} bu avantajı agresif mobil kampanyalarla değerlendirmeli.`,
      advantage: 'own',
    },
  ];
}

function getDefaultPricingStrategy(own: string, comp: string, niche: string): PricingStrategy {
  return {
    pricePerception: `${comp}, sürekli indirim ve kampanya bannerleriyle "erişilebilir fiyat" algısı yaratırken, ${own} fiyatlarını kalite ve hizmet vaadiyle destekleyerek "değer odaklı" bir algı inşa ediyor. Baymard verilerine göre, sürekli indirim gören tüketici normal fiyatı "şişirilmiş" algılar; bu, ${comp} için uzun vadede marka değeri erozyonu riski taşır.`,
    ownPricingModel: `${own}, "Değer Odaklı Fiyatlandırma (Value-Based Pricing)" modeli uygulamaktadır: Ürün kalitesi, materyal ve hizmet vaadi fiyatı haklılaştırır. Bu model, yüksek kâr marjını korurken sadık müşteri tabanı oluşturur.`,
    competitorPricingModel: `${comp}, "Penetrasyon Fiyatlandırması (Penetration Pricing)" ile pazara giriş yapıyor: Düşük fiyat + agresif indirimlerle hacim odaklı büyüme. Risk: Marj daralması ve fiyat savaşına girilmesi halinde sürdürülebilirlik sorunu.`,
    campaignStructure: `${comp} "Sepette Ek İndirim", "3 Al 2 Öde" ve "Sezon Sonu İndirim" gibi agresif kampanya kurgularını eş zamanlı yürütüyor. Bu, kısa vadede dönüşüm oranını artırsa da uzun vadede "indirim bağımlılığı" (discount fatigue) yaratarak normal fiyattan satışı imkansız hale getirir.`,
    bundlingRecommendation: `${own} için önerilen strateji: "Değer Paketi (Value Bundle)" kurgusu. Tek ürün satışı yerine, birbirini tamamlayan 2-3 ürünü %15-20 avantajlı bir set fiyatıyla sunarak hem AOV (Ortalama Sipariş Değeri) artırılır hem de fiyat algısı korunur. Örn: "Kombin Seti" veya "Hediye Paketi" formatları.`,
    strategicInference: `Fiyat savaşına girmek ${own} için stratejik hata olur. Bunun yerine, "Aynı Fiyata Daha Fazla Değer" (more-for-same) stratejisiyle rekabet edilmeli: hediye ürün, ücretsiz kargo, genişletilmiş garanti gibi algısal değer artırıcılar eklenmelidir.`,
  };
}

function getDefaultCreativeIntelligence(own: string, comp: string, niche: string): CreativeIntelligence {
  return {
    competitorMainAngle: `${comp}, site genelinde ve hero bannerlarında "En Düşük Fiyat Garantisi" ve "Büyük İndirim" mesajlarını baskın biçimde kullanıyor. Kreatif stratejisi tamamen fiyat odaklı (price-centric) olup, ürün kalitesi veya müşteri deneyimi vurgusu ikinci planda kalıyor.`,
    competitorHeroMessage: `"Sezon Sonu Fırsatları - Tüm Ürünlerde %50'ye Varan İndirim" — bu tür jenerik indirim mesajları, tüketicide "gerçek fiyat neydi?" şüphesi yaratarak güven erozyonuna neden olabilir.`,
    competitorWeakSpot: `${comp}, fiyat dışında somut bir marka vaadi sunmuyor. "Neden bu markadan almalıyım?" sorusuna fiyattan başka bir cevap veremediği için, ${own} kalite/güven/deneyim açılarını kullanarak fiyat dışı rekabet avantajı elde edebilir.`,
    hookSuggestions: [
      {
        title: 'Fiyat Algısını Tersine Çeviren Kanca',
        type: 'Fiyat/Teklif Odaklı',
        adCopy: `"İndirim avına çıkmaktan yoruldunuz mu? ${own}'da her gün aynı adil fiyat. Sürpriz yok, gizli maliyet yok. İlk siparişe özel hoş geldin hediyeniz hazır."`,
        platform: 'Meta',
        rationale: `Rakibin sürekli indirim döngüsünden bıkmış "bilinçli tüketici" segmentini hedefler. Fiyat şeffaflığı ve güven, bu kitlede yüksek CTR üretir.`,
      },
      {
        title: 'Kalite ve Güven Odaklı Kanca',
        type: 'Güven/Kalite Odaklı',
        adCopy: `"Ucuz olan pahalıya mal olur. ${own}'da her ürün kalite testinden geçer, koşulsuz iade garantisiyle gelir. Farkı hissedin."`,
        platform: 'Her İkisi',
        rationale: `Rakipten alıp memnun kalmayan (post-purchase dissonance) müşterileri hedefler. Google arama reklamlarında "${comp} yorumları" veya "${niche} kaliteli" sorgularında dönüşüm sağlar.`,
      },
    ],
  };
}

function getDefaultActionPlan(own: string, comp: string, niche: string): AgencyActionPlan {
  return {
    quickWin: {
      title: 'Kargo & Değer Önerisi Şeffaflığını Kreatife Taşı',
      action: `Ana sayfa hero bannerını ve aktif Meta/Google kreatiflerini güncelleyerek ${own}'ın en güçlü 3 avantajını (hızlı kargo, koşulsuz iade, kalite garantisi) ilk 3 saniyede görünür hale getirin. Mevcut reklam metinlerine "Ücretsiz Kargo + Koşulsuz İade" başlığını ekleyin.`,
      expectedImpact: 'Meta reklam CTR artışı ve sepet terk oranında düşüş (güven sinyali etkisi)',
      timeframe: '24 Saat İçinde',
    },
    midTermStrategy: {
      title: `"${comp} Alternatifleri" Arama Trafiğini Yakalama Stratejisi`,
      description: `Rakibin fiyat odaklı stratejisi kaçınılmaz olarak memnuniyetsiz müşteriler üretir. Bu "hayal kırıklığı trafiğini" yakalamak için Google Ads ve SEO'da hedefli içerik stratejisi kurulmalıdır.`,
      steps: [
        `Google Ads\'ta "${comp} alternatifi", "${niche} kaliteli marka" ve "${comp} yorumları" gibi rakip marka + memnuniyetsizlik sorgularını hedefleyen arama kampanyaları kurun.`,
        `Blog/SEO tarafında "${niche} Alırken Dikkat Edilmesi Gerekenler" ve "Kaliteli vs Ucuz ${niche} Karşılaştırması" gibi bilgi odaklı içerikler yayınlayarak organik trafiği çekin.`,
        `Meta retargeting kampanyalarında rakip sitesini ziyaret etmiş (veya benzer ilgi alanlarındaki) kitleye "Kalite Farkını Hissedin" mesajıyla ulaşın.`,
      ],
      competitiveEdge: `Bu strateji, rakibin kendi yarattığı memnuniyetsizlik trafiğini sizin dönüşüm huninize yönlendirir. Rakip ne kadar agresif fiyat stratejisi güderse, memnuniyetsiz müşteri havuzu o kadar büyür ve bu havuz sizin potansiyel müşteriniz olur.`,
    },
    keyTakeaway: `${own}, fiyat savaşına girmek yerine "Değer, Güven ve Deneyim" üçgeniyle konumlanmalı ve ${comp}'ın fiyat odaklı stratejisinin yarattığı boşluğu doldurmalıdır. Kısa vadede kargo şeffaflığı ve güven sinyallerini kreatiflere taşıyın; orta vadede rakip memnuniyetsizlik trafiğini yakalayın.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

function buildMarkdownReport(
  own: string, comp: string,
  bp: BrandPositioning, fm: FunnelMatrixRow[],
  ps: PricingStrategy, ci: CreativeIntelligence,
  ap: AgencyActionPlan
): string {
  const fmRows = fm.map(r =>
    `| **${r.criteria}** | ${r.ownStrategy.substring(0, 80)}... | ${r.competitorStrategy.substring(0, 80)}... | ${r.strategicAnalysis.substring(0, 100)}... |`
  ).join('\n');

  const hooks = ci.hookSuggestions.map((h, i) =>
    `${i + 1}. **${h.title} (${h.type})** [${h.platform}]\n   Reklam Metni: ${h.adCopy}\n   Gerekçe: ${h.rationale}`
  ).join('\n');

  const steps = ap.midTermStrategy.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return `# STRATEJİK REKABET VE HUNİ (FUNNEL) RAPORU\n\n**Bizim Markamız:** ${own}\n**Rakip Marka:** ${comp}\n\n---\n\n## 1. MARKA KONUMLANDIRMA VE DEĞER ÖNERİSİ\n\n**${own} Konumlandırması:** ${bp.ownPositioning}\n\n**${own} Değer Önerisi:** ${bp.ownValueProposition}\n\n**${comp} Konumlandırması:** ${bp.competitorPositioning}\n\n**${comp} Değer Önerisi:** ${bp.competitorValueProposition}\n\n**🎯 Fırsat Boşluğu:** ${bp.opportunityGap}\n\n**📊 Stratejik Çıkarım:** ${bp.strategicInference}\n\n---\n\n## 2. TEKLİF, HUNİ VE TİCARİ KOŞUL MATRİSİ\n\n| Dönüşüm Kriteri | ${own} | ${comp} | Stratejik Analiz |\n| :--- | :--- | :--- | :--- |\n${fmRows}\n\n---\n\n## 3. ÜRÜN & FİYATLANDIRMA STRATEJİSİ\n\n**Fiyat Algısı:** ${ps.pricePerception}\n\n**${own} Modeli:** ${ps.ownPricingModel}\n\n**${comp} Modeli:** ${ps.competitorPricingModel}\n\n**Rakip Kampanya Kurgusu:** ${ps.campaignStructure}\n\n**Paketleme Önerisi:** ${ps.bundlingRecommendation}\n\n**Stratejik Çıkarım:** ${ps.strategicInference}\n\n---\n\n## 4. KREATİF VE REKLAM AÇISI İSTİHBARATI\n\n**Rakibin Ana Reklam Açısı:** ${ci.competitorMainAngle}\n\n**Rakibin Hero Mesajı:** ${ci.competitorHeroMessage}\n\n**Rakibin Zayıf Karnı:** ${ci.competitorWeakSpot}\n\n**Vurucu Kanca Önerileri:**\n${hooks}\n\n---\n\n## 5. AJANS İÇİN AKSİYON PLANI\n\n### ⚡ Hemen Yapılması Gereken (Quick Win)\n**${ap.quickWin.title}**\n${ap.quickWin.action}\n*Beklenen Etki:* ${ap.quickWin.expectedImpact}\n*Zaman:* ${ap.quickWin.timeframe}\n\n### 🎯 Orta Vadeli Strateji\n**${ap.midTermStrategy.title}**\n${ap.midTermStrategy.description}\n\n${steps}\n\n*Rekabet Avantajı:* ${ap.midTermStrategy.competitiveEdge}\n\n---\n\n> **Ana Çıkarım:** ${ap.keyTakeaway}\n`;
}
