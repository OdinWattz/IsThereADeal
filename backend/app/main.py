from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.services.scheduler import start_scheduler, stop_scheduler
from app.routers import auth, games, wishlist, alerts


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title="GameDeals Tracker API",
    description="Aggregates game prices from Steam, GOG, Humble, key resellers and more.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(games.router)
app.include_router(wishlist.router)
app.include_router(alerts.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "GameDeals Tracker API"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
