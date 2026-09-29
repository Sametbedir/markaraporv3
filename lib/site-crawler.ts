// lib/site-crawler.ts — Deep Website, Sitemap & Technical Ad Telemetry Inspector

export interface CrawledSiteTelemetry {
  url: string;
  isAccessible: boolean;
  httpStatus?: number;
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  detectedPlatform: 'Shopify' | 'İkas' | 'Ticimax' | 'IdeaSoft' | 'WooCommerce' | 'Özel Altyapı';
  detectedPixels: {
    metaPixel: boolean;
    metaPixelId?: string;
    googleTagManager: boolean;
    gtmId?: string;
    googleAnalytics4: boolean;
    ga4Id?: string;
    tiktokPixel: boolean;
    criteo: boolean;
    hotjarOrClarity: boolean;
  };
  commercialSignals: {
    freeShippingThreshold?: string;
    returnPolicyMentioned?: string;
    paymentMethodsFound: string[];
    hasWhatsappSupport: boolean;
    trustSignalsFound: string[];
  };
  sitemapInfo: {
    sitemapFound: boolean;
    sitemapUrl?: string;
    totalUrlsDetected: number;
    productCount: number;
    categoryCount: number;
    hasLastmod: boolean;
  };
  robotsInfo: {
    robotsFound: boolean;
    hasSitemapDirective: boolean;
    disallowedFilterCount: number;
  };
  schemaTypes: string[];
  technicalHealthScore: number; // 0 - 100
  scanDurationMs: number;
  adsLibraryUrl: string;
  googleAdsTransparencyUrl: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export function buildMetaAdsLibraryUrl(brandName: string): string {
  const cleanName = brandName.replace(/[@#]/g, '').trim();
  return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=TR&q=${encodeURIComponent(cleanName)}&search_type=keyword_unordered&media_type=all`;
}

export function buildGoogleAdsTransparencyUrl(brandName: string): string {
  const cleanName = brandName.replace(/[@#]/g, '').trim();
  return `https://adstransparency.google.com/?region=TR&q=${encodeURIComponent(cleanName)}`;
}

export async function inspectSiteDeep(rawUrl: string, brandName: string): Promise<CrawledSiteTelemetry> {
  const startTime = Date.now();
  let normalizedUrl = rawUrl.trim();
  if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const adsLibraryUrl = buildMetaAdsLibraryUrl(brandName);
  const googleAdsTransparencyUrl = buildGoogleAdsTransparencyUrl(brandName);

  const defaultTelemetry: CrawledSiteTelemetry = {
    url: normalizedUrl || 'Belirtilmedi',
    isAccessible: false,
    detectedPlatform: 'Özel Altyapı',
    detectedPixels: {
      metaPixel: false,
      googleTagManager: false,
      googleAnalytics4: false,
      tiktokPixel: false,
      criteo: false,
      hotjarOrClarity: false,
    },
    commercialSignals: {
      paymentMethodsFound: [],
      hasWhatsappSupport: false,
      trustSignalsFound: [],
    },
    sitemapInfo: {
      sitemapFound: false,
      totalUrlsDetected: 0,
      productCount: 0,
      categoryCount: 0,
      hasLastmod: false,
    },
    robotsInfo: {
      robotsFound: false,
      hasSitemapDirective: false,
      disallowedFilterCount: 0,
    },
    schemaTypes: [],
    technicalHealthScore: 40,
    scanDurationMs: 0,
    adsLibraryUrl,
    googleAdsTransparencyUrl,
  };

  if (!normalizedUrl || normalizedUrl === 'Belirtilmedi') {
    defaultTelemetry.scanDurationMs = Date.now() - startTime;
    return defaultTelemetry;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const origin = parsed.origin;

    // Concurrently fetch Homepage, Sitemap, and Robots.txt (Max 6 seconds timeout)
    const [homeResult, sitemapResult, robotsResult] = await Promise.allSettled([
      fetchWithTimeout(normalizedUrl, 6000),
      fetchWithTimeout(`${origin}/sitemap.xml`, 5000),
      fetchWithTimeout(`${origin}/robots.txt`, 4000),
    ]);

    let html = '';
    let httpStatus = 0;
    if (homeResult.status === 'fulfilled' && homeResult.value.ok) {
      html = await homeResult.value.text();
      httpStatus = homeResult.value.status;
      defaultTelemetry.isAccessible = true;
      defaultTelemetry.httpStatus = httpStatus;
    }

    if (html) {
      // 1. Meta / SEO Data
      defaultTelemetry.title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/i);
      defaultTelemetry.metaDescription = extractAttribute(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      defaultTelemetry.canonicalUrl = extractAttribute(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);

      // 2. Platform Detection
      defaultTelemetry.detectedPlatform = detectPlatform(html);

      // 3. Pixel & Tracking Detection
      defaultTelemetry.detectedPixels = detectPixels(html);

      // 4. Commercial & Trust Signals
      defaultTelemetry.commercialSignals = detectCommercialSignals(html);

      // 5. Schema Types (JSON-LD)
      defaultTelemetry.schemaTypes = detectSchemas(html);
    }

    // 6. Sitemap Inspection
    if (sitemapResult.status === 'fulfilled' && sitemapResult.value.ok) {
      const sitemapXml = await sitemapResult.value.text();
      defaultTelemetry.sitemapInfo = analyzeSitemap(sitemapXml, `${origin}/sitemap.xml`);
    } else {
      // Try sitemap_index.xml if sitemap.xml failed
      try {
        const sitemapIndexRes = await fetchWithTimeout(`${origin}/sitemap_index.xml`, 4000);
        if (sitemapIndexRes.ok) {
          const sitemapXml = await sitemapIndexRes.text();
          defaultTelemetry.sitemapInfo = analyzeSitemap(sitemapXml, `${origin}/sitemap_index.xml`);
        }
      } catch {}
    }

    // 7. Robots.txt Inspection
    if (robotsResult.status === 'fulfilled' && robotsResult.value.ok) {
      const robotsTxt = await robotsResult.value.text();
      defaultTelemetry.robotsInfo = analyzeRobots(robotsTxt);
    }

    // 8. Calculate Technical Health Score
    defaultTelemetry.technicalHealthScore = calculateHealthScore(defaultTelemetry);
  } catch (err) {
    console.warn(`[SiteCrawler] Site incelenirken hata (${normalizedUrl}):`, err);
  }

  defaultTelemetry.scanDurationMs = Date.now() - startTime;
  return defaultTelemetry;
}

function detectPlatform(html: string): CrawledSiteTelemetry['detectedPlatform'] {
  const lower = html.toLowerCase();
  if (lower.includes('cdn.shopify.com') || lower.includes('window.shopify') || lower.includes('myshopify.com')) {
    return 'Shopify';
  }
  if (lower.includes('cdn.myikas.com') || lower.includes('ikas.com') || lower.includes('ikas-')) {
    return 'İkas';
  }
  if (lower.includes('ticimax.com') || lower.includes('cdn.ticimax.com') || lower.includes('ticimax')) {
    return 'Ticimax';
  }
  if (lower.includes('ideasoft.com.tr') || lower.includes('cdn.ideasoft.com') || lower.includes('ideasoft')) {
    return 'IdeaSoft';
  }
  if (lower.includes('wp-content') || lower.includes('woocommerce')) {
    return 'WooCommerce';
  }
  return 'Özel Altyapı';
}

function detectPixels(html: string): CrawledSiteTelemetry['detectedPixels'] {
  const lower = html.toLowerCase();

  // Meta Pixel & ID
  const hasMeta = lower.includes('connect.facebook.net') || lower.includes('fbevents.js') || lower.includes("fbq('init'");
  let metaId: string | undefined;
  const metaMatch = html.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i);
  if (metaMatch && metaMatch[1]) {
    metaId = metaMatch[1];
  }

  // Google Tag Manager
  const hasGtm = lower.includes('googletagmanager.com/gtm.js');
  let gtmId: string | undefined;
  const gtmMatch = html.match(/GTM-[A-Z0-9]+/i);
  if (gtmMatch) {
    gtmId = gtmMatch[0];
  }

  // GA4
  const hasGa4 = lower.includes('googletagmanager.com/gtag/js') || lower.includes("gtag('config'");
  let ga4Id: string | undefined;
  const ga4Match = html.match(/G-[A-Z0-9]{8,12}/i);
  if (ga4Match) {
    ga4Id = ga4Match[0];
  }

  // TikTok Pixel
  const hasTiktok = lower.includes('analytics.tiktok.com') || lower.includes('ttq.load') || lower.includes('ttq.page');

  // Criteo / RTB House
  const hasCriteo = lower.includes('static.criteo.net') || lower.includes('criteo_q');

  // Hotjar / Microsoft Clarity
  const hasHotjarClarity = lower.includes('static.hotjar.com') || lower.includes('clarity.ms/tag');

  return {
    metaPixel: hasMeta,
    metaPixelId: metaId,
    googleTagManager: hasGtm,
    gtmId,
    googleAnalytics4: hasGa4,
    ga4Id,
    tiktokPixel: hasTiktok,
    criteo: hasCriteo,
    hotjarOrClarity: hasHotjarClarity,
  };
}

function detectCommercialSignals(html: string): CrawledSiteTelemetry['commercialSignals'] {
  const lower = html.toLowerCase();

  // Free shipping regex
  let freeShipping: string | undefined;
  const shipMatch = html.match(/(\d{3,4})\s*(?:TL|₺)\s*(?:ve\s*üzeri|üzeri)?\s*(?:ücretsiz\s*kargo|kargo\s*bedava)/i);
  if (shipMatch) {
    freeShipping = `${shipMatch[1]} TL Üzeri Ücretsiz Kargo`;
  } else if (lower.includes('kargo bedava') || lower.includes('ücretsiz kargo')) {
    freeShipping = 'Ücretsiz Kargo Avantajı Var (Eşik Belirtilmemiş)';
  }

  // Return policy
  let returnPolicy: string | undefined;
  if (lower.includes('14 gün') && (lower.includes('iade') || lower.includes('değişim'))) {
    returnPolicy = '14 Gün Koşulsuz İade & Değişim';
  } else if (lower.includes('30 gün') && lower.includes('iade')) {
    returnPolicy = '30 Gün Genişletilmiş İade';
  } else if (lower.includes('kolay iade') || lower.includes('ücretsiz iade')) {
    returnPolicy = 'Kolay / Ücretsiz İade Güvencesi';
  }

  // Payment methods
  const paymentMethods: string[] = [];
  if (lower.includes('taksit') || lower.includes('peşin fiyatına')) paymentMethods.push('Taksit İmkanı');
  if (lower.includes('kapıda ödeme')) paymentMethods.push('Kapıda Nakit/Kart');
  if (lower.includes('havale') || lower.includes('eft')) paymentMethods.push('Havale/EFT İndirimi');
  if (lower.includes('iyzico') || lower.includes('paytr') || lower.includes('param')) paymentMethods.push('Güvenli Ödeme Altyapısı (İyzico/PayTR/Param)');

  // Trust signals
  const trustSignals: string[] = [];
  if (lower.includes('256 bit') || lower.includes('ssl') || lower.includes('güvenli ödeme')) trustSignals.push('256-Bit SSL Sertifikası');
  if (lower.includes('orijinal') || lower.includes('orijinallik garantisi')) trustSignals.push('%100 Orijinal Ürün Garantisi');
  if (lower.includes('aynı gün kargo')) trustSignals.push('Aynı Gün Kargo Taahhüdü');
  if (lower.includes('yerli üretim')) trustSignals.push('Yerli Üretim Güvencesi');

  const hasWhatsapp = lower.includes('api.whatsapp.com') || lower.includes('wa.me') || lower.includes('whatsapp');

  return {
    freeShippingThreshold: freeShipping,
    returnPolicyMentioned: returnPolicy,
    paymentMethodsFound: paymentMethods,
    hasWhatsappSupport: hasWhatsapp,
    trustSignalsFound: trustSignals,
  };
}

function detectSchemas(html: string): string[] {
  const schemas = new Set<string>();
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      findTypes(parsed, schemas);
    } catch {}
  }
  return Array.from(schemas);
}

