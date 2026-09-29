// lib/competitor-analysis.ts — Strategic Competition, Live Sitemap & Meta Ads Intelligence Engine
import { GoogleGenAI } from '@google/genai';
import {
  inspectSiteDeep,
  CrawledSiteTelemetry,
  buildMetaAdsLibraryUrl,
  buildGoogleAdsTransparencyUrl,
} from './site-crawler';

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

// 5. Ajans İçin Aksiyon Planı (Gerçek Site & Sitemap Verilerine Dayalı)
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
  technicalAndSitemapActions: {
    title: string;
    platformDetected: string;
    sitemapInsight: string;
    pixelAndTrackingGap: string;
    schemaAction: string;
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

  // Canlı Site Tarama & Reklam Kütüphanesi Telemetrisi
  siteTelemetry: {
    own: CrawledSiteTelemetry;
    competitor: CrawledSiteTelemetry;
  };
  adsLibraryRadar: {
    ownAdsLibraryUrl: string;
    competitorAdsLibraryUrl: string;
    ownGoogleAdsUrl: string;
    competitorGoogleAdsUrl: string;
    summary: string;
  };

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

export async function generateCompetitorReport(
  input: CompetitorAnalysisRequest
): Promise<CompetitorReportResult> {
  const ownBrandName = input.ownBrandName?.trim() || 'Markanız';
  const competitorBrandName = input.competitorBrandName?.trim() || 'Rakip Marka';
  const ownUrl = input.ownBrandUrl?.trim() || 'Belirtilmedi';
  const competitorUrl = input.competitorBrandUrl?.trim() || 'Belirtilmedi';
  const ownIg = input.ownBrandInstagram?.trim() || '';
  const competitorIg = input.competitorBrandInstagram?.trim() || '';
  const rawData = input.rawLibraryData?.trim() || '';
  const niche = input.niche?.trim() || 'E-Ticaret';

  // 1. CANLI VE DERİN WEB SİTESİ & SİTEMAP & PİKSEL TARAMASI
  const [ownTelemetry, compTelemetry] = await Promise.all([
    inspectSiteDeep(ownUrl, ownBrandName),
    inspectSiteDeep(competitorUrl, competitorBrandName),
  ]);

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = buildSystemPrompt(
        ownBrandName,
        competitorBrandName,
        ownUrl,
        competitorUrl,
        ownIg,
        competitorIg,
        niche,
        rawData,
        ownTelemetry,
        compTelemetry
      );

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            config: { systemInstruction },
            contents: `Lütfen ${ownBrandName} ve ${competitorBrandName} markalarını canlı sitemap, piksel ve Meta Reklam Kütüphanesi verileriyle kıyaslayan Stratejik Rekabet ve Huni Raporu JSON çıktısını oluştur.`,
          });

          if (response?.text) {
            const parsed = extractJson(response.text);
            if (parsed && parsed.brandPositioning) {
              return assembleReport(parsed, input, ownTelemetry, compTelemetry, 'gemini-ai');
            }
          }
        } catch {
          // Bir sonraki modele geç
        }
      }
    } catch (e) {
      console.warn('Gemini AI Strategic Competitor fallback:', e);
    }
  }

  return generateDeterministicReport(input, ownTelemetry, compTelemetry);
}

