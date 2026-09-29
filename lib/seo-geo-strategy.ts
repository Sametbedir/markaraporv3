// lib/seo-geo-strategy.ts

export interface FunnelIntentStage {
  stage: 'Informational (Bilgi Arayışı)' | 'Commercial (Ticari İnceleme)' | 'Transactional (Satın Alma)';
  funnelPosition: 'Top of Funnel (TOFU)' | 'Middle of Funnel (MOFU)' | 'Bottom of Funnel (BOFU)';
  searchQueries: string[];
  targetPageType: string;
  architectureRule: string;
}

export interface IntentAndTaxonomyStrategy {
  funnelStages: FunnelIntentStage[];
  cannibalizationRisk: {
    summary: string;
    slugVsBodyRule: string;
    preventionSteps: string[];
  };
}

export interface PlatformTechnicalActions {
  platformName: string;
  panelNavigation: string;
  crawlBudgetStrategy: {
    panelRoute: string;
    facetedNavAction: string;
    canonicalRule: string;
    codeOrConfigSnippet?: string;
  };
  coreWebVitalsStrategy: {
    lcpOptimization: string;
    domNodeReduction: string;
    clsProtection: string;
  };
}

export interface SchemaGeoMarkup {
  title: string;
  explanation: string;
  targetPlacement: string;
  jsonLdCode: string;
}

export interface CroTrustSignal {
  locationArea: string;
  component: string;
  technicalSignal: string;
  expectedBehaviorImpact: string;
}

export interface ExpectedTechnicalImpact {
  summary: string;
  ctrImpact: string;
  crawlBudgetEfficiency: string;
  indexabilityGrowth: string;
  coreWebVitalsTarget: string;
  kpiTargets: { label: string; value: string; metricType: 'technical' | 'geo' | 'ux' }[];
}

export function buildIntentAndTaxonomyStrategy(niche: string, location: string): IntentAndTaxonomyStrategy {
  return {
    funnelStages: [
      {
        stage: 'Informational (Bilgi Arayışı)',
        funnelPosition: 'Top of Funnel (TOFU)',
        searchQueries: [
          niche + ' seçerken nelere dikkat edilmeli',
          'en kaliteli ' + niche + ' materyalleri ve kumaş özellikleri',
          niche + ' temizlik ve uzun ömürlü bakım rehberi',
        ],
        targetPageType: 'Blog Dizini (/blog/*) veya Rehber Merkezi',
        architectureRule: 'Asla doğrudan ticari kategori sayfalarına hedeflenmemelidir. Bilgi odaklı rehber içeriklerin sonuna en çok satan kategorilere dofollow dahili link yerleştirilmelidir.',
      },
      {
        stage: 'Commercial (Ticari İnceleme)',
        funnelPosition: 'Middle of Funnel (MOFU)',
        searchQueries: [
          'en iyi ' + location + ' ' + niche + ' markaları',
          niche + ' fiyatları ve toptan perakende karşılaştırması',
          'orijinal ' + niche + ' kullanıcı yorumları ve tavsiyeleri',
        ],
        targetPageType: 'Zenginleştirilmiş Kategori Açılış Sayfası (/kategori/*)',
        architectureRule: 'Kategori sayfasında filtre blokları ve kategori altı H2 başlıklı teknik özellik karşılaştırma metinleri yer almalıdır.',
      },
      {
        stage: 'Transactional (Satın Alma)',
        funnelPosition: 'Bottom of Funnel (BOFU)',
        searchQueries: [
          location + ' ' + niche + ' satın al aynı gün kargo',
          'indirimli ' + niche + ' sipariş ver kapıda ödeme',
          'ucuz ' + niche + ' modelleri hızlı teslimat',
        ],
        targetPageType: 'Filtrelenmiş Derin Kategori veya Doğrudan Ürün Detay Sayfası (PDP)',
        architectureRule: 'Doğrudan sepete ekleme butonları, net stok göstergesi ve bölgesel kargo sayacı içermelidir. Sayfalandırma canonical ile ana kategoriye bağlanmalıdır.',
      },
    ],
    cannibalizationRisk: {
      summary: niche + ' kategorisinde alt kategoriler ile dinamik filtre sayfalarının aynı anahtar kelimeleri hedeflemesi arama motorunda indeks gücünü bölmektedir.',
      slugVsBodyRule: 'Sabit arama hacmi olan niteleyiciler statik URL slug (/kategori/alt-kategori) almalıdır. Boyut, renk, fiyat gibi dinamik varyasyonlar ise URL slug almamalı, filtre HTML gövdesinde tutulup canonical ana kategoriye yönlendirilmelidir.',
      preventionSteps: [
        'Kök kategori URL yapısını temiz tutun: /kategori-adi/ (asla /kategori-adi?page=1 gibi parametreleri dizine sokmayın).',
        'Renk ve beden filtrelerine <meta name="robots" content="noindex, follow"> ekleyerek arama motoru tarama bütçesini koruyun.',
        'Kategori sayfasında H1 etiketini yalnızca 1 kez kullanın; kategori içi filtrelerdeki başlıkları <span> veya <h4> olarak bırakın.',
        'Birbiriyle yarışan iki ürün/kategori tespit edildiğinde zayıf olanı güçlü olana 301 kalıcı yönlendirmeyle birleştirin.',
      ],
    },
  };
}

