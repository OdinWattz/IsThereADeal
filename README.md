# 🎮 IsThereADeal

Een full-stack game prijsvergelijkingsplatform met real-time prijsmonitoring, wishlists en prijsalerts. Vergelijk prijzen van 30+ winkels, volg prijsgeschiedenis en ontvang meldingen wanneer games in de aanbieding zijn.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://is-there-a-deal.vercel.app)
[![Made with FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Made with React](https://img.shields.io/badge/frontend-React%2019-61dafb.svg)](https://react.dev)

> Geïnspireerd door [IsThereAnyDeal](https://isthereanydeal.com), [SteamDB](https://steamdb.info) en [AllKeyShop](https://www.allkeyshop.com)

---

## ✨ Features

### 🔍 Prijsvergelijking & Monitoring
- **Multi-store prijsvergelijking** — Vergelijk prijzen van Steam, GOG, Humble Store, GreenManGaming, Fanatical en 25+ andere winkels
- **Key reseller prijzen (opt-in)** — Bekijk ook prijzen van G2A, Eneba en AllKeyShop met één checkbox
- **Live prijzen** — Real-time prijzen met automatische updates
- **Prijsgeschiedenis** — Interactieve grafieken met 2 jaar historische prijsdata per winkel
- **DLC deals** — Zie automatisch afgeprijsde DLC voor elk spel

### 📋 Persoonlijke Features
- **Verlanglijst met doelprijzen** — Voeg games toe met optionele target price
  - Sorteren op prijs, datum, naam, korting (6 opties)
  - Filteren op "On Sale" en "Target Price Met"
  - Inline target price editing
  - Visual badges voor kortingen en bereikte doelprijzen
- **Prijsalerts** — Automatische e-mailmeldingen wanneer een game onder je doelprijs komt
  - Toggle alerts aan/uit zonder te verwijderen
  - Ontvang alleen meldingen bij actieve alerts
- **Profile management** — Volledige accountbeheer
  - Username en email aanpassen
  - Wachtwoord wijzigen met sterkte-indicator
  - Account verwijderen met bevestiging
  - Quick stats (wishlist/alerts count)

### 🏠 Deals & Discovery
- **Steam Featured Deals** — Homepage toont actuele Steam aanbiedingen
- **Trending Deals pagina** — Beste deals gesorteerd op kwaliteit (CheapShark DealRating)
- **Real-time zoeken** — Doorzoek miljoenen games met live suggestions
- **Game details** — Volledige game info: genres, developers, release date, beschrijving

### 🎨 User Experience
- **Fully responsive** — Perfect op desktop, tablet én mobiel
- **Dark gaming theme** — Oogvriendelijk donker design met paarse accenten
- **Snelle laadtijden** — Geoptimaliseerd met in-memory caching en connection pooling
- **Remember Me** — Blijf ingelogd na browser restart
- **Password strength indicator** — Real-time feedback bij registratie

### 🔐 Security & Auth
- **JWT authenticatie** — Veilige token-based auth met bcrypt hashing
- **7-dagen sessies** — Lange sessie-duur voor gebruiksgemak
- **Wachtwoord sterkte-validatie** — Checkt lengte, hoofdletters, cijfers, speciale tekens

---

## 🛠️ Tech Stack

### Backend
| Technologie | Gebruik |
|---|---|
| **FastAPI** | Async REST API framework |
| **SQLAlchemy 2.0** | Async ORM met moderne patterns |
| **PostgreSQL** | Productie database (Supabase) |
| **SQLite** | Lokale development database |
| **JWT** | Token-based authenticatie (python-jose) |
| **bcrypt** | Password hashing |
| **aiosmtplib** | Async email verzending |
| **httpx** | Async HTTP client voor externe APIs |

### Frontend
| Technologie | Gebruik |
|---|---|
| **React 19** | UI framework met nieuwe features |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Lightning-fast build tool |
| **TanStack Query** | Data fetching & caching |
| **Zustand** | Lightweight state management |
| **Tailwind CSS** | Utility-first styling framework |
| **Recharts** | Interactive price history charts |
| **React Router** | Client-side routing |
| **Axios** | HTTP client met interceptors |
| **React Hot Toast** | Toast notifications |
| **Lucide React** | Modern icon library |
| **Vercel Analytics** | Performance monitoring |

### External APIs
- **Steam Store API** — Game details, prices, images
- **IsThereAnyDeal API** — 30+ store prices, price history
- **CheapShark API** — Aggregated deals, trending games
- **AllKeyShop API** — Key reseller prices
- **G2A API** — Key reseller marketplace
- **Eneba API** — Digital game marketplace

---

## 🚀 Performance Optimizations

### Backend Optimizations
- **Connection pooling** — Pool size: 10, max overflow: 20 (was NullPool)
- **In-memory response cache** — 5-minute TTL voor game responses
- **Smart cache invalidation** — API failures niet cachen, successes wel
- **Optimized timeouts** — Steam 8s, CheapShark 6s, ITAD 5-6s (was 10-15s)
- **Eager loading** — N+1 query prevention met selectinload
- **24h cache voor ID mapping** — Steam appid → CheapShark/ITAD IDs
- **Key resellers opt-in** — Alleen laden wanneer gevraagd (scheelt 8+ seconden)

### Frontend Optimizations
- **Extended staleTime** — 10 minuten (was 5 min)
- **Garbage collection time** — 30 minuten cache retention
- **Automatic retries** — 2x retry op gefaalde requests
- **Code splitting** — Lazy loading van routes
- **Optimized re-renders** — useMemo voor expensive computations

### Results
- **New games:** ~5-8 seconden (was 13+ seconden)
- **Cached games:** Instant (in-memory cache)
- **Previously loaded:** 1-2 seconden (database cache)

---

## 📋 Prerequisites

- **Python 3.9+**
- **Node.js 18+** en npm
- **Git**
- (Optioneel) ITAD API key voor extra winkels
- (Optioneel) SMTP configuratie voor email alerts

---

## 🚀 Local Development Setup

### 1. Repository clonen

```bash
git clone https://github.com/OdinWattz/IsThereADeal.git
cd IsThereADeal
```

### 2. Backend Setup

```bash
cd backend

# Virtual environment aanmaken
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows (PowerShell)

# Dependencies installeren
pip install -r requirements.txt

# Environment file aanmaken
cp .env.example .env
```

**Edit `backend/.env`** met je eigen configuratie (zie [Environment Variables](#-environment-variables)).

```bash
# Backend starten met hot-reload
uvicorn app.main:app --reload --port 8000
```

✅ Backend draait op `http://localhost:8000`
📚 API Docs op `http://localhost:8000/docs`

### 3. Frontend Setup

Open een **nieuw terminalvenster**:

```bash
cd frontend

# Dependencies installeren
npm install

# Development server starten
npm run dev
```

✅ Frontend draait op `http://localhost:5173`

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

#### Required (Minimum)

```env
# App Settings
APP_ENV=development
SECRET_KEY=generate-random-string-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080   # 7 days

# Database
DATABASE_URL=sqlite+aiosqlite:///./gamedeals.db
```

#### Optional (Recommended)

```env
# APIs voor meer winkels en data
ITAD_API_KEY=your_itad_key_here              # 30+ extra stores
STEAM_API_KEY=your_steam_key_here            # Enhanced Steam data

# Email alerts (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password              # Google App Password
SMTP_FROM=your_email@gmail.com

# CORS (add production URL)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Cron secret (for scheduled tasks)
CRON_SECRET=random_secret_for_cron_endpoint
```

### API Keys Verkrijgen

**ITAD API Key (aanbevolen):**
1. Ga naar [isthereanydeal.com/dev/app/](https://isthereanydeal.com/dev/app/)
2. Maak gratis account en registreer een app
3. Kopieer API key naar `.env`

**Steam API Key (optioneel):**
1. Ga naar [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Log in en vraag key aan
3. Voeg toe aan `.env`

**Gmail SMTP (voor alerts):**
1. Schakel 2FA in op je Google account
2. Ga naar [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Genereer app-wachtwoord en gebruik in `.env`

---

## 🌐 Production Deployment (Vercel)

Deze repository is ready voor Vercel deployment met één commando.

### 1. Vercel Project Setup

```bash
# Install Vercel CLI (optioneel)
npm i -g vercel

# Of gebruik de Vercel website
```

1. Import repository op [vercel.com](https://vercel.com)
2. Root directory: repository root (gebruikt `vercel.json`)
3. Framework Preset: Vite
4. Deploy!

### 2. Database Setup (Required)

Kies een PostgreSQL provider:

**Optie A: Vercel Postgres (aanbevolen)**
- Add Vercel Postgres in project dashboard
- Automatically sets `POSTGRES_URL` environment variable

**Optie B: Supabase (gratis tier)**
1. Maak project op [supabase.com](https://supabase.com)
2. Kopieer connection string (pooler mode)
3. Add als `DATABASE_URL` in Vercel

**Optie C: Andere providers**
- Neon, Railway, Render, etc.
- Set `DATABASE_URL` manually

Format:
```env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname?sslmode=require
```

### 3. Environment Variables in Vercel

**Minimaal vereist:**
```env
SECRET_KEY=your-super-secret-random-string-min-32-chars
APP_ENV=production
DATABASE_URL=your-postgres-connection-string
CORS_ORIGINS=https://your-domain.vercel.app
```

**Aanbevolen:**
```env
ITAD_API_KEY=...
STEAM_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=...
CRON_SECRET=random-secret-for-vercel-cron
```

### 4. Vercel Cron Setup (Alert Checking)

De app heeft een cron endpoint voor alert checking. Voeg toe in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/alerts/run-check",
    "schedule": "0 * * * *"
  }]
}
```

Dit checkt elk uur alerts en verstuurt emails.

### 5. Post-Deployment Checks

✅ Check `/api/health` → `{"status":"healthy"}`
✅ Check frontend laadt zonder errors
✅ Check login/register werkt
✅ Test prijzen laden correct

---

## 📁 Project Structure

```
IsThereADeal/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry + lifespan
│   │   ├── config.py                  # Settings from .env
│   │   ├── database.py                # SQLAlchemy async setup
│   │   ├── auth.py                    # JWT helpers
│   │   ├── models/
│   │   │   ├── models.py              # ORM models (User, Game, etc.)
│   │   │   └── schemas.py             # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py                # Auth endpoints (login, register, profile)
│   │   │   ├── games.py               # Game endpoints (search, details, history)
│   │   │   ├── wishlist.py            # Wishlist CRUD
│   │   │   └── alerts.py              # Alert CRUD + cron endpoint
│   │   └── services/
│   │       ├── steam_service.py       # Steam Store API integration
│   │       ├── itad_service.py        # IsThereAnyDeal API
│   │       ├── cheapshark_service.py  # CheapShark API
│   │       ├── keyreseller_service.py # AllKeyShop, G2A, Eneba
│   │       ├── price_aggregator.py    # Merge all price sources
│   │       ├── email_service.py       # SMTP email sending
│   │       ├── cache.py               # In-memory TTL cache
│   │       └── scheduler.py           # Background tasks
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                           # Your local config (gitignored)
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts              # Axios + JWT interceptor
│   │   │   └── games.ts               # API functions + types
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Responsive nav with mobile menu
│   │   │   ├── SearchBar.tsx          # Live search with dropdown
│   │   │   ├── GameCard.tsx           # Reusable game card
│   │   │   ├── PriceTable.tsx         # Multi-store price comparison
│   │   │   └── PriceHistoryChart.tsx  # Recharts line chart
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           # Featured deals grid
│   │   │   ├── GamePage.tsx           # Game detail + prices + history
│   │   │   ├── DealsPage.tsx          # Trending deals with pagination
│   │   │   ├── WishlistPage.tsx       # Wishlist with sorting/filtering
│   │   │   ├── AlertsPage.tsx         # Active/triggered alerts list
│   │   │   ├── ProfilePage.tsx        # Profile management
│   │   │   ├── LoginPage.tsx          # Login with Remember Me
│   │   │   └── RegisterPage.tsx       # Register with password strength
│   │   ├── store/
│   │   │   └── authStore.ts           # Zustand auth state
│   │   ├── App.tsx                    # Routes + auth layout
│   │   ├── main.tsx                   # React entry point
│   │   └── index.css                  # Tailwind + global styles
│   ├── public/                        # Static assets
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── api/
│   └── index.py                       # Vercel serverless entry point
├── vercel.json                        # Vercel configuration
├── .gitignore
└── README.md
```

---

## 🔗 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Create new account | ❌ |
| `POST` | `/api/auth/login` | Login → JWT token | ❌ |
| `GET` | `/api/auth/me` | Get current user | ✅ |
| `PATCH` | `/api/auth/me` | Update username/email | ✅ |
| `POST` | `/api/auth/change-password` | Change password | ✅ |
| `DELETE` | `/api/auth/me` | Delete account | ✅ |

### Games
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/games/search?q={query}` | Search games | ❌ |
| `GET` | `/api/games/featured` | Steam featured deals | ❌ |
| `GET` | `/api/games/deals?page={n}` | Trending deals | ❌ |
| `GET` | `/api/games/{appid}?include_key_resellers={bool}` | Game details + prices | ❌ |
| `GET` | `/api/games/{appid}/history` | Price history (2 years) | ❌ |
| `GET` | `/api/games/{appid}/dlc-deals` | On-sale DLC | ❌ |

### Wishlist
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/wishlist` | Get user wishlist | ✅ |
| `POST` | `/api/wishlist` | Add game (game_id or steam_appid) | ✅ |
| `DELETE` | `/api/wishlist/{id}` | Remove from wishlist | ✅ |
| `PATCH` | `/api/wishlist/{id}/target-price?target_price={price}` | Update target price | ✅ |

### Alerts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/alerts` | Get user alerts | ✅ |
| `POST` | `/api/alerts` | Create alert (game_id or steam_appid) | ✅ |
| `DELETE` | `/api/alerts/{id}` | Delete alert | ✅ |
| `PATCH` | `/api/alerts/{id}/toggle` | Toggle active status | ✅ |
| `POST` | `/api/alerts/run-check` | Check all active alerts (cron) | 🔒 Cron only |

### Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/health` | Health check | ❌ |

**Interactive docs:** `http://localhost:8000/docs` (Swagger UI)

---

## 🗃️ Database Schema

### User
```sql
id, username (unique), email (unique), hashed_password,
is_active, created_at
```

### Game
```sql
id, steam_appid (unique), name, header_image, short_description,
genres, developers, publishers, release_date, steam_url, last_updated
```

### GamePrice
```sql
id, game_id (FK), store_name, store_id, regular_price, sale_price,
discount_percent, currency, url, is_on_sale, fetched_at
```

### PriceHistory
```sql
id, game_id (FK), store_name, price, regular_price,
discount_percent, currency, recorded_at
```

### WishlistItem
```sql
id, user_id (FK), game_id (FK), target_price, added_at
```

### PriceAlert
```sql
id, user_id (FK), game_id (FK), target_price, is_active,
created_at, triggered_at, notify_email
```

---

## 🧪 Development Tips

### Frontend Development
```bash
# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development
```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Run tests (if available)
pytest

# Check code style
black app/
flake8 app/
```

### Database Migrations
Voor productie met schema changes:
```bash
# Install alembic
pip install alembic

# Initialize migrations
alembic init migrations

# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

---

## 🐛 Troubleshooting

### Backend niet bereikbaar
- Check of port 8000 vrij is: `lsof -i :8000`
- Check `.env` file bestaat en correct is
- Check database connection string

### Frontend API errors
- Check of backend draait op `http://localhost:8000`
- Check CORS settings in backend `.env`
- Open browser console voor details

### Email alerts werken niet
- Check SMTP credentials in `.env`
- Voor Gmail: gebruik App Password, niet regular password
- Check firewall/antivirus blokeert geen SMTP poort 587

### Price history laadt niet
- Check ITAD_API_KEY is set in `.env`
- Sommige games hebben geen history bij ITAD
- Check backend logs voor API timeout errors

### Slow loading
- Check of key reseller checkbox UIT staat (default behavior)
- Clear browser cache
- Check database connection pooling is enabled
- Monitor backend logs voor timeout warnings

---

## 📈 Future Improvements

- [ ] Email verification bij registratie
- [ ] Password reset via email
- [ ] Multi-currency support (USD, GBP, etc.)
- [ ] Browser notification support
- [ ] Price drop alerts via push notifications
- [ ] Historical low tracking
- [ ] Steam wishlist import
- [ ] Collection feature (custom game lists)
- [ ] Price prediction ML model
- [ ] Mobile apps (React Native)

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👤 Author

**Odin Watts**
- GitHub: [@OdinWattz](https://github.com/OdinWattz)
- Project: [IsThereADeal](https://github.com/OdinWattz/IsThereADeal)

---

## 🙏 Acknowledgments

- [IsThereAnyDeal](https://isthereanydeal.com) voor API en inspiratie
- [CheapShark](https://www.cheapshark.com) voor gratis deals API
- Steam Store API voor game data
- FastAPI community voor excellent docs
- React community voor modern tooling

---

## ⭐ Support

Als je dit project nuttig vindt, geef het een ⭐ op GitHub!

Issues en pull requests zijn welkom.

---

**Made with ❤️ and ☕ by Odin Watts**
