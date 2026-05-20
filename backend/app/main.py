from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from datetime import datetime, timezone
from pathlib import Path
import os

from app.config import settings
from app.database import init_db
from app.routers import auth, games, wishlist, alerts, collections, stats, sitemap, stores, blog, regional, freebies, bundles

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
    # Disable interactive docs on Vercel (production) to avoid API reconnaissance.
    docs_url=None if _is_vercel else "/docs",
    redoc_url=None if _is_vercel else "/redoc",
    openapi_url=None if _is_vercel else "/openapi.json",
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
app.include_router(stats.router)
app.include_router(sitemap.router)
app.include_router(stores.router)
app.include_router(blog.router)
app.include_router(regional.router)
app.include_router(freebies.router)
app.include_router(bundles.router)


@app.get("/api")
async def root():
    return {"status": "ok", "message": "GameDeals Tracker API"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


class ClientLogEntry(BaseModel):
    level: str
    message: str
    stack: str | None = None
    source: str | None = None
    line: int | None = None
    column: int | None = None
    url: str | None = None
    userAgent: str | None = None
    timestamp: str | None = None


def _append_client_log(filename: str, line: str) -> None:
    log_dir = os.environ.get("ITAD_RUN_LOG_DIR")
    if not log_dir:
        # Fallback when backend was not launched via start.ps1.
        repo_root = Path(__file__).resolve().parents[2]
        log_dir = str(repo_root / "logs" / "browser-fallback")

    try:
        os.makedirs(log_dir, exist_ok=True)
        path = os.path.join(log_dir, filename)
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        # Client log failures should never impact API flow.
        pass


@app.post("/api/client-log")
async def client_log(entry: ClientLogEntry):
    ts = datetime.now(timezone.utc).isoformat()
    parts = [
        f"[{ts}]",
        "[frontend-browser]",
        f"[{entry.level}]",
        entry.message,
    ]
    if entry.url:
        parts.append(f"url={entry.url}")
    if entry.source:
        parts.append(f"source={entry.source}:{entry.line}:{entry.column}")

    line = " ".join(parts)
    _append_client_log("errors.log", line)
    _append_client_log("all.log", line)

    if entry.stack:
        _append_client_log("errors.log", f"[{ts}] [frontend-browser] [stack] {entry.stack}")

    return {"ok": True}
