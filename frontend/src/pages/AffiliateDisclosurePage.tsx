import SEO from '../components/SEO'

export function AffiliateDisclosurePage() {
  return (
    <>
      <SEO
        title="Affiliate disclosure"
        description="Uitleg over affiliate-links, commission disclosures en hoe prijsvergelijking op Sirodin werkt."
        url="https://sirodin.nl/affiliate-disclosure"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Affiliate disclosure</h1>
        <div className="space-y-4 text-sm sm:text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Sirodin gebruikt soms affiliate- of partnerlinks. Als je via zo&apos;n link een aankoop doet, kan deze site een commissie ontvangen.
            Dat kost jou niets extra.
          </p>
          <p>
            Affiliate-links worden vooral gebruikt bij key-reseller- of partnerwinkels wanneer die beschikbaar zijn via de bron-API&apos;s.
            Officiële winkelvermeldingen blijven onafhankelijk gerangschikt op prijs, korting en beschikbaarheid.
          </p>
          <p>
            We proberen prijzen en winkelinformatie zo neutraal mogelijk weer te geven. Een affiliate-relatie verandert de zichtbare prijs voor de bezoeker niet.
          </p>
          <p>
            Sommige externe verkopers zijn geen officiële uitgevers van de game. Controleer altijd de verkoper en voorwaarden voordat je koopt.
          </p>
        </div>
      </div>
    </>
  )
}