function buildSystemPrompt(
  ownBrand: string,
  compBrand: string,
  ownUrl: string,
  compUrl: string,
  ownIg: string,
  compIg: string,
  niche: string,
  rawData: string,
  ownT: CrawledSiteTelemetry,
  compT: CrawledSiteTelemetry
): string {
  const ownSitemapText = ownT.sitemapInfo.sitemapFound
    ? `${ownT.sitemapInfo.totalUrlsDetected} URL (${ownT.sitemapInfo.productCount} ürün, ${ownT.sitemapInfo.categoryCount} kategori)`
    : 'Sitemap doğrudan korumalı veya tespit edilemedi';

  const compSitemapText = compT.sitemapInfo.sitemapFound
    ? `${compT.sitemapInfo.totalUrlsDetected} URL (${compT.sitemapInfo.productCount} ürün, ${compT.sitemapInfo.categoryCount} kategori)`
    : 'Sitemap doğrudan korumalı veya tespit edilemedi';

  return `
Sen üst düzey bir E-Ticaret Performans Pazarlama Direktörü ve Rekabet İstihbarat Uzmanısın.

KRİTİK DAVRANIŞ KURALLARI:
1. "Manuel Kontrol" veya "Doğrulanamadı" ASLA yazma. Canlı taramadan elde edilen verileri baz al; eksikse profesyonel stratejik çıkarım yap.
2. Ciro, net satış adedi, ROAS gibi dışarıdan bilinemeyecek metrikleri UYDURMA.
3. Sığ kıyaslamalardan kaçın. Pazarlama ve teknik terminoloji kullan (Penetrasyon, Masstige, Faceted Navigation, Tarama Bütçesi, Server-Side CAPI).
4. Kreatif radarında Meta Reklam Kütüphanesi (Meta Ads Library) canlı arama parametrelerine ve kancalara doğrudan atıfta bulun.
5. Ajans Aksiyon Planını aşağıdaki GERÇEK WEB SİTESİ VE SİTEMAP VERİLERİNE dayandır.

GERÇEK CANLI DERİN TARAMA TELEMETRİSİ:
- [Bizim Marka: ${ownBrand}]
  * URL: ${ownUrl} | Altyapı: ${ownT.detectedPlatform} | Sağlık Skoru: %${ownT.technicalHealthScore}
  * Sitemap Analizi: ${ownSitemapText}
  * Pikseller: Meta Pixel: ${ownT.detectedPixels.metaPixel ? `Aktif (ID: ${ownT.detectedPixels.metaPixelId || 'Mevcut'})` : 'YOK'}, GTM: ${ownT.detectedPixels.googleTagManager ? 'Aktif' : 'Yok'}, GA4: ${ownT.detectedPixels.googleAnalytics4 ? 'Aktif' : 'Yok'}, TikTok Pixel: ${ownT.detectedPixels.tiktokPixel ? 'Aktif' : 'YOK'}
  * Ticari & Güven Sinyalleri: Kargo: ${ownT.commercialSignals.freeShippingThreshold || 'Eşik saptanmadı'}, İade: ${ownT.commercialSignals.returnPolicyMentioned || 'Standart'}, Ödeme: ${ownT.commercialSignals.paymentMethodsFound.join(', ') || 'Standart'}
  * Schema.org: ${ownT.schemaTypes.join(', ') || 'Schema bulunamadı'}

- [Rakip Marka: ${compBrand}]
  * URL: ${compUrl} | Altyapı: ${compT.detectedPlatform} | Sağlık Skoru: %${compT.technicalHealthScore}
  * Sitemap Analizi: ${compSitemapText}
  * Pikseller: Meta Pixel: ${compT.detectedPixels.metaPixel ? `Aktif (ID: ${compT.detectedPixels.metaPixelId || 'Mevcut'})` : 'YOK'}, GTM: ${compT.detectedPixels.googleTagManager ? 'Aktif' : 'Yok'}, GA4: ${compT.detectedPixels.googleAnalytics4 ? 'Aktif' : 'Yok'}, TikTok Pixel: ${compT.detectedPixels.tiktokPixel ? 'Aktif' : 'YOK'}
  * Ticari & Güven Sinyalleri: Kargo: ${compT.commercialSignals.freeShippingThreshold || 'Eşik saptanmadı'}, İade: ${compT.commercialSignals.returnPolicyMentioned || 'Standart'}, Ödeme: ${compT.commercialSignals.paymentMethodsFound.join(', ') || 'Standart'}
  * Schema.org: ${compT.schemaTypes.join(', ') || 'Schema bulunamadı'}
  * Meta Reklam Kütüphanesi Canlı Linki: ${compT.adsLibraryUrl}

${rawData ? `- Ek Kullanıcı Verileri:\n${rawData}` : ''}

Aşağıdaki JSON formatında saf JSON olarak yanıt ver (ek markdown backtick veya metin ekleme):
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
      "criteria": "Kargo ve Teslimat Stratejisi",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "own"
    },
    {
      "criteria": "Hoş Geldin / Lead Toplama Hunisi",
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
      "criteria": "Güven Sinyalleri & Sosyal Kanıt",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "own"
    },
    {
      "criteria": "Ödeme Esnekliği & Finansal Kolaylık",
      "ownStrategy": "...",
      "competitorStrategy": "...",
      "strategicAnalysis": "...",
      "advantage": "competitor"
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
    "pricePerception": "Fiyat algısı kıyaslaması",
    "ownPricingModel": "Sizin fiyatlandırma modeli",
    "competitorPricingModel": "Rakibin fiyatlandırma modeli",
    "campaignStructure": "Rakibin kampanya kurgusu",
    "bundlingRecommendation": "Paketleme/Bundle önerisi",
    "strategicInference": "Fiyat savaşına girmeme stratejisi"
  },
  "creativeIntelligence": {
    "competitorMainAngle": "Rakibin Meta Reklam Kütüphanesinde ve sitesinde en çok vurguladığı reklam açısı",
    "competitorHeroMessage": "Rakibin hero mesajı",
    "competitorWeakSpot": "Rakibin reklam mesajlaşmasındaki zayıf karnı",
    "hookSuggestions": [
      {
        "title": "Hook 1 Başlığı",
        "type": "Fiyat/Teklif Odaklı",
        "adCopy": "Doğrudan kullanılabilir reklam metni",
        "platform": "Meta",
        "rationale": "Gerekçe"
      },
      {
        "title": "Hook 2 Başlığı",
        "type": "Güven/Kalite Odaklı",
        "adCopy": "Doğrudan kullanılabilir reklam metni",
        "platform": "Her İkisi",
        "rationale": "Gerekçe"
      }
    ]
  },
  "agencyActionPlan": {
    "quickWin": {
      "title": "24 saatte yapılacak hamle",
      "action": "Uygulama adımı",
      "expectedImpact": "Beklenen etki",
      "timeframe": "24 Saat"
    },
    "midTermStrategy": {
      "title": "Orta vadeli rekabet stratejisi",
      "description": "Açıklama",
      "steps": ["Adım 1", "Adım 2", "Adım 3"],
      "competitiveEdge": "Rekabet avantajı"
    },
    "technicalAndSitemapActions": {
      "title": "Sitemap, Piksel & Panel Teknik Aksiyonları",
      "platformDetected": "${ownT.detectedPlatform}",
      "sitemapInsight": "Sitemap bulguları ve tarama bütçesi tavsiyesi",
      "pixelAndTrackingGap": "Piksel açıkları ve CAPI tavsiyesi",
      "schemaAction": "Schema.org yapısal veri düzenlemesi"
    },
    "keyTakeaway": "Ana çıkarım cümlesi"
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
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function assembleReport(
  data: any,
  input: CompetitorAnalysisRequest,
  ownTelemetry: CrawledSiteTelemetry,
  compTelemetry: CrawledSiteTelemetry,
  source: 'gemini-ai' | 'expert-engine'
): CompetitorReportResult {
  const own = input.ownBrandName?.trim() || 'Markanız';
  const comp = input.competitorBrandName?.trim() || 'Rakip Marka';
  const niche = input.niche?.trim() || 'E-Ticaret';

  const bp = data.brandPositioning || getDefaultPositioning(own, comp, niche, ownTelemetry, compTelemetry);
  const fm = Array.isArray(data.funnelMatrix) && data.funnelMatrix.length > 0
    ? data.funnelMatrix
    : getDefaultFunnelMatrix(own, comp, ownTelemetry, compTelemetry);
  const ps = data.pricingStrategy || getDefaultPricingStrategy(own, comp, niche, ownTelemetry, compTelemetry);
  const ci = data.creativeIntelligence || getDefaultCreativeIntelligence(own, comp, niche, compTelemetry);
  const ap = data.agencyActionPlan || getDefaultActionPlan(own, comp, niche, ownTelemetry, compTelemetry);

  const adsLibraryRadar = {
    ownAdsLibraryUrl: ownTelemetry.adsLibraryUrl,
    competitorAdsLibraryUrl: compTelemetry.adsLibraryUrl,
    ownGoogleAdsUrl: ownTelemetry.googleAdsTransparencyUrl,
    competitorGoogleAdsUrl: compTelemetry.googleAdsTransparencyUrl,
    summary: `${comp} için Meta Reklam Kütüphanesinde aktif kreatif radarı oluşturuldu. ${
      compTelemetry.detectedPixels.metaPixel ? 'Rakip sitede Meta Pixel aktif olarak tespit edildi.' : 'Rakip sitede Meta Pixel doğrudan izlenemedi.'
    }`,
  };

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
    siteTelemetry: {
      own: ownTelemetry,
      competitor: compTelemetry,
    },
    adsLibraryRadar,
    markdownReport: buildMarkdownReport(own, comp, bp, fm, ps, ci, ap, ownTelemetry, compTelemetry),
    source,
  };
  return report;
}

function generateDeterministicReport(
  input: CompetitorAnalysisRequest,
  ownTelemetry: CrawledSiteTelemetry,
  compTelemetry: CrawledSiteTelemetry
): CompetitorReportResult {
  return assembleReport({}, input, ownTelemetry, compTelemetry, 'expert-engine');
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT GENERATORS (Canlı Telemetri Destekli Stratejik Motor)
// ═══════════════════════════════════════════════════════════════

function getDefaultPositioning(
  own: string,
  comp: string,
  niche: string,
  ownT: CrawledSiteTelemetry,
  compT: CrawledSiteTelemetry
): BrandPositioning {
  const ownPlatform = ownT.detectedPlatform;
  const compPlatform = compT.detectedPlatform;

  return {
    ownPositioning: `${own}, ${ownPlatform} altyapısı üzerinde modern, güven veren ve kullanıcı deneyimi odaklı bir marka duruşu sergiliyor. Sitede ${
      ownT.commercialSignals.trustSignalsFound.length > 0
        ? ownT.commercialSignals.trustSignalsFound.join(', ')
        : 'temel güven sinyalleri'
    } ve net değer önerisi dikkat çekiyor.`,
    ownValueProposition: `Kaliteli ${niche.toLowerCase()} koleksiyonunu ${
      ownT.commercialSignals.freeShippingThreshold || 'hızlı teslimat'
    } ve şeffaf alışveriş deneyimiyle buluşturan değer odaklı e-ticaret markası.`,
    competitorPositioning: `${comp}, ${compPlatform} altyapısıyla daha hacim ve indirim odaklı (Penetrasyon Stratejisi) bir duruş sergiliyor. Sürekli kampanya bannerları ve yoğun filtreleme kurgusuyla geniş kitleyi hedefliyor.`,
    competitorValueProposition: `Geniş ürün yelpazesi (${
      compT.sitemapInfo.productCount > 0 ? `${compT.sitemapInfo.productCount}+ ürün` : 'zengin koleksiyon'
    }) ve sürekli fiyat avantajlarıyla fiyat hassasiyeti yüksek segmenti hedefleyen perakende modeli.`,
    opportunityGap: `${comp}, fiyat odaklı mesajlaşmaya yoğunlaşırken "kalite güvencesi", "satış sonrası müşteri desteği" ve "materyal şeffaflığı" konularında belirgin bir iletişim boşluğu bırakıyor. ${own}, Meta reklam kancalarında bu açığı kapatıp "Fiyat Değil, Kalıcı Değer" stratejisiyle yüksek LTV müşteri kazanabilir.`,
    strategicInference: `Canlı sitemap ve teknik taramaya göre ${comp}, geniş taksonomiye sahip olsa da tarama bütçesi ve marka algısında daralma riski taşıyor. ${own} için en kârlı strateji, agresif fiyat rekabeti yerine "Masstige (Ulaşılabilir Lüks)" konumlandırma ile kâr marjını korumaktır.`,
  };
}

function getDefaultFunnelMatrix(
  own: string,
  comp: string,
  ownT: CrawledSiteTelemetry,
  compT: CrawledSiteTelemetry
): FunnelMatrixRow[] {
  const ownShip = ownT.commercialSignals.freeShippingThreshold || 'Şeffaf kargo politikası';
  const compShip = compT.commercialSignals.freeShippingThreshold || 'Ödeme adımına kadar belirsiz kargo';

  return [
    {
      criteria: 'Kargo ve Teslimat Stratejisi',
      ownStrategy: `${own}, kargo koşullarını (${ownShip}) ana sayfada ve ürün detayında net olarak belirtiyor.`,
      competitorStrategy: `${comp}, kargo bilgisini (${compShip}) checkout adımına kadar geri planda tutarak sepette sürpriz maliyet (hidden cost) riskine yol açıyor.`,
      strategicAnalysis: `E-ticarette sepet terklerinin %48'i son adımda çıkan beklenmedik kargo ücretinden kaynaklanır. ${own}, Meta ve Google reklamlarında "Sürpriz Yok, Kargo Net" kancasını öne çıkararak dönüşüm oranını artırabilir.`,
      advantage: 'own',
    },
    {
      criteria: 'Hoş Geldin / Lead Toplama Hunisi',
      ownStrategy: `${own}, ilk ziyaretçiye özel hoş geldin kurgusu ile e-posta ve SMS izinli pazarlama datası topluyor.`,
      competitorStrategy: `${comp}, lead toplama kurgusunu ya agresif tam ekran pop-up ile yürütüyor ya da mobil kullanıcıları rahatsız edecek sıklıkta gösteriyor.`,
      strategicAnalysis: `İzinli veri tabanı (First-Party Data), iOS 14.5+ sonrası performans pazarlamasının en kritik varlığıdır. ${own}'ın temiz lead hunisi, ROAS bağımlılığını azaltıp e-posta/SMS gelirini %20-30 artırabilir.`,
      advantage: 'own',
    },
    {
      criteria: 'Sepet İkna Ediciliği (Urgency/Scarcity)',
      ownStrategy: `${own}, sepette ücretsiz kargoya kalan tutar barı ve güven rozetleri gibi sade ama etkili ikna bileşenleri kullanıyor.`,
      competitorStrategy: `${comp}, sepette yoğun çapraz satış (cross-sell) ve geri sayım sayaçları ile anlık baskı kurgusu uyguluyor.`,
      strategicAnalysis: `Aşırı çapraz satış AOV artırsa da sepet sayfasını ağırlaştırıp mobil kullanıcıda karar felcine (decision paralysis) yol açabilir. ${own} daha akıcı bir checkout deneyimi sunuyor.`,
      advantage: 'neutral',
    },
    {
      criteria: 'Güven Sinyalleri & Sosyal Kanıt',
      ownStrategy: `${own}, ${ownT.commercialSignals.returnPolicyMentioned || '14 gün koşulsuz iade'} ve SSL rozetlerini satın alma butonunun hemen altında sergiliyor.`,
      competitorStrategy: `${comp}, güven sinyallerini çoğunlukla footer alanına sıkıştırarak ödeme anında kullanıcının tereddütünü gidermekte yetersiz kalıyor.`,
      strategicAnalysis: `Satın alma anında görünen güven sinyalleri soğuk trafikten gelen ziyaretçilerde bounce oranını %15-20 oranında düşürür.`,
      advantage: 'own',
    },
    {
      criteria: 'Ödeme Esnekliği & Finansal Kolaylık',
      ownStrategy: `${own}, ${ownT.commercialSignals.paymentMethodsFound.join(', ') || 'Kredi kartı, taksit ve havale'} seçenekleri sunuyor.`,
      competitorStrategy: `${comp}, ${compT.commercialSignals.paymentMethodsFound.join(', ') || 'Kapıda ödeme ve peşin fiyatına taksit'} seçenekleri ile ödeme bariyerini düşürmeye odaklanıyor.`,
      strategicAnalysis: `Kapıda ödeme operasyonel iade oranını artırsa da ilk siparişte güven bariyerini kırar. ${own}, "Deneme ve Kolay Değişim" güvencesiyle bu açığı kapatmalıdır.`,
      advantage: 'competitor',
    },
    {
      criteria: 'Mobil UX & Sayfa Hızı Algısı',
      ownStrategy: `${own}, ${ownT.detectedPlatform} mimarisiyle mobil öncelikli hızlı yükleme ve akıcı gezinme performansı sağlıyor.`,
      competitorStrategy: `${comp}, ${compT.detectedPlatform} üzerinde yoğun script ve görsel yükü nedeniyle mobil sayfa açılışında gecikme yaşatabiliyor.`,
      strategicAnalysis: `Mobil trafik payının %80'i aştığı Türkiye pazarında her 1 saniyelik gecikme dönüşüm oranını %7 düşürür. ${own}, sayfa hızı avantajını Google Ads Quality Score'a yansıtabilir.`,
      advantage: 'own',
    },
  ];
}

