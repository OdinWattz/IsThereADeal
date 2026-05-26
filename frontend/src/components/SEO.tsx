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

export default function SEO({
  title = 'Sirodin - Game Prijsvergelijking | Beste Game Deals & Kortingen',
  description = 'Vergelijk game prijzen van 30+ winkels zoals Steam, GOG, Humble Bundle en meer. Vind de beste deals, volg prijsgeschiedenis en krijg prijsalerts voor je favoriete games.',
  keywords = 'game prijzen, game deals, game korting, steam prijzen, pc games goedkoop, game prijsvergelijking, beste game deals',
  image = 'https://sirodin.nl/og-image.png',
  url = 'https://sirodin.nl/',
  type = 'website',
  product,
}: SEOProps) {
  const fullTitle = title.includes('Sirodin') ? title : `${title} | Sirodin`;

  // Build Product schema for Google
  const productSchema = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: product.prices.map(p => ({
      '@type': 'Offer',
      url,
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
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

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
