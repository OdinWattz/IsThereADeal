# 🎮 GameDeals

Een full-stack website om game prijzen te vergelijken en bij te houden. Gebaseerd op de functionaliteit van [IsThereAnyDeal](https://isthereanydeal.com), [SteamDB](https://steamdb.info) en [AllKeyShop](https://www.allkeyshop.com).

---

## ✨ Functies

- **Prijsvergelijking** — Vergelijk de prijs van een game bij Steam, GOG, Humble Store, GreenManGaming, Fanatical en meer
- **Key resellers** — Bekijk ook prijzen van G2A, Eneba en Kinguin
- **Prijsgeschiedenis** — Interactieve grafiek met historische prijzen per winkel
- **Steam deals** — Startpagina toont actuele Steam aanbiedingen
- **Deals pagina** — Overzicht van alle bijgehouden games die momenteel in de aanbieding zijn
- **Verlanglijst** — Voeg games toe aan je verlanglijst met een doelprijs
- **Prijsalerts** — Ontvang een e-mail wanneer een game onder je ingestelde prijs zakt
- **Accounts** — Registreer en log in om je verlanglijst en alerts op te slaan
- **Euro prijzen** — Alle Steam prijzen in EUR (NL regio)
- **Automatische updates** — Achtergrondtaak vernieuwt prijzen elke 6 uur en controleert alerts elk uur

---

## 🛠️ Tech stack

| Onderdeel | Technologie |
|---|---|
| Backend | Python 3.9+, FastAPI, SQLAlchemy (async) |
| Database | SQLite (lokaal) / PostgreSQL (productie) |
| Frontend | React 19, TypeScript, Vite |
| Styling | Inline React styles (dark gaming thema) |
| Grafieken | Recharts |
| State | Zustand + TanStack Query |
| Auth | JWT (python-jose + bcrypt) |
| E-mail | aiosmtplib |
| Prijsdata | Steam API, IsThereAnyDeal API, CheapShark API |

---

## 📋 Vereisten

- **Python 3.9+**
- **Node.js 18+** (en npm)
- Optioneel: een ITAD API key voor extra winkels

---

## 🚀 Installatie & starten

### 1. Repository clonen

```bash
git clone https://github.com/OdinWattz/IsThereADeal.git
cd IsThereADeal
```

### 2. Backend instellen

```bash
cd backend

# Virtuele omgeving aanmaken
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Dependencies installeren
pip install -r requirements.txt

# .env bestand aanmaken
cp .env.example .env
```

Bewerk nu `backend/.env` (zie sectie [API keys](#-api-keys) hieronder).

```bash
# Backend starten (blijft automatisch herladen bij wijzigingen)
uvicorn app.main:app --reload --port 8000
```

De backend draait nu op `http://localhost:8000`.  
Swagger docs: `http://localhost:8000/docs`

### 3. Frontend instellen

Open een **nieuw terminalvenster**:

```bash
cd frontend

# Dependencies installeren
npm install

# Frontend starten
npm run dev
```

De site is nu bereikbaar op **`http://localhost:5173`**.

---

## 🔑 API keys

Alle instellingen staan in `backend/.env`. Kopieer eerst het voorbeeld:

```bash
cp backend/.env.example backend/.env
```

### Verplicht

| Instelling | Waarde | Uitleg |
|---|---|---|
| `SECRET_KEY` | willekeurige string | Gebruik voor productie: `openssl rand -hex 32` |
| `DATABASE_URL` | `sqlite+aiosqlite:///./gamedeals.db` | Standaard SQLite, geen setup nodig |

### Optioneel — meer winkels via IsThereAnyDeal

Zonder ITAD key worden alleen Steam + CheapShark winkels (GOG, Humble, GMG, etc.) getoond. Met een ITAD key worden 30+ extra winkels toegevoegd.

1. Ga naar [isthereanydeal.com/dev/app/](https://isthereanydeal.com/dev/app/)
2. Maak een gratis account aan en registreer een app
3. Kopieer je API key naar `.env`:

```env
ITAD_API_KEY=jouw_itad_key_hier
```

### Optioneel — Steam API key

Voor uitgebreide Steam data (niet vereist voor basisfunctionaliteit):

1. Ga naar [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Log in met je Steam account en vraag een key aan
3. Zet hem in `.env`:

```env
STEAM_API_KEY=jouw_steam_key_hier
```

### Optioneel — E-mailalerts

Voor automatische prijsmeldingen per e-mail. Werkt met Gmail (app-wachtwoord vereist):

1. Zet 2FA aan op je Google account
2. Ga naar [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) en maak een app-wachtwoord aan
3. Vul in `.env` in:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw_email@gmail.com
SMTP_PASSWORD=jouw_app_wachtwoord
SMTP_FROM=jouw_email@gmail.com
```

---

## ⚙️ Volledig `.env` voorbeeld

```env
# App
APP_ENV=development
SECRET_KEY=verander-dit-naar-een-willekeurige-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080   # 7 dagen

# Database (SQLite lokaal, PostgreSQL voor productie)
DATABASE_URL=sqlite+aiosqlite:///./gamedeals.db
# DATABASE_URL=postgresql+asyncpg://user:wachtwoord@localhost:5432/gamedeals

# API keys (optioneel maar aanbevolen)
STEAM_API_KEY=
ITAD_API_KEY=

# E-mail alerts (optioneel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# CORS (voeg je productie-URL toe indien van toepassing)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🌐 Productie / online draaien

### Vercel (frontend + API in 1 project)

Deze repository is al geschikt voor 1 gecombineerde Vercel deploy:

- Frontend wordt gebouwd vanuit `frontend/`
- API draait serverless via `api/index.py`
- Database moet in productie PostgreSQL zijn (Vercel Postgres, Neon, Supabase, Render, etc.)

#### 1. Project importeren in Vercel

1. Ga naar Vercel en importeer je GitHub repo.
2. Laat de root directory op repository-root staan.
3. Deploy 1x zonder extra overrides (de repo gebruikt `vercel.json`).

#### 2. Database koppelen (verplicht voor persistente data)

Kies 1 van deze opties:

1. Vercel Postgres (aanbevolen op Vercel):
    - Add-ons -> Storage -> Postgres toevoegen
    - Vercel zet dan automatisch env vars zoals `POSTGRES_URL`
2. Externe PostgreSQL:
    - Zet handmatig `DATABASE_URL` in Vercel Environment Variables

Voorbeeld:

```env
DATABASE_URL=postgresql+asyncpg://gebruiker:wachtwoord@host:5432/gamedeals
```

#### 3. Environment variables instellen

Minimaal:

```env
SECRET_KEY=vervang-met-lange-random-string
APP_ENV=production
CORS_ORIGINS=https://jouw-vercel-domein.vercel.app
```

Optioneel (aanbevolen):

```env
ITAD_API_KEY=...
STEAM_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=...
```

#### 4. Redeploy en health check

Na het opslaan van env vars: redeploy uitvoeren. Controleer daarna:

- `/api/health` moet `{"status":"healthy"}` teruggeven
- Frontend home moet laden zonder API-fouten in de browser console

#### 5. Belangrijk om te weten

- Zonder PostgreSQL valt de app op Vercel terug op tijdelijke SQLite in `/tmp` (werkt wel, maar niet persistent).
- Scheduler draait niet op Vercel serverless; periodieke prijsupdates plan je daar met een externe cron/job runner.

### Database wisselen naar PostgreSQL

Vervang in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://gebruiker:wachtwoord@localhost:5432/gamedeals
```

Installeer ook de PostgreSQL driver:

```bash
pip install asyncpg
```

### Frontend bouwen voor productie

```bash
cd frontend
npm run build
# De gebouwde bestanden staan in frontend/dist/
```

Serveer `frontend/dist/` via Nginx, Caddy of een andere webserver. Zorg dat alle `/api/*` requests worden doorgezet (proxy) naar de backend op poort 8000.

### Voorbeeld Nginx config

```nginx
server {
    listen 80;
    server_name jouwdomain.nl;

    root /pad/naar/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Backend als service draaien (systemd)

```ini
# /etc/systemd/system/gamedeals.service
[Unit]
Description=GameDeals Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/pad/naar/backend
ExecStart=/pad/naar/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable gamedeals
sudo systemctl start gamedeals
```

---

## 📁 Projectstructuur

```
IsThereADeal/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── config.py            # Instellingen (.env laden)
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── auth.py              # JWT helpers
│   │   ├── models/
│   │   │   ├── models.py        # Database modellen (ORM)
│   │   │   └── schemas.py       # Pydantic schemas (API)
│   │   ├── routers/
│   │   │   ├── auth.py          # /api/auth endpoints
│   │   │   ├── games.py         # /api/games endpoints
│   │   │   ├── wishlist.py      # /api/wishlist endpoints
│   │   │   └── alerts.py        # /api/alerts endpoints
│   │   └── services/
│   │       ├── steam_service.py       # Steam Store API
│   │       ├── itad_service.py        # IsThereAnyDeal API
│   │       ├── cheapshark_service.py  # CheapShark API (gratis)
│   │       ├── keyreseller_service.py # G2A, Eneba, Kinguin
│   │       ├── price_aggregator.py    # Samenvoegen alle bronnen
│   │       ├── email_service.py       # E-mailalerts versturen
│   │       └── scheduler.py           # Achtergrondtaken
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                     # Jouw lokale instellingen (niet committen)
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts        # Axios + JWT interceptors
│   │   │   └── games.ts         # API functies + TypeScript types
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── GameCard.tsx
│   │   │   ├── PriceTable.tsx
│   │   │   └── PriceHistoryChart.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── GamePage.tsx
│   │   │   ├── DealsPage.tsx
│   │   │   ├── WishlistPage.tsx
│   │   │   ├── AlertsPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── store/
│   │   │   └── authStore.ts     # Zustand auth state
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
├── start.sh                     # Start backend + frontend tegelijk
├── .gitignore
└── README.md
```

---

## 🔗 API endpoints

| Method | Endpoint | Beschrijving |
|---|---|---|
| `GET` | `/api/health` | Status check |
| `POST` | `/api/auth/register` | Account aanmaken |
| `POST` | `/api/auth/login` | Inloggen (JWT token) |
| `GET` | `/api/auth/me` | Ingelogde gebruiker |
| `GET` | `/api/games/search?q=...` | Games zoeken via Steam |
| `GET` | `/api/games/featured` | Actuele Steam aanbiedingen |
| `GET` | `/api/games/deals` | Bijgehouden games in aanbieding |
| `GET` | `/api/games/{appid}` | Game details + alle prijzen |
| `GET` | `/api/games/{appid}/history` | Prijsgeschiedenis |
| `GET` | `/api/wishlist` | Verlanglijst ophalen |
| `POST` | `/api/wishlist` | Game toevoegen |
| `DELETE` | `/api/wishlist/{id}` | Game verwijderen |
| `GET` | `/api/alerts` | Alerts ophalen |
| `POST` | `/api/alerts` | Alert aanmaken |
| `DELETE` | `/api/alerts/{id}` | Alert verwijderen |
| `PATCH` | `/api/alerts/{id}/toggle` | Alert aan/uitzetten |

Volledige interactieve documentatie: `http://localhost:8000/docs`
