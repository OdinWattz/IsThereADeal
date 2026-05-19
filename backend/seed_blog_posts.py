"""
Seed blog posts with initial gaming guides
"""
import asyncio
from datetime import datetime, timezone
from app.database import AsyncSessionLocal
from app.models.models import BlogPost


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def seed_blog_posts():
    """Create initial blog posts/guides"""
    db = AsyncSessionLocal()
    
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
    ]
    
    for guide_data in guides:
        # Check if post already exists
        from sqlalchemy import select
        from app.models.models import BlogPost
        
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
            print(f"✓ Added guide: {guide_data['title']}")
        else:
            print(f"✗ Guide already exists: {guide_data['title']}")
    
    await db.commit()
    await db.close()
    print("\nBlog guides seeded successfully! 🎮")


if __name__ == "__main__":
    asyncio.run(seed_blog_posts())
