# SEO Implementatie voor serpodin.nl

## 📦 Wat is er geïmplementeerd?

### 1. HTML Meta Tags (`frontend/index.html`)

✅ **Basis SEO**
- Title tag: "Serpodin - Game Prijsvergelijking | Beste Game Deals & Kortingen"
- Meta description (160 karakters)
- Keywords meta tag
- Author tag
- Canonical URL
- Language: `lang="nl"`

✅ **Open Graph (Facebook/Social)**
- og:type, og:url, og:site_name
- og:title, og:description
- og:image (1200x630px)
- og:locale (nl_NL)

✅ **Twitter Cards**
- twitter:card (summary_large_image)
- twitter:title, twitter:description
- twitter:image

✅ **PWA & Mobile**
- manifest.json link
- theme-color meta tag
- viewport meta tag

### 2. Structured Data (JSON-LD)

✅ **WebSite Schema**
```json
{
  "@type": "WebSite",
  "name": "Serpodin",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://serpodin.nl/search?q={search_term_string}"
  }
}
```

✅ **Organization Schema**
```json
{
  "@type": "Organization",
  "name": "Serpodin",
  "url": "https://serpodin.nl",
  "logo": "https://serpodin.nl/favicon.svg"
}
```

### 3. Static Files

✅ **robots.txt** (`frontend/public/robots.txt`)
- Allow: / (alle pagina's)
- Disallow: /api/, /profile, /wishlist, /alerts
- Sitemap reference
- Crawl-delay: 1

✅ **sitemap.xml** (`frontend/public/sitemap.xml`)
- Homepage (priority 1.0, daily)
- Deals page (priority 0.9, daily)
- Browse page (priority 0.8, weekly)
- Login/Register (priority 0.5, monthly)

✅ **manifest.json** (`frontend/public/manifest.json`)
- PWA support
- Name, icons, theme colors
- Categories: shopping, entertainment, games

### 4. Dynamische SEO per Pagina

✅ **SEO Component** (`frontend/src/components/SEO.tsx`)
- React Helmet Async implementatie
- Dynamische meta tags per pagina
- Open Graph + Twitter Cards support

✅ **Pagina-specifieke SEO**

**HomePage:**
```tsx
<SEO /> // Gebruikt default values
```

**GamePage:**
```tsx
<SEO
  title={`${game.name} Prijzen & Deals`}
  description={`Vergelijk prijzen voor ${game.name}...`}
  image={game.header_image}
  url={`https://serpodin.nl/game/${appid}`}
  type="article"
/>
```

**DealsPage:**
```tsx
<SEO
  title="Beste Game Deals | Trending Aanbiedingen"
  description="Ontdek de beste game deals..."
  url="https://serpodin.nl/deals"
/>
```

### 5. Backend Sitemap Endpoint

✅ **Dynamic Sitemap** (`backend/app/routers/sitemap.py`)
- `/sitemap.xml` - Dynamische sitemap met top 100 games
- `/robots.txt` - Dynamische robots.txt
- Cached voor 24 uur
- Bevat:
  - Static pages
  - Top 100 meest recent bezochte games
  - Automatische lastmod dates

### 6. Security & Performance Headers

✅ **Security Headers** (in `vercel.json`)
```json
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block"
}
```

## 🚀 Deployment Stappen

### Stap 1: Code Deployen
```bash
git add .
git commit -m "Add comprehensive SEO implementation"
git push origin main
```

### Stap 2: Vercel Deploy Checken
1. Ga naar Vercel dashboard
2. Check dat build succesvol is
3. Test deze URLs:
   - https://serpodin.nl/
   - https://serpodin.nl/robots.txt
   - https://serpodin.nl/sitemap.xml
   - https://serpodin.nl/manifest.json

### Stap 3: Google Search Console
1. Ga naar [Google Search Console](https://search.google.com/search-console)
2. Klik "Add Property" → "URL prefix"
3. Voer in: `https://serpodin.nl`
4. Verifieer via HTML tag methode:
   ```html
   <!-- Voeg toe aan <head> in index.html -->
   <meta name="google-site-verification" content="JOUW_CODE_HIER" />
   ```
