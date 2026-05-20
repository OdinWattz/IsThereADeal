"""
Seed blog posts with initial gaming guides
"""
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.models import BlogPost


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def seed_blog_posts(db=None, quiet: bool = False):
    """Create initial blog posts/guides"""
    owns_session = db is None
    if owns_session:
        db = AsyncSessionLocal()
    added_count = 0
    
    guides = [
        {
            "slug": "steam-key-activeren",
            "title": "Hoe activeer je een gamekey op Steam?",
            "category": "guide",
            "excerpt": "Stap-voor-stap handleiding om een gamekey (ook wel product key genaamd) op Steam te activeren.",
            "content": """# Hoe activeer je een gamekey op Steam?

Wanneer je een game code koopt van een reseller zoals G2A, Kinguin of via IsThereADeal, moet je deze eerst activeren op je Steam account. Hier is hoe:

## Stap 1: Open Steam
- Start Steam op je computer
- Log in met je Steam-account

## Stap 2: Ga naar "Games" → "Activate a Product on Steam"
- Klik op het menu "Games" bovenaan
- Selecteer "Activate a Product on Steam..."
- Je krijgt een pop-up venster

## Stap 3: Plak je key
- Plak je code in het veld
- Klik "Next" en volg de aanwijzingen
- Accepteer de gebruiksvoorwaarden

## Stap 4: Bevestiging
- De game wordt automatisch aan je bibliotheek toegevoegd
- Je kan deze nu downloaden en spelen

## Tips & Waarschuwingen
- **Bewaarde kees**: Schrijf je key ergens op voordat je hem invoert
- **Regio's**: Sommige keys zijn regio-gebonden. Check dit voor aankoop!
- **Verloopen**: Keys verlopen niet, ze zijn voorgoed geldig
- **Geschenken**: Je kan keys ook als geschenk sturen naar vrienden

## Problemen?
- Zorg dat je geen spaties kopieerde van je key
- Controleer de regio van je key (EU vs US)
- Sommige keys zijn al in beslag genomen - contacteer de verkoper!
""",
            "featured_image": "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/clans/44763526/bdbf5f41c0f8a8cbbc3ef16c38ce6a1f13f51c87.png",
        },
        {
            "slug": "key-reseller-veiligheid",
            "title": "Veilig kopen op key resellers - Tips & Waarschuwingen",
            "category": "guide",
            "excerpt": "Alles wat je moet weten over veilig kopen op G2A, Kinguin en andere grey-market key resellers.",
            "content": """# Veilig kopen op key resellers

Key resellers kunnen enorme besparingen opleveren, maar er zijn risico's. Hier zijn tips om veilig te kopen:

## Wat zijn key resellers?
Key resellers (G2A, Kinguin, Eneba) verkopen keys van unauthorized sources - soms legaal, soms niet.
- **Goedkoper**: 30-70% korting mogelijk
- **Risico**: Keys kunnen worden ingetrokken, regio's kan fout zijn, scam-sellers

## Hoe veilig kopen?

### 1. Kies betrouwbare verkopers
- Check de seller rating & reviews
- Kies alleen sellers met 95%+ positive feedback
- Vermijd nieuwe verkopers met weinig ratings

### 2. Check de regio
- Sommige keys zijn alleen voor bepaalde regio's (US, EU, etc)
- Controleer of de key werkt in JOW land
- Sommige games zijn NIET beschikbaar in bepaalde regio's

### 3. Koop buyer protection
- G2A Shield, Kinguin Buyer Protection - betaal extra voor zekerheid
- Dit geeft je geld terug als er problemen zijn

### 4. Screenshots & bewijzen
- Maak screenshot van je aankoop
- Bewaar je key veilig totdat je hem hebt geactiveerd

## Rode vlaggen ⚠️
- **Super goedkoop**: Seems too good to be true? Waarschijnlijk wel
- **Nieuwe seller**: Vermijd als eerste aankoop
- **Geen reviews**: Skip deze
- **Seller antwoordt niet**: Problem solving wordt moeilijk

## Wat als het fout gaat?

### Key is niet geldig
1. Contact de seller (meestal 1-7 dagen)
2. Vraag een refund
3. Dien claim in bij de platform (G2A Protection, etc)

### Key is al in beslag genomen
- Sommige keys worden later ingetrokken
- Probeer refund/chargeback via de platform
- Worst case: je bent geld kwijt

### Je bent scammed
- Report de seller
- Dien chargeback in bij je bank
- Report op communities als dit patroon is

## Is het legaal?
Grijs gebied - de games zijn legaal, maar de keys mogen niet altijd doorverkocht worden per license agreement.
Developers hebben gemengde voorkeur, maar kunnen key revoke als het tegen terms is.

## Alternatieven
- **Officiële sales**: Steam sales, GOG, Humble Bundle
- **Wacht**: Game gaat bijna altijd in de sale
- **Bundels**: Humble Bundle geeft deel van winst aan goede doelen
""",
        },
        {
            "slug": "steam-family-sharing",
            "title": "Steam Family Sharing - Je bibliotheek delen met vrienden",
            "category": "guide",
            "excerpt": "Hoe je je Steam-spellen veilig deelt met vrienden en familie via Family Sharing.",
            "content": """# Steam Family Sharing - Spellen delen

Steam Family Sharing laat je je bibliotheek delen met tot 5 andere accounts. Perfect voor familie en huisgenoten!

## Wat is Family Sharing?
- Deel je hele game bibliotheek met anderen
- Tot 5 geauthoriseerde accounts per Steam-account
- **GRATIS** en 100% officieel

## Setup

### Stap 1: Autoriseer een computer
- Log in op de computer van je vriend
- Steam → Settings → Family → Authorize Library Sharing
- Check de box "Authorize Library Sharing on this computer"
- Log uit (je account kan ingelogd blijven op 1 ander device)

### Stap 2: Jouw vriend logt in
- Op dezelfde computer logt jouw vriend in met ZIJN account
- Hij kan nu al je games spelen via "Play from Library"

## Regels
- **Tegelijk spelen**: Je kan beide tegelijk spelen (als niet op dezelfde PC)
- **Account op vaste PC**: Je account mag op 1 vaste PC ingelogd zijn
- **Backups**: Log uit wanneer je klaar bent

## Pro Tips
- Zet een PIN in Family Settings voor beveiliging
- Family Library doet het NOT met in-game cosmetics/items
- Cloud saves werken niet voor beide accounts tegelijk
- Vrienden kunnen NO achievements herbehalen op shared games

## Problemen
**"Library already authorized"**
- Je hebt al te veel devices geauthoriseerd (max 5)
- Log uit van andere PCs en probeer opnieuw

**"Friend can't see my games"**
- Zorg dat Account Details privacy niet op private staat
- Restart Steam

**Games stopen of crashen**
- Dit kan gebeuren als 2 mensen tegelijk spelen
- Zet de Family Library Sharing uit en weer aan
""",
        },
        {
            "slug": "steam-regional-prices",
            "title": "Steam regionale prijzen uitgelegd",
            "category": "tutorial",
            "excerpt": "Waarom games in sommige landen goedkoper zijn op Steam en hoe dit werkt.",
            "content": """# Steam regionale prijzen - Waarom het verschilt per land

Steam bepaalt prijzen per regio om koopkracht in rekening te brengen. Hier's hoe het werkt:

## Waarom verschillende prijzen?
- Steam anpasst prijzen aan het BBP (bruto binnenlands product) per land
- **Arme landen**: Lagere prijzen (India, Brazilië)
- **Rijke landen**: Hogere prijzen (Europa, USA)
- Dit is om koppelingen in alle landen eerlijk te houden

## Regio's op Steam

### Tier 1 (Duurste)
- USA, Canada, West-Europa, Japan, Australia

### Tier 2-5 (Goedkoper)
- Oost-Europa, Azië, Latijns-Amerika

### Voorbeelden
Een game kost:
- **€20** in Nederland
- **$20** in VS
- **₹300** (~€3.50) in India
- **R$40** (~€6) in Brazilië

## De VPN-truc
Veel gamers gebruiken VPN om goedkopere regio's te "betreden" en games goedkoper te kopen.

**Waarschuwing**: Dit is tegen Steams Terms of Service
- Risicovolle ban van account
- Valve detecteert VPN-activiteit

## Legale alternatieven
- Wacht op sales (80% korting mogelijk)
- Humble Bundle (aanbiedingen + goede doelen)
- Regional keys van resellers (maar controleer regio!)
- Epic Games Store (gratis games weekly)

## De toekomst?
Valve experimenteert met dynamic pricing en region locks. Het kan zijn dat dit strenger wordt gehandhaafd in de toekomst.
""",
        },
        {
            "slug": "beste-plaatsen-om-games-te-kopen",
            "title": "Waar koop je games het goedkoopst? Top winkels 2026",
            "category": "guide",
            "excerpt": "Overzicht van alle beste game winkels in 2026 met voor- en nadelen.",
            "content": """# Beste plaatsen om games te kopen in 2026

## Officiële Winkels (Veilig & Betrouwbaar)

### Steam ⭐⭐⭐⭐⭐
- **Voordeel**: Grootste bibliotheek, Cloud Saves, Family Sharing
- **Nadeel**: Prijzen kunnen hoog zijn
- **Korting**: Veel sales, wachtlijsten

### GOG
- **Voordeel**: DRM-vrije games (geen internet vereist)
- **Nadeel**: Kleinere bibliotheek
- **Best voor**: Klassieke & indie games

### Epic Games Store
- **Voordeel**: Gratis games ELKE WEEK!
- **Nadeel**: Kleinere bibliotheek, minder features
- **Best voor**: Budget gamers

### Humble Bundle
- **Voordeel**: Bundels, veel korting, deel naar charity
- **Nadeel**: Limited-time bundles
- **Best voor**: Indie & bundle deals

## Key Resellers (Goedkoop maar risicovol)

### G2A, Kinguin, Eneba
- **Voordeel**: 30-70% korting mogelijk
- **Nadeel**: Risk van revoked keys, scam
- **Best voor**: Ervarenen gamers

## Mijn aanbevelingen per budget

### Ultra Budget (<€5)
1. Epic Games Store (gratis weekly)
2. Humble Bundle Sale
3. Steam Wishlist + Sale wachten

### Budget (€5-€15)
1. Steam Sale/Wishlisten
2. GOG Sale
3. Key reseller (met buyer protection)

### Geen Budget
1. Steam (uitgebreide bibliotheek)
2. Alles kopen wat je wilt

## Tips om te sparen
✅ Wishlist op Steam - notificatie bij sale  
✅ IsThereADeal gebruiken - vergelijk prijzen  
✅ Bundels kopen - meer games, minder geld  
✅ Wacht op sales - meeste games 50%+ korting  
✅ Regional keys (legaal - maar controleer regio!)  

## Scam-waarschuwingen
❌ Reeks codes voor €1 - SCAM  
❌ Onbekende sellers met 0 reviews - SKIP  
❌ "Free" games van fake websites - MALWARE  
❌ Iemand biedt je gratis game - PHISHING  

Stay safe & happy gaming! 🎮
""",
        },
    {
        "slug": "fouten-die-gamers-geld-kosten-pc-games",
        "title": "7 fouten die gamers geld kosten bij het kopen van PC games",
        "category": "guide",
        "excerpt": "De meeste gamers betalen onnodig te veel. Dit zijn de 7 grootste aankoopfouten en hoe je ze voorkomt met prijsvergelijking, alerts en slimme timing.",
        "content": """# 7 fouten die gamers geld kosten bij het kopen van PC games

Veel gamers denken dat ze al slim inkopen. Toch betaal je snel 20 tot 60 procent te veel zonder dat je het doorhebt. De grootste oorzaak is niet een slechte aankoop, maar een reeks kleine fouten.

In deze gids zie je de 7 meest voorkomende fouten en wat je beter kunt doen.

## 1. Kopen bij de eerste winkel die je ziet
De grootste fout is direct op kopen klikken bij Steam of een random keyshop.

Vergelijk eerst prijzen tussen meerdere winkels. Het prijsverschil op dezelfde dag kan enorm zijn, vooral bij AAA-titels.

## 2. Geen prijsalert instellen
Veel mensen checken een keer de prijs en vergeten daarna de game.

Met een prijsalert koop je pas wanneer jouw doelprijs is bereikt. Dat haalt emotie uit je aankoop en voorkomt impulsaankopen.

## 3. Alleen naar kortingpercentages kijken
Een korting van 70 procent lijkt indrukwekkend, maar zegt niets zonder context.

Kijk altijd naar:
- Historische laagste prijs
- Actuele laagste prijs
- Verschil met de normale prijs

Soms is 35 procent korting op dit moment beter dan een oude 80 procent deal van twee jaar geleden.

## 4. Regio en activatievoorwaarden niet checken
Bij sommige aanbiedingen werkt een key niet in jouw regio of alleen op een ander platform.

Controleer altijd:
- Regio: EU of wereldwijd
- Platform: Steam, Epic, GOG
- Extra voorwaarden: DLC vereist, base game vereist, accountlinking

## 5. Je backlog niet meenemen
Je koopt snel een deal die je waarschijnlijk nooit speelt.

Maak collecties zoals:
- Nu spelen
- Volgende maand spelen
- Alleen kopen onder 10 euro

Dat helpt je focus houden en voorkomt dat je bibliotheek groeit zonder dat je speeltijd groeit.

## 6. Slechte timing rond grote sale-events
Veel gamers kopen net voor grote sales.

Wacht waar mogelijk op:
- Steam Summer Sale
- Autumn Sale
- Winter Sale
- Publisher weekends

Gebruik je wishlist en alerts om rond deze momenten extra scherp te kopen.

## 7. Geen maandbudget gebruiken
Zonder budget voelt elke deal als een kans die je niet mag missen.

Werk met een simpel systeem:
- Maandbudget bepalen
- Per game doelprijs zetten
- Alleen kopen als beide kloppen

## Conclusie
Slim games kopen gaat niet om jagen op de grootste korting, maar om structuur.
Vergelijk prijzen, gebruik alerts, bewaak je budget en koop met een plan. Zo houd je geld over voor de games die je echt speelt.
""",
    },
    {
        "slug": "van-wishlist-naar-koopplan-bespaar-op-games",
        "title": "Van wishlist naar koopplan: zo bespaar je elke maand op games",
        "category": "tutorial",
        "excerpt": "Een wishlist is handig, maar pas met een koopplan haal je echt voordeel. Leer hoe je je wishlist omzet in concrete acties met alerts, prioriteiten en budgetregels.",
        "content": """# Van wishlist naar koopplan: zo bespaar je elke maand op games

Een wishlist zonder plan is alleen een lijst met dromen.
Een wishlist met regels wordt een krachtig bespaarinstrument.

Hier is een eenvoudige methode die werkt voor bijna elke gamer.

## Stap 1: Deel je wishlist in drie groepen
Maak drie duidelijke groepen:
- Must play: wil je binnen 30 dagen spelen
- Nice to have: leuk voor later
- Collection: vooral voor de bibliotheek

Door dit onderscheid voorkom je dat prioriteitsgames en impulsaankopen door elkaar lopen.

## Stap 2: Zet per game een doelprijs
Kies een prijs waarbij je zonder twijfel wilt kopen.

Voorbeelden:
- Nieuwe AAA game: doelprijs 35 euro
- Indie game: doelprijs 12 euro
- DLC: doelprijs 8 euro

Een doelprijs maakt je beslissingen rationeel.

## Stap 3: Activeer alerts op je must-play games
Niet op alles tegelijk. Begin met je top 5.

Waarom:
- Minder notificatieruis
- Sneller reageren op echte kansen
- Minder FOMO door irrelevante deals

## Stap 4: Gebruik een maandbudget met rollover
Stel bijvoorbeeld 30 euro per maand in.

Koop je in een maand niets, dan mag je een deel doorschuiven. Zo kun je bij grote sales harder toeslaan zonder je uitgavenpatroon te verliezen.

## Stap 5: Beoordeel een deal met 3 vragen
Koop alleen als je op alle drie ja antwoordt:
- Is dit onder mijn doelprijs?
- Ga ik dit binnen 30 dagen spelen?
- Past dit binnen mijn budget?

Een nee is geen ramp. Dan wacht je op de volgende deal.

## Stap 6: Evalueer elke maand 10 minuten
Kijk kort terug:
- Welke alerts waren nuttig?
- Welke games had je toch niet gekocht?
- Zijn je doelprijzen realistisch?

Met deze mini-review wordt je koopgedrag elke maand beter.

## Conclusie
De meeste besparing zit niet in geluk, maar in een systeem.
Met een slimme wishlist, doelprijzen en alerts geef je minder uit en speel je meer van wat je echt wilt.
""",
    },
    {
        "slug": "key-reseller-of-officiele-store-juiste-keuze",
        "title": "Key reseller of officiele store? Zo maak je altijd de juiste keuze",
        "category": "guide",
        "excerpt": "Soms is een key reseller veel goedkoper, soms is een officiele winkel slimmer. Deze beslisgids helpt je per aankoop de veiligste en voordeligste keuze te maken.",
        "content": """# Key reseller of officiele store? Zo maak je altijd de juiste keuze

Je ziet een game voor 49,99 bij een officiele store en voor 31,99 bij een reseller.
Moet je die lagere prijs pakken? Soms wel, soms niet.

Met deze beslisgids maak je per game een goede keuze.

## Wanneer een officiele store beter is
Kies officieel als:
- Je pre-order bonussen belangrijk vindt
- Je maximale zekerheid wilt op support en refunds
- Het prijsverschil klein is, bijvoorbeeld minder dan 10 procent
- Je extras wilt zoals platform-specifieke voordelen

Je betaalt soms iets meer, maar krijgt minder risico.

## Wanneer een reseller logisch kan zijn
Een reseller kan interessant zijn als:
- Het prijsverschil groot is
- De verkoper een sterke reputatie heeft
- Regio en platform duidelijk vermeld staan
- Je betaalmethode extra bescherming biedt

Belangrijk: goedkoop is niet automatisch goed. Vertrouwen en voorwaarden zijn net zo belangrijk als prijs.

## Snelle risico-check voor elke aankoop
Gebruik deze checklist:
- Is de key geldig in jouw regio?
- Is het platform duidelijk?
- Is de seller rating hoog en met veel reviews?
- Zijn er duidelijke refundvoorwaarden?
- Heb je bewijs van aankoop opgeslagen?

Als je meerdere vragen met nee beantwoordt, beter niet kopen.

## Let op verborgen kosten
Sommige aanbieders tonen lage prijzen, maar voegen later kosten toe.

Controleer:
- Betaalfees
- Buyer protection kosten
- Valutakoersen
- BTW-verwerking

De echte eindprijs kan anders uitvallen dan de eerste prijs.

## Slimme strategie: vergelijk in lagen
Werk in deze volgorde:
- Vergelijk officiele stores
- Vergelijk daarna resellers
- Kies op basis van totaalprijs plus risicoprofiel

Zo voorkom je dat je blind op de laagste prijs gaat.

## Conclusie
De beste deal is niet altijd de goedkoopste deal.
De beste deal is de prijs met het juiste risico voor jouw situatie.
Met een vaste check voorkom je miskopen en houd je controle over je gamebudget.
""",
    },
    ]
    
    for guide_data in guides:
        result = await db.execute(select(BlogPost).where(BlogPost.slug == guide_data["slug"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            post = BlogPost(
                **guide_data,
                is_published=True,
                published_at=utcnow(),
                author="GameDeals Team",
                view_count=0,
            )
            db.add(post)
            added_count += 1
            if not quiet:
                print(f"✓ Added guide: {guide_data['title']}")
        else:
            if not quiet:
                print(f"✗ Guide already exists: {guide_data['title']}")
    
    await db.commit()
    if owns_session:
        await db.close()

    if not quiet:
        print("\nBlog guides seeded successfully! 🎮")

    return added_count


if __name__ == "__main__":
    asyncio.run(seed_blog_posts())