export function buildPlatformTechnicalActions(platform: string, niche: string, location: string): PlatformTechnicalActions {
  switch (platform.toLowerCase()) {
    case 'shopify':
      return {
        platformName: 'Shopify Altyapısı',
        panelNavigation: 'Shopify Admin > Online Store > Themes > Edit Code (theme.liquid & main-collection.liquid)',
        crawlBudgetStrategy: {
          panelRoute: 'Online Store > Themes > Actions > Edit Code > Snippets > pagination.liquid & layout/theme.liquid',
          facetedNavAction: 'Koleksiyon filtrelerinde etiket kombinasyonları (/collections/kategori/etiket1+etiket2) Googlebot için sonsuz tarama tuzağı (crawl trap) üretir. Bu sayfalar robots noindex etiketi almalıdır.',
          canonicalRule: 'Filtrelenmiş ve etiketli sayfaların canonical URL değeri daima temiz ana koleksiyon URL\'sine işaret etmelidir.',
          codeOrConfigSnippet: '{%- if current_tags -%}\n  <meta name="robots" content="noindex, follow">\n  <link rel="canonical" href="{{ shop.url }}{{ collection.url }}">\n{%- elsif template contains "collection" and current_page > 1 -%}\n  <meta name="robots" content="noindex, follow">\n  <link rel="canonical" href="{{ shop.url }}{{ collection.url }}">\n{%- else -%}\n  <link rel="canonical" href="{{ canonical_url }}">\n{%- endif -%}',
        },
        coreWebVitalsStrategy: {
          lcpOptimization: 'Koleksiyondaki ilk 4 ürün görselinde loading="eager" ve fetchpriority="high" kullanarak LCP süresini 1.0 saniyenin altına indirin.',
          domNodeReduction: 'Kategori şablonunda DOM element sayısını 800 node altında tutun; gereksiz iç içe flex/grid wrapper divlerini temizleyin.',
          clsProtection: 'Görsellerde width ve height niteliklerini zorunlu kılarak sayfa yüklenirken ürün gridinin kaymasını (CLS) önleyin.',
        },
      };

    case 'ikas':
      return {
        platformName: 'İkas E-Ticaret Altyapısı',
        panelNavigation: 'İkas Panel > Katalog > Kategoriler > SEO Ayarları & 301 Yönlendirmeler',
        crawlBudgetStrategy: {
          panelRoute: 'İkas Panel > Ayarlar > Alan Adları ve Yönlendirmeler > URL Yönlendirmeleri (301)',
          facetedNavAction: 'İkas modern headless mimarisinde filtreler istemci tarafında işlenir; parametreli linklerin arama motoru dizinine sızması engellenmiştir.',
          canonicalRule: 'Tüm ürün varyasyonları otomatik olarak temiz ana ürün URL\'sine canonical bağlantısı alır.',
          codeOrConfigSnippet: 'Eski veya Silinmiş URL: /kategori/eski-sezon-' + niche.toLowerCase().replace(/[^a-z0-9]/g, '-') + '\nHedef Yönlendirme (301): /kategori/' + niche.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        },
        coreWebVitalsStrategy: {
          lcpOptimization: 'İkas 0.3sn TTFB hız avantajını korumak için kategori SEO metinlerini ürün listelemesinin ALTINA (Footer öncesi) konumlandırın.',
          domNodeReduction: 'Ürün kartlarında gereksiz etiket yığınlarını kaldırarak mobil cihazlarda DOM render süresini kısaltın.',
          clsProtection: 'Kategori afişlerinde sabit en/boy oranı (aspect-ratio: 16/9) kullanarak görsel yüklenmeden önce alanın rezerve edilmesini sağlayın.',
        },
      };

    case 'ticimax':
      return {
        platformName: 'Ticimax E-Ticaret Sistemi',
        panelNavigation: 'Ticimax Panel > Ayarlar > Genel Ayarlar > SEO & Meta Yönetimi / Blok Yönetimi',
        crawlBudgetStrategy: {
          panelRoute: 'Ticimax Panel > Ayarlar > Arama Motoru Optimizasyonu (SEO) > URL Yapılandırması',
          facetedNavAction: 'Panelden "Filtreli Sayfaları Dizine Kapat (Noindex, Follow)" seçeneğini aktif edin. Marka, beden, fiyat filtrelerinin taranmasını önleyin.',
          canonicalRule: 'Filtrelenmiş sayfalarda canonical bağlantısının doğrudan filtrelenmemiş ana kategoriye işaret etmesini zorunlu kılın.',
          codeOrConfigSnippet: '<meta name="robots" content="noindex, follow" />\n<link rel="canonical" href="https://siteniz.com/kategori-adi" />',
        },
        coreWebVitalsStrategy: {
          lcpOptimization: 'Kategori açıklama zengin metnini "Tasarım & Blok Yönetimi" üzerinden ürün gridinin altına taşıyın.',
          domNodeReduction: 'İç içe tablo ve modül bloklarını sadeleştirerek sayfa DOM element sayısını 750 node altında tutun.',
          clsProtection: 'Slider ve banner modüllerinde otomatik yükseklik değişimini engelleyin.',
        },
      };

    case 'ideasoft':
    default:
      return {
        platformName: 'IdeaSoft E-Ticaret Sistemi',
        panelNavigation: 'IdeaSoft Panel > Ayarlar > Genel Ayarlar > SEO Ayarları > Robots.txt & Kategori SEO',
        crawlBudgetStrategy: {
          panelRoute: 'IdeaSoft Panel > Ayarlar > Genel Ayarlar > SEO Ayarları > Robots.txt',
          facetedNavAction: 'Robots.txt dosyasında filtreleme ve sıralama parametrelerinin taranmasını engelleyin.',
          canonicalRule: 'Kategori detayında canonical URL\'in kök kategoriye yönlendirildiğini doğrulayın.',
          codeOrConfigSnippet: 'User-agent: *\nDisallow: /search/\nDisallow: /filter/\nDisallow: /sort/\nDisallow: *?*sort=*\nDisallow: *?*filter=*\nDisallow: /sepetim/\nDisallow: /odeme/\nSitemap: https://siteniz.com/sitemap.xml',
        },
        coreWebVitalsStrategy: {
          lcpOptimization: 'Kategori başlığı altındaki görseli kaldırıp doğrudan ürünleri öne çıkarın; LCP süresini 0.9 saniyeye çekin.',
          domNodeReduction: 'Gereksiz sayaç ve yan modülleri mobilde gizleyerek DOM boyutunu optimize edin.',
          clsProtection: 'Ürün grid resimlerinde sabit min-height tanımlayarak sayfa zıplamalarını engelleyin.',
        },
      };
  }
}