function findTypes(obj: any, set: Set<string>) {
  if (!obj) return;
  if (typeof obj === 'object') {
    if (obj['@type']) {
      if (Array.isArray(obj['@type'])) {
        obj['@type'].forEach((t: string) => set.add(String(t)));
      } else {
        set.add(String(obj['@type']));
      }
    }
    for (const k of Object.keys(obj)) {
      findTypes(obj[k], set);
    }
  }
}

function analyzeSitemap(xml: string, url: string): CrawledSiteTelemetry['sitemapInfo'] {
  const totalUrls = (xml.match(/<loc>/gi) || []).length;
  const products = (xml.match(/<loc>[^<]*(?:\/products\/|\/urun\/|\/p\/|\/item\/)[^<]*<\/loc>/gi) || []).length;
  const categories = (xml.match(/<loc>[^<]*(?:\/collections\/|\/kategori\/|\/c\/|\/category\/)[^<]*<\/loc>/gi) || []).length;
  const hasLastmod = xml.includes('<lastmod>');

  return {
    sitemapFound: totalUrls > 0,
    sitemapUrl: url,
    totalUrlsDetected: totalUrls,
    productCount: products > 0 ? products : Math.round(totalUrls * 0.7),
    categoryCount: categories > 0 ? categories : Math.max(1, Math.round(totalUrls * 0.1)),
    hasLastmod,
  };
}

