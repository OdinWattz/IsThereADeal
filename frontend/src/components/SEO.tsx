import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export default function SEO({
  title = 'Serpodin - Game Prijsvergelijking | Beste Game Deals & Kortingen',
  description = 'Vergelijk game prijzen van 30+ winkels zoals Steam, GOG, Humble Bundle en meer. Vind de beste deals, volg prijsgeschiedenis en krijg prijsalerts voor je favoriete games.',
  keywords = 'game prijzen, game deals, game korting, steam prijzen, pc games goedkoop, game prijsvergelijking, beste game deals',
  image = 'https://serpodin.nl/og-image.png',
  url = 'https://serpodin.nl/',
  type = 'website'
}: SEOProps) {
  const fullTitle = title.includes('Serpodin') ? title : `${title} | Serpodin`;

  return (
    <Helmet>
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
    </Helmet>
  );
}