5. Na verificatie: Submit sitemap
   - Ga naar "Sitemaps" in het menu
   - Voer in: `sitemap.xml`
   - Klik "Submit"

### Stap 4: Bing Webmaster Tools (Optioneel)
1. Ga naar [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Voeg site toe: `https://serpodin.nl`
3. Importeer van Google Search Console (makkelijkst)
4. Of verifieer via XML file

### Stap 5: Test SEO Implementatie

**Tools om te gebruiken:**
1. [Google Rich Results Test](https://search.google.com/test/rich-results)
   - Test structured data

2. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - Test Open Graph tags
   - URL: `https://serpodin.nl`

3. [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - Test Twitter Cards

4. [Google PageSpeed Insights](https://pagespeed.web.dev/)
   - Test performance
   - Target: >90 score

## 📊 Verwachte Resultaten

### Week 1-2: Indexering
- Google crawlt de site
- Eerste pagina's verschijnen in index
- Check via: `site:serpodin.nl` in Google

### Week 3-4: Eerste Rankings
- Begin te ranken voor long-tail keywords
- Bijvoorbeeld: "[specifieke game naam] prijs vergelijken"

### Maand 2-3: Groei
- Rankings verbeteren
- Begint te ranken voor "game prijsvergelijking"
- 100-500 organische bezoekers/maand

### Maand 6+: Gevestigd
- Sterke rankings voor meerdere keywords
- 1000+ organische bezoekers/maand
- Terugkerende gebruikers

## 🎯 Keywords Targeting

### Primaire Keywords (Hoge prioriteit)
- game prijsvergelijking
- game prijzen vergelijken
- goedkope pc games
- beste game deals
- steam alternatieven

### Secundaire Keywords (Medium prioriteit)
- game korting
- steam sale
- gog prijzen
- humble bundle deals
- key reseller vergelijking

### Long-tail Keywords (Makkelijk te ranken)
- waar kan ik [game naam] goedkoop kopen
- [game naam] historische prijs
- [game naam] beste deal
- steam vs gog prijzen
- game price tracker nederland

## 📈 Success Metrics om te Tracken

### Google Search Console
- **Impressions**: Hoe vaak jouw site in zoekresultaten verschijnt
- **Clicks**: Aantal clicks vanuit Google
- **CTR (Click-through rate)**: Clicks / Impressions (target: >3%)
- **Position**: Gemiddelde ranking positie (target: <20, later <10)

### Google Analytics / Vercel Analytics
- Organisch verkeer percentage
- Bounce rate (target: <60%)
- Avg. session duration (target: >2 min)
- Pages per session (target: >2)

### Business Metrics
- Nieuwe registraties via organic
- Wishlist toevoegingen
- Alert creations

## 🔧 Onderhoud

### Weekly
- Check Google Search Console voor errors
- Monitor ranking changes
- Check voor 404 errors

### Monthly
- Update sitemap met populaire nieuwe games
- Analyze top performing pages
- Optimize underperforming pages

### Quarterly
- Full SEO audit
- Competitor analysis
- Content strategy review
- Backlink analysis

## 📚 Resources

### Documentatie
- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org)
- [Open Graph Protocol](https://ogp.me/)

### Tools
- [Google Search Console](https://search.google.com/search-console)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/) (Free tier)

## ⚠️ Belangrijke Notities

1. **Geduld is key**: SEO duurt 3-6 maanden voor significante resultaten
2. **Content is king**: Regelmatig nieuwe content toevoegen helpt rankings
3. **Mobile-first**: Google indexeert mobile versie eerst
4. **Core Web Vitals**: Performance is ranking factor
5. **User Experience**: Bounce rate en dwell time zijn signalen

## 🎉 Next Steps (Fase 2 - Optioneel)

1. **Blog sectie toevoegen**
   - Game reviews
   - Deal alerts
   - Industry news

2. **Product Schema per game**
   - Prijsinformatie in rich snippets
   - Review ratings

3. **FAQ sectie**
   - Met FAQ schema markup
   - Voor featured snippets

4. **Breadcrumbs**
   - Met BreadcrumbList schema
   - Betere navigatie

5. **Video content**
   - YouTube integration
   - VideoObject schema

Succes met de SEO van serpodin.nl! 🚀
