from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import init_db
from app.routers import auth, games, wishlist, alerts, collections, followed

# Scheduler alleen starten buiten Vercel (lokale dev)
_is_vercel = os.environ.get("VERCEL") == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        # Don't crash the whole app if DB is unreachable at startup.
        import logging
        logging.getLogger(__name__).error("init_db failed: %s", e)
    if not _is_vercel:
        from app.services.scheduler import start_scheduler, stop_scheduler
        start_scheduler()
        yield
        stop_scheduler()
    else:
        yield


app = FastAPI(
    title="GameDeals Tracker API",
    description="Aggregates game prices from Steam, GOG, Humble, key resellers and more.",
    version="1.0.0",
    lifespan=lifespan,
)

_cors_origins = settings.cors_origins_list
_allow_credentials = "*" not in _cors_origins

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(games.router)
app.include_router(wishlist.router)
app.include_router(alerts.router)
app.include_router(collections.router)
app.include_router(followed.router)


@app.get("/api")
async def root():
    return {"status": "ok", "message": "GameDeals Tracker API"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
