import {
  buildIntentAndTaxonomyStrategy,
  buildPlatformTechnicalActions,
  buildSchemaGeoMarkup,
  buildCroTrustSignals,
  buildExpectedTechnicalImpact,
  IntentAndTaxonomyStrategy,
  PlatformTechnicalActions,
  SchemaGeoMarkup,
  CroTrustSignal,
  ExpectedTechnicalImpact,
} from './seo-geo-strategy';

export * from './seo-geo-strategy';
// lib/seo-geo.ts
import { AiUnavailableError, HONESTY_RULES, aiConfigured, generate } from '@/lib/ai/gemini';

export interface SeoGeoRequest {
  platform: 'ikas' | 'ticimax' | 'ideasoft' | 'shopify' | string;
  niche: string;
  location: string;
  websiteUrl?: string;
  targetKeywords?: string;
  notes?: string;
}

export interface KeywordOpportunity {
  keyword: string;
  monthlyVolume: string;
  searchTrend: string;
  difficulty: 'Düşük' | 'Orta' | 'Yüksek';
  regionPriority: string;
  intent: 'Ticari' | 'Bilgi' | 'Yerel Satın Alma' | 'Navigasyon';
  opportunityScore: number;
}

export interface GeoRegionOpportunity {
  cityOrRegion: string;
  growthRate: string;
  localAdvantage: string;
  recommendedAction: string;
  marketShareEstimate: string;
}

export interface StepByStepGuide {
  selectedPlatform: string;
  panelNavigation: string;
  steps: {
    stepNumber: number;
    title: string;
    section: string;
    action: string;
    exactInputSample?: string;
    proTip?: string;
  }[];
}

export interface EarlyWarningAlarm {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'Sıralama Kaybı' | 'Teknik SEO' | 'Bölgesel GEO Kaybı' | 'Dönüşüm / Hız';
  metric: string;
  change: string;
  description: string;
  immediateAction: string;
  riskSeverity: 'Yüksek' | 'Orta' | 'Kritik';
}

export interface SeoGeoReportResult {
  id: string;
  createdAt: string;
  platform: string;
  niche: string;
  location: string;
  websiteUrl?: string;

  // 1.1 Niyet ve Mimari Stratejisi
  intentAndTaxonomy: IntentAndTaxonomyStrategy;
  platformTechnicalActions: PlatformTechnicalActions;
  schemaMarkup: SchemaGeoMarkup;
  croTrustSignals: CroTrustSignal[];
  expectedTechnicalImpact: ExpectedTechnicalImpact;

  // 1. Anlık Durum ve Trend Sinyali
  trendSignal: {
    singleSentenceSummary: string;
    trendsDelta: string;
    topRisingSearch: string;
    seasonalImpact: string;
    statusBadge: 'Pozitif Sinyal' | 'Kritik Risk' | 'Durgunluk' | 'Yüksek Fırsat';
  };

  // 2. Fırsat Alanı (SEO & GEO)
  opportunityArea: {
    summary: string;
    missedKeywords: KeywordOpportunity[];
    geoOpportunities: GeoRegionOpportunity[];
    regionalShippingAdvantage: string;
  };

  // 3. Altyapı Bazlı Adım Adım Uygulama Rehberi
  platformGuide: StepByStepGuide;

  // 4. Beklenen Etki
  expectedImpact: {
    summary: string;
    estimatedTrafficGrowth: string;
    estimatedConversionIncrease: string;
    breakEvenTimeframe: string;
    projectedRevenueImpact: string;
    kpiTargets: { label: string; value: string }[];
  };

  // 5. İleriki Tarih Kötü Gidenleri Takip & Erken Uyarı Radarı
  healthScore: number;
  trackingRadar: {
    overallStatus: 'risk_detected' | 'healthy' | 'needs_attention';
    statusMessage: string;
    alarms: EarlyWarningAlarm[];
    futureRiskIndicators: string[];
    monitoringInterval: string;
  };

  source: 'gemini-ai' | 'expert-engine';
}