export function buildSchemaGeoMarkup(websiteUrl: string, niche: string, location: string): SchemaGeoMarkup {
  const cleanUrl = (websiteUrl || 'https://siteniz.com').replace(/\/$/, '');
  const jsonLd = '{\n' +
    '  "@context": "https://schema.org",\n' +
    '  "@graph": [\n' +
    '    {\n' +
    '      "@type": "LocalBusiness",\n' +
    '      "@id": "' + cleanUrl + '/#organization",\n' +
    '      "name": "Markanız ' + location + '",\n' +
    '      "url": "' + cleanUrl + '",\n' +
    '      "logo": "' + cleanUrl + '/logo.png",\n' +
    '      "description": "' + location + ' merkezli depomuzdan Türkiye geneline ve bölgesel adreslere aynı gün kargo avantajıyla kaliteli ' + niche + ' satışı.",\n' +
    '      "telephone": "+90-000-000-0000",\n' +
    '      "priceRange": "₺₺",\n' +
    '      "address": {\n' +
    '        "@type": "PostalAddress",\n' +
    '        "streetAddress": "Merkez Sanayi Bölgesi, No: 1",\n' +
    '        "addressLocality": "' + location + '",\n' +
    '        "addressRegion": "' + location + '",\n' +
    '        "postalCode": "16000",\n' +
    '        "addressCountry": "TR"\n' +
    '      },\n' +
    '      "geo": {\n' +
    '        "@type": "GeoCoordinates",\n' +
    '        "latitude": 40.2185,\n' +
    '        "longitude": 28.9324\n' +
    '      },\n' +
    '      "areaServed": [\n' +
    '        {\n' +
    '          "@type": "AdministrativeArea",\n' +
    '          "name": "' + location + '"\n' +
    '        },\n' +
    '        {\n' +
    '          "@type": "AdministrativeArea",\n' +
    '          "name": "İstanbul"\n' +
    '        },\n' +
    '        {\n' +
    '          "@type": "AdministrativeArea",\n' +
    '          "name": "İzmir"\n' +
    '        },\n' +
    '        {\n' +
    '          "@type": "Country",\n' +
    '          "name": "Türkiye"\n' +
    '        }\n' +
    '      ]\n' +
    '    },\n' +
    '    {\n' +
    '      "@type": "Product",\n' +
    '      "@id": "' + cleanUrl + '/urun/ornek-urun#product",\n' +
    '      "name": "' + niche + ' Örnek Ürün",\n' +
    '      "description": "' + location + ' üretimi ve hızlı teslimat güvencesiyle sunulan orijinal ' + niche + '.",\n' +
    '      "sku": "MRK-1001",\n' +
    '      "brand": {\n' +
    '        "@type": "Brand",\n' +
    '        "name": "Markanız"\n' +
    '      },\n' +
    '      "offers": {\n' +
    '        "@type": "Offer",\n' +
    '        "url": "' + cleanUrl + '/urun/ornek-urun",\n' +
    '        "priceCurrency": "TRY",\n' +
    '        "price": "899.90",\n' +
    '        "priceValidUntil": "2027-12-31",\n' +
    '        "itemCondition": "https://schema.org/NewCondition",\n' +
    '        "availability": "https://schema.org/InStock",\n' +
    '        "seller": {\n' +
    '          "@id": "' + cleanUrl + '/#organization"\n' +
    '        },\n' +
    '        "shippingDetails": {\n' +
    '          "@type": "OfferShippingDetails",\n' +
    '          "shippingRate": {\n' +
    '            "@type": "MonetaryAmount",\n' +
    '            "value": "0.00",\n' +
    '            "currency": "TRY"\n' +
    '          },\n' +
    '          "shippingDestination": {\n' +
    '            "@type": "DefinedRegion",\n' +
    '            "addressCountry": "TR"\n' +
    '          },\n' +
    '          "deliveryTime": {\n' +
    '            "@type": "ShippingDeliveryTime",\n' +
    '            "handlingTime": {\n' +
    '              "@type": "QuantitativeValue",\n' +
    '              "minValue": 0,\n' +
    '              "maxValue": 1,\n' +
    '              "unitCode": "DAY"\n' +
    '            },\n' +
    '            "transitTime": {\n' +
    '              "@type": "QuantitativeValue",\n' +
    '              "minValue": 1,\n' +
    '              "maxValue": 2,\n' +
    '              "unitCode": "DAY"\n' +
    '            }\n' +
    '          }\n' +
    '        }\n' +
    '      }\n' +
    '    }\n' +
    '  ]\n' +
    '}';

  return {
    title: 'LocalBusiness & Product Offer GEO Schema (JSON-LD)',
    explanation: 'Bu yapısal veri; arama motorlarına fiziksel operasyon bölgenizi, hızlı teslimat vaadinizi ve yerel stok uygunluğunuzu net olarak iletir.',
    targetPlacement: 'Tüm sayfalarda <head> etiketleri arasına veya sitenin genel script yönetim alanına yapıştırılmalıdır.',
    jsonLdCode: jsonLd,
  };
}