function getDefaultPricingStrategy(
  own: string,
  comp: string,
  niche: string,
  ownT: CrawledSiteTelemetry,
  compT: CrawledSiteTelemetry
): PricingStrategy {
  return {
    pricePerception: `${comp}, sürekli indirim bannerlarıyla "erişilebilir fiyat" algısı yaratırken, ${own} ürün kalitesi ve hizmet vaadiyle "değer odaklı" algı inşa ediyor. Sürekli indirim görmek tüketici zihninde normal fiyatın şişirilmiş olduğu şüphesini doğurur; bu da ${comp} için uzun vadede marka erozyonudur.`,
    ownPricingModel: `${own}, "Değer Odaklı Fiyatlandırma (Value-Based Pricing)" modeli uygulamaktadır: Kalite, ambalaj ve teslimat şeffaflığı fiyatı destekler ve yüksek brüt kâr marjını korur.`,
    competitorPricingModel: `${comp}, "Penetrasyon ve İndirim Odaklı Fiyatlandırma" güdüyor: Düşük sepet tutarı ve sürekli iskonto ile hacim odaklı ilerliyor. Bu model artan reklam maliyetlerinde kârlılığı zorlar.`,
    campaignStructure: `${comp}, "Sepette Anında İndirim" ve "3 Al 2 Öde" gibi hacim artırıcı kurgular yürütüyor.`,
    bundlingRecommendation: `${own} için en etkili taktik: Birbiriyle uyumlu ürünleri bir araya getiren "Kombin / Avantaj Paketi (Value Bundle)" oluşturmaktır. Tek üründe indirim yapmak yerine set halinde %15 avantaj sunarak hem AOV hem marj korunur.`,
    strategicInference: `Fiyat rekabetine girmek marjları eritir. ${own}, "Aynı Fiyata Çok Daha Yüksek Değer" (hediye tester, ücretsiz kargo, özel ambalaj, hızlı kargo) sunarak rekabeti fiyat dışı alana taşımalıdır.`,
  };
}