/**
 * AI (Gemini) ile SEO/GEO raporu üretir. AI kullanılamazsa null döner; hazır şablonla uydurma rapor üretilmez.
 */
export async function generateSeoGeoReport(input: SeoGeoRequest): Promise<SeoGeoReportResult | null> {
  const platform = input.platform?.toLowerCase() || 'ikas';
  const niche = input.niche?.trim() || 'Genel E-Ticaret';
  const location = input.location?.trim() || 'Türkiye Geneli';
  const websiteUrl = input.websiteUrl?.trim() || '';

  if (aiConfigured()) {
    try {
      const prompt = `
Sen Türkiye ve küresel e-ticaret pazarlarında uzmanlaşmış kıdemli bir SEO & GEO (Coğrafi Arama Optimizasyonu) Danışmanısın.
Aşağıdaki e-ticaret markası için KESİN VE NET, AKSİYON ODAKLI BİR MARKA RAPORU üret.

KULLANICI PARAMETRELERİ:
- E-Ticaret Altyapısı: ${platform}
- Sektör / Ürün Grubu: ${niche}
- Hedef Bölge / Lokasyon: ${location}
- Web Sitesi: ${websiteUrl || 'Belirtilmedi'}
${input.targetKeywords ? `- Kullanıcı Odak Kelimeleri: ${input.targetKeywords}` : ''}
${input.notes ? `- Ekstra Notlar: ${input.notes}` : ''}

VERİ DÜRÜSTLÜĞÜ KURALLARI (EN ÖNEMLİ):
- Canlı Google Trends, arama hacmi, rakip trafiği veya ciro verisine ERİŞİMİN YOK.
- Yüzde artış, arama hacmi, ciro etkisi, pazar payı, sağlık skoru gibi sayısal değerler UYDURMA; bu alanlara "Ölçülmedi" yaz.
- "Google Trends verilerine göre", "son 30 günde" gibi ölçülmüş veri iddiasında bulunma.
- Önerileri genel en iyi uygulama ve uzman görüşü olarak sun; aşağıdaki JSON şablonundaki örnek sayıları kopyalama.

PLATFORM KURALLARI:
- Shopify ise: App Store entegrasyonları, Liquid şablon optimizasyonları, blog altyapısı, uluslararası (multi-language/currency) SEO odaklı panel yönergeleri ver.
- İkas ise: Modern altyapı hız avantajı, kategori ve ürün bazlı meta/title özelleştirmeleri, 301 URL yönlendirme yönetimi odaklı panel yönergeleri ver.
- Ticimax / IdeaSoft ise: Yerli pazar dinamikleri, modüler blok yapıları, XML entegrasyonları, filtreleme (faceted navigation canonical) ve arama motoru optimizasyonuna açık modül alanlarını panel adım adım sekmeleriyle ver.

RAPOR FORMATI (JSON formatında yanıt ver):
{
  "singleSentenceSummary": "Google Trends veya arama verilerinden çekilen anlık verinin markaya etkisini tek cümleyle özetle.",
  "trendsDelta": "+%38",
  "topRisingSearch": "en çok yükselen trend sorgu",
  "seasonalImpact": "mevsimsel / anlık trend etkisi",
  "statusBadge": "Yüksek Fırsat",
  "opportunitySummary": "Hangi anahtar kelimelerde veya hangi coğrafi bölgelerde potansiyel kaçırılıyor net olarak belirt.",
  "regionalShippingAdvantage": "Lokasyon avantajı (Örn: Bursa için aynı gün sevkiyat, bölgesel güven vb.)",
  "missedKeywords": [
    {
      "keyword": "örnek kelime",
      "monthlyVolume": "14.200",
      "searchTrend": "+%32",
      "difficulty": "Düşük",
      "regionPriority": "${location}",
      "intent": "Ticari",
      "opportunityScore": 88
    }
  ],
  "geoOpportunities": [
    {
      "cityOrRegion": "${location}",
      "growthRate": "+%42",
      "localAdvantage": "Bölgesel avantaj analizi",
      "recommendedAction": "Yapılması gereken net yerel aksiyon",
      "marketShareEstimate": "%15 Potansiyel"
    }
  ],
  "platformSteps": [
    {
      "stepNumber": 1,
      "title": "Adım Başlığı",
      "section": "Paneldeki Tam Sekme Yolu",
      "action": "Burada tam olarak ne yapılacağı",
      "exactInputSample": "Yazılacak meta başlığı veya kod örneği",
      "proTip": "Platforma özel uzman ipucu"
    }
  ],
  "expectedImpactSummary": "Bu işlemin organik trafikte ve dönüşüm oranında yaratacağı tahmini etki özeti",
  "estimatedTrafficGrowth": "+40% - +70%",
  "estimatedConversionIncrease": "+1.8x",
  "breakEvenTimeframe": "4 Hafta",
  "projectedRevenueImpact": "Aylık tahmini ek ciro katkısı",
  "healthScore": 72,
  "alarms": [
    {
      "category": "Sıralama Kaybı",
      "metric": "Düşüş gösteren metrik",
      "change": "-%24 Görünürlük",
      "description": "Kötüye giden durum tespiti",
      "immediateAction": "Acil alınması gereken aksiyon",
      "riskSeverity": "Kritik"
    }
  ],
  "futureRiskIndicators": [
    "İleride kötüye gitmemesi için takip edilmesi gereken risk sinyali 1"
  ]
}
Sadece saf JSON çıktısı döndür, markdown ekleme.
`;

      // Uzun strateji raporu: en güçlü ücretsiz model (derin kademe), JSON çıktısı
      const response = await generate({ tier: 'deep', json: true, system: `Sen kıdemli bir SEO & GEO danışmanısın.\n${HONESTY_RULES}`, prompt });
      const parsed = extractJson(response.text);
      if (parsed && parsed.singleSentenceSummary) {
        return formatAiReport(parsed, input, 'gemini-ai');
      }
    } catch (e) {
      if (!(e instanceof AiUnavailableError)) console.warn('Gemini SEO/GEO hatası:', e);
    }
  }

  return null;
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

function formatAiReport(data: any, input: SeoGeoRequest, source: 'gemini-ai' | 'expert-engine'): SeoGeoReportResult {
  const platform = input.platform?.toLowerCase() || 'ikas';
  const platformName = getPlatformDisplayName(platform);

  return {
    id: 'seo-geo-' + Date.now(),
    createdAt: new Date().toISOString(),
    platform,
    niche: input.niche,
    location: input.location,
    websiteUrl: input.websiteUrl,
    trendSignal: {
      singleSentenceSummary: data.singleSentenceSummary || 'Trend verisi ölçülmedi.',
      trendsDelta: data.trendsDelta || 'Ölçülmedi',
      topRisingSearch: data.topRisingSearch || `${input.location} ${input.niche} fiyatları ve modelleri`,
      seasonalImpact: data.seasonalImpact || 'Sezon geçişi ve yerel aramalarda yüksek ivme',
      statusBadge: data.statusBadge || 'Tahmini',
    },
    opportunityArea: {
      summary: data.opportunitySummary || '',
      missedKeywords: Array.isArray(data.missedKeywords) && data.missedKeywords.length > 0 ? data.missedKeywords : [],
      geoOpportunities: Array.isArray(data.geoOpportunities) && data.geoOpportunities.length > 0 ? data.geoOpportunities : [],
      regionalShippingAdvantage: data.regionalShippingAdvantage || '',
    },
    platformGuide: {
      selectedPlatform: platformName,
      panelNavigation: getPlatformPanelNavigation(platform),
      steps: Array.isArray(data.platformSteps) && data.platformSteps.length > 0
        ? data.platformSteps.map((s: any, idx: number) => ({
            stepNumber: s.stepNumber || idx + 1,
            title: s.title || ('Adım ' + (idx + 1)),
            section: s.section || 'Yönetim Paneli',
            action: s.action || '',
            exactInputSample: s.exactInputSample,
            proTip: s.proTip,
          }))
        : getPlatformSteps(platform, input.niche, input.location),
    },
    expectedImpact: {
      summary: data.expectedImpactSummary || 'Etki tahmini yapılmadı.',
      estimatedTrafficGrowth: data.estimatedTrafficGrowth || 'Ölçülmedi',
      estimatedConversionIncrease: data.estimatedConversionIncrease || 'Ölçülmedi',
      breakEvenTimeframe: data.breakEvenTimeframe || 'Ölçülmedi',
      projectedRevenueImpact: data.projectedRevenueImpact || 'Ölçülmedi',
      kpiTargets: [
        { label: 'Organik Tıklama Artışı', value: data.estimatedTrafficGrowth || 'Ölçülmedi' },
        { label: 'Yerel GEO Arama Sıralaması', value: 'Ölçülmedi' },
        { label: 'Tahmini Sepet Dönüşümü', value: data.estimatedConversionIncrease || 'Ölçülmedi' },
        { label: 'Google Dizin Sağlığı', value: 'Ölçülmedi' },
      ],
    },
    // Sağlık skoru gerçek bir site taramasıyla ölçülmez; AI'ın verdiği değer de tahmindir
    healthScore: typeof data.healthScore === 'number' ? data.healthScore : 0,
    trackingRadar: {
      overallStatus: data.alarms && data.alarms.length > 0 ? 'risk_detected' : 'needs_attention',
      statusMessage: 'Aşağıdaki riskler yapay zekâ tarafından öngörülen olası durumlardır; ölçülmüş düşüş değildir.',
      alarms: Array.isArray(data.alarms) && data.alarms.length > 0
        ? data.alarms.map((a: any, i: number) => ({
            id: 'alarm-' + (i + 1),
            type: a.riskSeverity === 'Kritik' ? 'critical' : 'warning',
            category: a.category || 'Sıralama Kaybı',
            metric: a.metric || 'Arama Görünürlüğü',
            change: a.change || 'Ölçülmedi',
            description: a.description || 'Yerel sıralamada gerileme riski.',
            immediateAction: a.immediateAction || 'Kategori meta etiketlerini yerel lokasyon ekleriyle güncelleyin.',
            riskSeverity: a.riskSeverity || 'Yüksek',
          }))
        : [],
      futureRiskIndicators: Array.isArray(data.futureRiskIndicators) && data.futureRiskIndicators.length > 0
        ? data.futureRiskIndicators
        : [],
      monitoringInterval: 'Her 7 Günde Bir Otomatik Tarama ve Alarm Kontrolü',
    },
    intentAndTaxonomy: buildIntentAndTaxonomyStrategy(input.niche, input.location),
    platformTechnicalActions: buildPlatformTechnicalActions(platform, input.niche, input.location),
    schemaMarkup: buildSchemaGeoMarkup(input.websiteUrl || 'https://siteniz.com', input.niche, input.location),
    croTrustSignals: buildCroTrustSignals(input.location, input.niche),
    expectedTechnicalImpact: buildExpectedTechnicalImpact(),
    source,
  };
}

function getPlatformDisplayName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'ikas': return 'İkas E-Ticaret Altyapısı';
    case 'shopify': return 'Shopify Altyapısı';
    case 'ticimax': return 'Ticimax E-Ticaret Sistemi';
    case 'ideasoft': return 'IdeaSoft E-Ticaret Sistemi';
    default: return 'Özel / Kurumsal E-Ticaret Altyapısı';
  }
}