export function buildCroTrustSignals(location: string, niche: string): CroTrustSignal[] {
  return [
    {
      locationArea: "Site Geneli Header (Top Bar)",
      component: "Dinamik Lokasyon Bildirim Çubuğu (Geo-IP)",
      technicalSignal: "Kullanıcının IP konumuna göre dinamik render: \"📍 " + location + " ve Marmara Bölgesi'ne 24 Saatte Hızlı Teslimat & Ücretsiz Kargo\"",
      expectedBehaviorImpact: "Hemen çıkma oranını düşürür, bölgesel güven sinyali oluşturur.",
    },
    {
      locationArea: "Ürün Detay Sayfası (PDP)",
      component: "Dinamik Teslimat Geri Sayım Sayacı (Countdown)",
      technicalSignal: "\"⏰ Saat 15:00'e kadar sipariş verirseniz BUGÜN depomuzdan yola çıkıyor!\" sayacı",
      expectedBehaviorImpact: "Aciliyet hissi oluşturarak aynı gün sepete atma oranını artırır.",
    },
    {
      locationArea: 'Ürün Detay Sayfası (PDP)',
      component: 'Yerel Depo & Orijinallik Güven Rozetleri',
      technicalSignal: 'Sepete Ekle butonunun altına 3 ikonlu blok: 1) Merkez Depodan Direkt Gönderim, 2) 14 Gün Koşulsuz İade, 3) 256-Bit SSL Güvenli Ödeme',
      expectedBehaviorImpact: 'Ödeme adımı öncesi müşteri tereddütlerini ve sepet terk oranını azaltır.',
    },
    {
      locationArea: 'Mini Sepet & Sepet Sayfası',
      component: 'Ücretsiz Kargo İlerleme Çubuğu (Progress Bar)',
      technicalSignal: '"Ücretsiz teslimat fırsatına ulaşmak için son 85 TL!" dinamik tutar hesaplayıcı',
      expectedBehaviorImpact: 'Ortalama sepet tutarını (AOV) yukarı taşır.',
    },
    {
      locationArea: 'Ödeme Sayfası (Checkout)',
      component: 'Bölgesel Teslimat Süresi Vurgusu',
      technicalSignal: 'Adres formunda ' + location + ' veya komşu iller seçildiğinde "Ortalama teslimat süresi: 1 iş günü" etiketi belirmesi',
      expectedBehaviorImpact: 'Ödeme aşamasında terk edilme (checkout abandonment) oranını minimize eder.',
    },
  ];
}