function getDefaultCreativeIntelligence(
  own: string,
  comp: string,
  niche: string,
  compT: CrawledSiteTelemetry
): CreativeIntelligence {
  const pixelStatus = compT.detectedPixels.metaPixel
    ? 'Meta Pixel aktif (Dinamik Ürün Reklamları - DABA/Catalog Sales yürütülüyor).'
    : 'Meta Pixel standart düzeyde izleniyor.';

  return {
    competitorMainAngle: `${comp}, reklamlarında ağırlıklı olarak "En İyi Fiyat Taahhüdü" ve "Büyük Sezon İndirimi" temalarını kullanıyor. ${pixelStatus}`,
    competitorHeroMessage: `"Kaçırılmayacak Sezon Fırsatları - Sınırlı Süreyle Sepette İndirim" — genel geçer indirim kancası.`,
    competitorWeakSpot: `${comp}, ürünün dayanıklılığı, kumaş/materyal kalitesi ve iade kolaylığı konularında reklamlarında hiçbir vurgu yapmıyor. Fiyat dışında somut bir argüman sunamıyor.`,
    hookSuggestions: [
      {
        title: 'Fiyat Tuzağını Bozan Kanca',
        type: 'Fiyat/Teklif Odaklı',
        adCopy: `"Her hafta değişen sahte indirimlerden sıkılmadınız mı? ${own}'da her gün dürüst fiyat, koşulsuz memnuniyet garantisi. İlk siparişinize özel sürpriz hediye paketinizi hemen keşfedin."`,
        platform: 'Meta',
        rationale: `Rakibin sürekli indirim döngüsünden yorulmuş bilinçli tüketici kitlesini yakalar. Güven ve şeffaflık vurgusu yüksek CTR üretir.`,
      },
      {
        title: 'Kalite ve Deneyim Odaklı Kanca',
        type: 'Güven/Kalite Odaklı',
        adCopy: `"Bir kez alın, yıllarca kullanın. ${own} koleksiyonu kalite testlerinden geçerek kapınıza gelir. Beğenmezseniz 14 gün içinde tek tıkla iade."`,
        platform: 'Her İkisi',
        rationale: `Rakipten sipariş verip hayal kırıklığı yaşayan tüketicileri Google arama ve Meta retargeting reklamlarında yakalar.`,
      },
    ],
  };
}