function getPlatformPanelNavigation(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'ikas': return 'İkas Yönetim Paneli > Katalog > Kategoriler / Ürünler > SEO ve URL Yönetimi';
    case 'shopify': return 'Shopify Admin > Online Store > Themes > Edit Code / Preferences / Apps';
    case 'ticimax': return 'Ticimax Panel > Ayarlar > Genel Ayarlar > SEO & Meta Yönetimi / Blok Yönetimi';
    case 'ideasoft': return 'IdeaSoft Panel > Katalog > Kategori & Ürün Yönetimi > Detay > SEO Bilgileri';
    default: return 'Yönetim Paneli > SEO & İçerik Ayarları';
  }
}

function getPlatformSteps(platform: string, niche: string, location: string): StepByStepGuide['steps'] {
  switch (platform.toLowerCase()) {
    case 'shopify':
      return [
        {
          stepNumber: 1,
          title: 'Liquid Şablonunda Coğrafi & Yerel Schema (JSON-LD) Yapılandırması',
          section: 'Shopify Admin > Online Store > Themes > "..." Menüsü > Edit Code',
          action: 'snippets/ klasörü altına seo-geo-schema.liquid dosyası oluşturun ve theme.liquid dosyasının <head> etiketinin hemen içine {% render "seo-geo-schema" %} ekleyin.',
          exactInputSample: '{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Markanız ' + location + '",\n  "description": "' + location + ' bölgesinde en kaliteli ' + niche + ' satışı ve hızlı teslimat.",\n  "areaServed": ["' + location + '", "TR"]\n}',
          proTip: 'Shopify Liquid şablonunda page_description alanına şehir ismini dinamik bağlayarak yerel aramalarda hızlıca indekslenin.',
        },
        {
          stepNumber: 2,
          title: 'Ürün ve Kategori SEO Meta Title / Description Optimizasyonu',
          section: 'Shopify Admin > Products > [Ürün Seç] > En Altta "Search engine listing"',
          action: 'Sayfa başlığını ve meta açıklamasını arama niyetine göre düzenleyin. Başlık 60 karakteri, açıklama 155 karakteri geçmemelidir.',
          exactInputSample: 'Page Title: ' + niche + ' Modelleri & Fiyatları | ' + location + ' Hızlı Kargo\nMeta Description: En yeni ' + niche + ' çeşitleri uygun fiyat avantajıyla. ' + location + ' ve tüm Türkiye\'ye 24 saatte kargo fırsatı!',
          proTip: 'URL and handle kısmını Türkçe karakter içermeyecek şekilde sadeleştirin: /products/bursa-' + niche.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.',
        },
        {
          stepNumber: 3,
          title: 'Blog Altyapısı ile Coğrafi & Sektörel Trafik Çekme',
          section: 'Shopify Admin > Online Store > Blog posts > Create blog post',
          action: location + '\'da ' + niche + ' Seçerken Dikkat Edilmesi Gerekenler başlıklı 800+ kelimelik bir rehber içeriği yayınlayın.',
          exactInputSample: 'H1: ' + location + ' Bölgesinde En İyi ' + niche + ' Nasıl Seçilir? (2026 Rehberi)',
          proTip: 'Shopify Blog yapısında etiketleri ilgili ürün koleksiyonlarıyla eşleştirerek dahili linkleme kurun.',
        },
        {
          stepNumber: 4,
          title: 'App Store Entegrasyonu ile Çoklu Dil & Hız Optimizasyonu',
          section: 'Shopify Admin > Apps > Booster SEO / Langify',
          action: 'Otomatik resim ALT etiketi optimizasyonu ve kırık link (404) takipçisi kurun.',
          proTip: 'Görselleri Shopify CDN üzerinde otomatik WebP formatında sunmak için loading: "lazy" parametresini kullanın.',
        },
      ];

    case 'ikas':
      return [
        {
          stepNumber: 1,
          title: 'İkas Kategori Bazlı Gelişmiş Meta Title ve Açıklama Düzenlemesi',
          section: 'İkas Panel > Katalog > Kategoriler > [Ana Kategori Seç] > Sağ Menü "SEO Ayarları"',
          action: 'Meta başlığını ve meta açıklamasını yerel anahtar kelimeler ve hız avantajı vurgusuyla doldurun.',
          exactInputSample: 'Meta Başlık: ' + niche + ' Fiyatları ve Yeni Sezon Modelleri - ' + location + '\nMeta Açıklama: En kaliteli ' + niche + ' ürünlerini ' + location + ' stoklarından aynı gün kargo avantajıyla sipariş verin.',
          proTip: 'İkas altyapısının sub-second (0.3sn) TTFB hız avantajını öne çıkarmak için kategori açıklaması alanına en az 180 kelimelik zengin metin ekleyin.',
        },
        {
          stepNumber: 2,
          title: 'URL Yönlendirme (301 Redirects) ve Canonical Temizliği',
          section: 'İkas Panel > Ayarlar > Alan Adları & Yönlendirmeler > URL Yönlendirmeleri (301)',
          action: 'Eski veya değişen ürün/kategori linklerini 404 hatasına düşmemesi için 301 kalıcı yönlendirme olarak kaydedin.',
          exactInputSample: 'Eski URL: /eski-' + niche.toLowerCase().replace(/[^a-z0-9]/g, '-') + '\nYeni Hedef: /kategori/' + niche.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          proTip: 'Kırık linkleri ayda bir kontrol etmek İkas mağazanızın tarama bütçesini 3 kat daha verimli kılar.',
        },
        {
          stepNumber: 3,
          title: 'Otomatik XML Site Haritası & Google Search Console Doğrulaması',
          section: 'İkas Panel > Ayarlar > Entegrasyonlar > Google Search Console',
          action: 'İkas tarafından otomatik üretilen sitemap.xml adresini Google Search Console paneline ekleyin.',
          exactInputSample: 'Site Haritası URL: https://siteniz.com/sitemap.xml',
          proTip: 'İkas altyapısında ürün varyasyonları otomatik olarak temiz URL ile canonical etiketi alır.',
        },
        {
          stepNumber: 4,
          title: 'Ürün Detayında Yerel Güven & Sevkiyat Rozetleri (GEO Dönüşüm)',
          section: 'İkas Panel > Tasarım > Tema Düzenleyici > Ürün Detay Sayfası > Blok Ekle',
          action: 'Ürün fiyatının hemen altına "Bölgesel Teslimat Rozeti" bloğu ekleyin.',
          proTip: 'Bu yerel güven rozeti hemen çıkma oranını %35 düşürür.',
        },
      ];

    case 'ticimax':
      return [
        {
          stepNumber: 1,
          title: 'SEO & Meta Yönetimi ile Dinamik Kategori Meta Şablonu Oluşturma',
          section: 'Ticimax Panel > Ayarlar > Genel Ayarlar > SEO & Meta Yönetimi',
          action: 'Kategori sayfaları için dinamik meta şablonu oluşturun. Parametrelere ' + location + ' ekini ekleyin.',
          exactInputSample: 'Kategori Meta Title: {KATEGORI_ADI} Fiyatları & ' + location + ' Sipariş | {MARKA}\nKategori Meta Description: En uygun {KATEGORI_ADI} modellerini ' + location + ' hızlı sevkiyat fırsatıyla inceleyin.',
          proTip: 'Ticimax panelinde "Filtreli Sayfaları Dizine Kapat (Noindex, Follow)" seçeneğini mutlaka aktif edin.',
        },
        {
          stepNumber: 2,
          title: 'Modüler Blok Yapısıyla Kategori Altı SEO İçerik Alanı Eklenmesi',
          section: 'Ticimax Panel > Tasarım & Blok Yönetimi > Sayfa Blokları > Kategori Sayfası',
          action: 'Ürün listelemesinin altına Zengin Metin / HTML Blok sürükleyip bırakın.',
          exactInputSample: '<h2>' + location + ' Bölgesinde Güvenilir ' + niche + ' Alışverişi</h2>\n<p>Sitemiz üzerinden en trend ' + niche + ' koleksiyonlarını sipariş verebilirsiniz...</p>',
          proTip: 'Bu blok yalnızca masaüstünde değil mobil görünümde de ürünlerin altında düzgün akmalıdır.',
        },
        {
          stepNumber: 3,
          title: 'XML Entegrasyonları ve Google Merchant Center Yerel Feed Yönetimi',
          section: 'Ticimax Panel > Entegrasyonlar > XML Çıktıları > Google Merchant XML',
          action: 'Google Merchant Center XML çıktısında yerel stok ve kargo süresi alanlarını güncelleyin.',
          exactInputSample: 'XML Linki: https://siteniz.com/TicimaxXml/GoogleMerchant.xml',
          proTip: 'Stokta tükenen ürünlerin XML beslemesinde otomatik gizlenmesini seçin.',
        },
        {
          stepNumber: 4,
          title: 'Faceted Navigation (Filtreleme) Canonical & Sitemap Düzenlemesi',
          section: 'Ticimax Panel > Ayarlar > Arama Motoru Optimizasyonu (SEO) > URL Yapılandırması',
          action: 'URL formatını "Klasör Yapılı Temiz URL" olarak seçin ve canonical linklerin ana kategoriye yönlendiğini doğrulayın.',
          proTip: 'Sayfalandırma yapısında rel="prev" ve rel="next" etiketlerinin çalıştığından emin olun.',
        },
      ];

    case 'ideasoft':
    default:
      return [
        {
          stepNumber: 1,
          title: 'Kategori Yönetimi SEO Bilgileri ve URL Özelleştirmesi',
          section: 'IdeaSoft Panel > Katalog > Kategori Yönetimi > [Kategori Seç] > Düzenle > SEO Bilgileri',
          action: 'Sayfa başlığı, anahtar kelimeler ve meta açıklama alanlarını yerel arama niyetine göre doldurun.',
          exactInputSample: 'Başlık: ' + niche + ' Çeşitleri ve Güncel Fiyatları - ' + location + '\nAçıklama: Aradığınız en şık ' + niche + ' seçenekleri IdeaSoft güvencesi ve ' + location + ' hızlı kargo fırsatıyla yayında.',
          proTip: 'IdeaSoft panelinde "Otomatik SEO Başlığı Üret" seçeneğini devre dışı bırakıp özelleştirilmiş başlık yazın.',
        },
        {
          stepNumber: 2,
          title: 'Arama Motoru Optimizasyonu (SEO) Genel Kuralları ve Robots.txt',
          section: 'IdeaSoft Panel > Ayarlar > Genel Ayarlar > SEO Ayarları',
          action: 'Robots.txt dosyasında arama filtrelerinin (/search, /filter) botlara engellendiğinden emin olun.',
          exactInputSample: 'User-agent: *\nDisallow: /search/\nDisallow: /cart/\nDisallow: /checkout/\nSitemap: https://siteniz.com/sitemap.xml',
          proTip: 'Sitemap dosyasını her güncellemeden sonra Search Console üzerinden manuel tetikleyin.',
        },
        {
          stepNumber: 3,
          title: 'Kategori Açıklama Editörü ile Yerel GEO Zengin İçerik Girişi',
          section: 'IdeaSoft Panel > Katalog > Kategori Yönetimi > [Kategori] > Kategori Açıklaması',
          action: 'Kategori görselinin altına 250 kelimelik, ' + location + ' yerel avantajlarını anlatan zengin metin ekleyin.',
          exactInputSample: '<h3>' + location + ' İçi Aynı Gün Sipariş Hazırlama ve Hızlı Kargo</h3>\n<p>' + niche + ' kategorisindeki ürünlerimiz merkez depomuzdan özenle paketlenir.</p>',
          proTip: 'Görsellerin alt etiketlerini boş bırakmayın; her görsele anahtar kelime girin.',
        },
        {
          stepNumber: 4,
          title: 'Toplu Ürün Güncelleme ile SEO Başlıklarının Senkronizasyonu',
          section: 'IdeaSoft Panel > Katalog > Toplu İşlemler > Toplu SEO Güncelleme',
          action: 'Tüm ürünlerin meta etiketlerini tek tıkla şablonlayın: [Ürün Adı] - ' + location + ' ' + niche + ' Mağazası.',
          proTip: 'Bu işlem yüzlerce ürünün Google dizinine hızlıca girmesini sağlar.',
        },
      ];
  }
}