export function buildExpectedTechnicalImpact(): ExpectedTechnicalImpact {
  return {
    summary: 'Önerilen taksonomi, faceted canonical kuralları ve LocalBusiness/Product schema uygulamaları neticesinde tarama bütçesi israfı sıfırlanacak, Googlebot derin indeksleme hızı maksimize edilecektir.',
    ctrImpact: '+%25 - +%40 Arama Sonuçları Tıklama Oranı (CTR) Artışı (Zengin Snippet & Yerel Rozetler ile)',
    crawlBudgetEfficiency: '%70 Daha Verimli Tarama Bütçesi (Parametreli URL engellemesi ile boş taramalar engellenir)',
    indexabilityGrowth: '24-48 Saat İçinde Yeni Ürün & Kategori İndekslenme Hızı',
    coreWebVitalsTarget: 'LCP < 1.0s | CLS < 0.02 | DOM Node < 800',
    kpiTargets: [
      { label: 'Organik Tıklama Oranı (CTR)', value: '+%32 Artış', metricType: 'technical' },
      { label: 'Tarama Bütçesi İsrafı', value: '%0 (Noindex & Canonical)', metricType: 'technical' },
      { label: 'Google Dizin Sağlığı', value: '99/100', metricType: 'technical' },
      { label: 'Mobil LCP Skoru', value: '< 1.0 Saniye', metricType: 'technical' },
      { label: 'DOM Element Sayısı', value: '< 750 Node', metricType: 'technical' },
      { label: 'Sepete Ekleme (Add-to-Cart)', value: 'Pozitif Sinyal (+%22)', metricType: 'ux' },
    ],
  };
}