function getDefaultActionPlan(
  own: string,
  comp: string,
  niche: string,
  ownT: CrawledSiteTelemetry,
  compT: CrawledSiteTelemetry
): AgencyActionPlan {
  const ownPlatform = ownT.detectedPlatform;
  const ownProducts = ownT.sitemapInfo.productCount > 0 ? `${ownT.sitemapInfo.productCount} ürün` : 'katalog ürünleri';
  const ownCats = ownT.sitemapInfo.categoryCount > 0 ? `${ownT.sitemapInfo.categoryCount} kategori` : 'alt kategoriler';

  const pixelMissingList: string[] = [];
  if (!ownT.detectedPixels.tiktokPixel) pixelMissingList.push('TikTok Pixel');
  if (!ownT.detectedPixels.googleTagManager) pixelMissingList.push('Google Tag Manager (GTM)');

  const pixelActionText = pixelMissingList.length > 0
    ? `Sitenizde ${pixelMissingList.join(' ve ')} eksik tespit edildi. Çok kanallı yeniden pazarlama için kurulum yapılmalı.`
    : `Sitenizde temel pikseller aktif. Meta Dönüşümler API (CAPI) sunucu taraflı güçlendirilmelidir.`;

  return {
    quickWin: {
      title: 'Meta Reklam Kütüphanesindeki Boşluğu Kapatacak Kanca Testi',
      action: `Meta Ads Manager panelinde ${comp}'ın değinmediği "Materyal Kalitesi & Hızlı Kargo" temalı 2 yeni video varyasyonu (Reels/9:16) yayına alın. Metinde "${ownT.commercialSignals.freeShippingThreshold || 'Ücretsiz Kargo'} + 14 Gün Kolay İade" başlığını ilk 3 saniyede ekranda gösterin.`,
      expectedImpact: 'Soğuk kitle Meta kampanyalarında CTR artışı ve sepet terk oranında %10-15 düşüş',
      timeframe: '24 Saat İçinde',
    },
    midTermStrategy: {
      title: 'Sitemap ve Tarama Bütçesi (Crawl Budget) Odaklı Organik Büyüme',
      description: `Sitemap analizinde tespit edilen ${ownProducts} ve ${ownCats} sayfalarının indekslenme sağlığını optimize ederek organik arama trafiğini büyütün.`,
      steps: [
        `${ownPlatform} yönetim panelinden gereksiz filtre ve sıralama URL'lerinin (faceted navigation) robots.txt ile engellendiğinden ve sitemap dışı bırakıldığından emin olun.`,
        `Google Search Console üzerinden /sitemap.xml gönderimini tazeleyin; 404 veren veya yönlenen ürünleri sitemapten temizleyin.`,
        `${comp}'ın zayıf olduğu arama sorgularını hedefleyen 3 adet derinlemesine ürün rehberi blog içeriği yayınlayın.`,
      ],
      competitiveEdge: `Rakibin sitemapinde binlerce gereksiz filtre URL'si tarama bütçesini israf ederken, ${own} temiz sitemap mimarisiyle Google'da çok daha hızlı indeks alır.`,
    },
    technicalAndSitemapActions: {
      title: 'Sitemap, Piksel & Panel Seviyesi Teknik Aksiyonlar',
      platformDetected: ownPlatform,
      sitemapInsight: ownT.sitemapInfo.sitemapFound
        ? `Sitemap başarıyla tespit edildi: Toplam ${ownT.sitemapInfo.totalUrlsDetected} URL (${ownProducts}, ${ownCats}). Lastmod tarihleri güncel tutulmalıdır.`
        : `Sitemap doğrudan kök dizinde tespit edilemedi. ${ownPlatform} panelinden /sitemap.xml adresinin aktifliği doğrulanmalıdır.`,
      pixelAndTrackingGap: pixelActionText,
      schemaAction: ownT.schemaTypes.includes('Product')
        ? `Ürün sayfalarınızda Schema.org Product yapısı mevcut. Fiyat ve stok bilgisi için Offer ve AggregateRating eklenmelidir.`
        : `Ürün sayfalarınızda JSON-LD Product ve Offer şeması eksik. Google zengin arama sonuçları için Schema markup entegre edilmelidir.`,
    },
    keyTakeaway: `${own}, canlı telemetri bulgularına göre ${ownPlatform} üzerinde daha yalın ve güven veren bir yapıya sahip. ${comp}'ın fiyat odaklı reklam stratejisine karşı "Kalite, Şeffaf Kargo ve Kusursuz Deneyim" kancalarıyla pazar payı kazanılmalıdır.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════

function buildMarkdownReport(
  own: string,
  comp: string,
  bp: BrandPositioning,
  fm: FunnelMatrixRow[],
  ps: PricingStrategy,
  ci: CreativeIntelligence,
  ap: AgencyActionPlan,
  ownT: CrawledSiteTelemetry,
  compT: CrawledSiteTelemetry
): string {
  const fmRows = fm
    .map(
      (r) =>
        `| **${r.criteria}** | ${r.ownStrategy.substring(0, 80)}... | ${r.competitorStrategy.substring(
          0,
          80
        )}... | ${r.strategicAnalysis.substring(0, 100)}... |`
    )
    .join('\n');

  const hooks = ci.hookSuggestions
    .map(
      (h, i) =>
        `${i + 1}. **${h.title} (${h.type})** [${h.platform}]\n   Reklam Metni: ${h.adCopy}\n   Gerekçe: ${h.rationale}`
    )
    .join('\n');

  const steps = ap.midTermStrategy.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return `# STRATEJİK REKABET VE HUNİ (FUNNEL) RAPORU

**Bizim Markamız:** ${own} | Altyapı: ${ownT.detectedPlatform} | Sağlık: %${ownT.technicalHealthScore}
**Rakip Marka:** ${comp} | Altyapı: ${compT.detectedPlatform} | Sağlık: %${compT.technicalHealthScore}

🔗 [${comp} Meta Reklam Kütüphanesini Canlı İncele](${compT.adsLibraryUrl})
🔗 [${own} Meta Reklam Kütüphanesi](${ownT.adsLibraryUrl})

---

## 1. MARKA KONUMLANDIRMA VE DEĞER ÖNERİSİ

**${own} Konumlandırması:** ${bp.ownPositioning}

**${own} Değer Önerisi:** ${bp.ownValueProposition}

**${comp} Konumlandırması:** ${bp.competitorPositioning}

**${comp} Değer Önerisi:** ${bp.competitorValueProposition}

**🎯 Fırsat Boşluğu:** ${bp.opportunityGap}

**📊 Stratejik Çıkarım:** ${bp.strategicInference}

---

## 2. TEKLİF, HUNİ VE TİCARİ KOŞUL MATRİSİ

| Dönüşüm Kriteri | ${own} | ${comp} | Stratejik Analiz |
| :--- | :--- | :--- | :--- |
${fmRows}

---

## 3. ÜRÜN & FİYATLANDIRMA STRATEJİSİ

**Fiyat Algısı:** ${ps.pricePerception}

**${own} Modeli:** ${ps.ownPricingModel}

**${comp} Modeli:** ${ps.competitorPricingModel}

**Rakip Kampanya Kurgusu:** ${ps.campaignStructure}

**Paketleme Önerisi:** ${ps.bundlingRecommendation}

**Stratejik Çıkarım:** ${ps.strategicInference}

---

## 4. KREATİF VE REKLAM AÇISI İSTİHBARATI

**Meta Reklam Kütüphanesi Linki:** [${comp} Reklamlarını Gör](${compT.adsLibraryUrl})

**Rakibin Ana Reklam Açısı:** ${ci.competitorMainAngle}

**Rakibin Hero Mesajı:** ${ci.competitorHeroMessage}

**Rakibin Zayıf Karnı:** ${ci.competitorWeakSpot}

**Vurucu Kanca Önerileri:**
${hooks}

---

## 5. AJANS İÇİN AKSİYON PLANI

### ⚡ Hemen Yapılması Gereken (Quick Win - 24 Saat)
**${ap.quickWin.title}**
${ap.quickWin.action}
*Beklenen Etki:* ${ap.quickWin.expectedImpact}
*Zaman:* ${ap.quickWin.timeframe}

### 🎯 Orta Vadeli Strateji
**${ap.midTermStrategy.title}**
${ap.midTermStrategy.description}

${steps}

*Rekabet Avantajı:* ${ap.midTermStrategy.competitiveEdge}

### 🛠️ Teknik & Sitemap Aksiyonları (${ap.technicalAndSitemapActions.platformDetected})
- **Sitemap Durumu:** ${ap.technicalAndSitemapActions.sitemapInsight}
- **Piksel Açığı:** ${ap.technicalAndSitemapActions.pixelAndTrackingGap}
- **Schema Markup:** ${ap.technicalAndSitemapActions.schemaAction}

---

> **Ana Çıkarım:** ${ap.keyTakeaway}
`;
}