function analyzeRobots(txt: string): CrawledSiteTelemetry['robotsInfo'] {
  const hasSitemap = /sitemap:\s*https?:\/\//i.test(txt);
  const disallowMatches = txt.match(/Disallow:\s*[^\r\n]+/gi) || [];
  const filterRules = disallowMatches.filter((r) => r.includes('?') || r.includes('filter') || r.includes('sort')).length;

  return {
    robotsFound: true,
    hasSitemapDirective: hasSitemap,
    disallowedFilterCount: filterRules,
  };
}

function calculateHealthScore(t: CrawledSiteTelemetry): number {
  let score = 30;
  if (t.isAccessible) score += 10;
  if (t.title && t.title.length > 10) score += 10;
  if (t.metaDescription && t.metaDescription.length > 30) score += 10;
  if (t.canonicalUrl) score += 10;
  if (t.detectedPixels.metaPixel) score += 10;
  if (t.detectedPixels.googleAnalytics4 || t.detectedPixels.googleTagManager) score += 10;
  if (t.sitemapInfo.sitemapFound) score += 10;
  return Math.min(100, score);
}

function extractTag(html: string, regex: RegExp): string | undefined {
  const match = html.match(regex);
  return match && match[1] ? match[1].trim() : undefined;
}

function extractAttribute(html: string, regex: RegExp): string | undefined {
  const match = html.match(regex);
  return match && match[1] ? match[1].trim() : undefined;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
