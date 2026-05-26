import { Helmet } from 'react-helmet-async';

interface PriceData {
  priceCurrency: string;
  price: string;
  storeName: string;
  availability?: string;
}

interface ProductData {
  name: string;
  description: string;
  image: string;
  releaseDate?: string;
  prices: PriceData[];
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  product?: ProductData;
}

const PRIMARY_DOMAINS = ['https://sirodin.nl', 'https://serpodin.nl'];
const DEFAULT_ORIGIN = PRIMARY_DOMAINS[0];

function toAbsoluteUrl(value: string, origin: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${origin}${normalizedPath}`;
}

export default function SEO({
  title = 'Sirodin - Game Prijsvergelijking | Beste Game Deals & Kortingen',
  description = 'Vergelijk game prijzen van 30+ winkels zoals Steam, GOG, Humble Bundle en meer. Vind de beste deals, volg prijsgeschiedenis en krijg prijsalerts voor je favoriete games.',
  keywords = 'game prijzen, game deals, game korting, steam prijzen, pc games goedkoop, game prijsvergelijking, beste game deals',
  image = '/og-image.png',
  url = '/',
  type = 'website',
  product,
}: SEOProps) {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_ORIGIN;
  const fullUrl = toAbsoluteUrl(url, currentOrigin);
  const fullImage = toAbsoluteUrl(image, currentOrigin);
  const fullTitle = title.includes('Sirodin') ? title : `${title} | Sirodin`;
  const parsedUrl = new URL(fullUrl);
  const pathAndQuery = `${parsedUrl.pathname}${parsedUrl.search}`;
  const alternateDomainUrls = PRIMARY_DOMAINS.map((domain) => `${domain}${pathAndQuery}`);

  // Build Product schema for Google
  const productSchema = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: product.prices.map(p => ({
      '@type': 'Offer',
      url: fullUrl,
      priceCurrency: p.priceCurrency,
      price: p.price,
      seller: {
        '@type': 'Organization',
        name: p.storeName,
      },
      availability: p.availability || 'https://schema.org/InStock',
    })),
    ...(product.releaseDate && { releaseDate: product.releaseDate }),
    gamePlatform: 'PC',
  } : null;

  return (
    <Helmet>
      <link rel="dns-prefetch" href="//cdn.cloudflare.steamstatic.com" />
      <link rel="preconnect" href="https://cdn.cloudflare.steamstatic.com" crossOrigin="anonymous" />

      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />
      {alternateDomainUrls.map((altUrl) => (
        <link key={altUrl} rel="alternate" hrefLang="nl" href={altUrl} />
      ))}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Product + Pricing Schema for Google Shopping */}
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
    </Helmet>
  );
}

export { SEO };
