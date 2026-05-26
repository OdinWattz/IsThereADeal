import SEO from '../components/SEO'

export function PrivacyPage() {
  return (
    <>
      <SEO
        title="Privacyverklaring"
        description="Privacyverklaring voor Sirodin met uitleg over accountgegevens, lokale opslag, prijsalerts en externe prijsbronnen."
        url="https://sirodin.nl/privacy"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Privacyverklaring</h1>

        <div className="space-y-5 text-sm sm:text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Deze website verwerkt alleen gegevens die nodig zijn om games te vergelijken, accounts te beheren, prijsalerts te sturen en de dienst technisch te laten werken.
          </p>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Welke gegevens</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Accountgegevens zoals gebruikersnaam, e-mailadres en wachtwoordhash.</li>
              <li>Inhoud die je zelf opslaat, zoals wishlist-items, collecties en prijsalerts.</li>
              <li>Technische gegevens zoals IP-adres, user agent en serverlogs voor beveiliging en foutdiagnose.</li>
              <li>Functionele opslag in de browser, waaronder een login-token en voorkeuren die via localStorage worden bewaard.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Waarom</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Je account laten werken en authenticeren.</li>
              <li>Prijsalerts en wishlist-functies uitvoeren.</li>
              <li>Prijzen ophalen en tonen via externe prijsbronnen zoals Steam, CheapShark, ITAD en resellers.</li>
              <li>De site beveiligen, misbruik beperken en storingen onderzoeken.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Rechtsgrond</h2>
            <p>
              Verwerking gebeurt op basis van uitvoering van de dienst, gerechtvaardigd belang voor beveiliging en prestaties, en toestemming of noodzaak waar dat wettelijk vereist is.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Bewaartermijnen</h2>
            <p>
              Account- en gebruikersdata blijven bewaard zolang je account actief is of zolang dit nodig is voor de dienst. Loggegevens en cachegegevens worden beperkt in de tijd bewaard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delen met derden</h2>
            <p>
              Voor prijsvergelijking worden verzoeken gedaan aan externe bronnen. Als prijsalerts per e-mail aan staan, wordt jouw e-mailadres gebruikt om die melding te versturen via de e-maildienst van de site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Jouw rechten</h2>
            <p>
              Je kunt inzage, correctie, verwijdering, beperking of bezwaar vragen voor zover de wet dat toestaat. Ook kun je vragen om verwijdering van je account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Contact</h2>
            <p>
              Voor privacyverzoeken kun je contact opnemen via <a href="mailto:support@sirodin.nl" className="text-[color:var(--accent)] hover:underline">privacy@sirodin.nl</a>.
            </p>
          </section>

          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Deze tekst is een praktische privacyverklaring en geen vervanging van juridisch advies.
          </p>
        </div>
      </div>
    </>
  )
}
