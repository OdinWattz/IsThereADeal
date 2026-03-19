from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models.models import Game, GamePrice, PriceHistory
from app.models.schemas import GameOut, GamePriceOut, PriceHistoryPoint, SearchResult
from app.services.steam_service import search_steam_games, get_featured_deals
from app.services.price_aggregator import upsert_game_and_prices
from app.services.itad_service import get_price_history

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("/search", response_model=List[SearchResult])
async def search_games(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Search Steam for games."""
    steam_results = await search_steam_games(q)

    # Check which ones are already in our DB
    appids = [r["steam_appid"] for r in steam_results]
    db_result = await db.execute(select(Game).where(Game.steam_appid.in_(appids)))
    db_games = {g.steam_appid: g for g in db_result.scalars().all()}

    results = []
    for r in steam_results:
        db_game = db_games.get(r["steam_appid"])
        results.append(
            SearchResult(
                steam_appid=r["steam_appid"],
                name=r["name"],
                header_image=r.get("header_image"),
                is_in_db=db_game is not None,
                game_id=db_game.id if db_game else None,
            )
        )
    return results


@router.get("/featured", response_model=List[dict])
async def featured_deals():
    """Get featured Steam deals (no auth needed)."""
    return await get_featured_deals()


@router.get("/deals", response_model=List[GameOut])
async def get_deals(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 40,
):
    """Get all games currently on sale from our database."""
    result = await db.execute(
        select(Game)
        .join(GamePrice)
        .where(GamePrice.is_on_sale == True)
        .options(selectinload(Game.prices))
        .distinct()
        .offset(skip)
        .limit(limit)
    )
    games = result.scalars().all()
    return [_enrich_game(g) for g in games]


@router.get("/{steam_appid}", response_model=GameOut)
async def get_game(
    steam_appid: str,
    refresh: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Get a game with all prices. Fetches from APIs if not in DB or refresh=true."""
    result = await db.execute(
        select(Game)
        .where(Game.steam_appid == steam_appid)
        .options(selectinload(Game.prices))
    )
    game = result.scalar_one_or_none()

    if game is None or refresh:
        game = await upsert_game_and_prices(db, steam_appid)
        if game is None:
            raise HTTPException(status_code=404, detail="Game not found")
        # Reload with prices
        result = await db.execute(
            select(Game)
            .where(Game.steam_appid == steam_appid)
            .options(selectinload(Game.prices))
        )
        game = result.scalar_one_or_none()

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    return _enrich_game(game)


@router.get("/{steam_appid}/history", response_model=List[PriceHistoryPoint])
async def get_price_history_route(
    steam_appid: str,
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a game – from DB + ITAD."""
    result = await db.execute(select(Game).where(Game.steam_appid == steam_appid))
    game = result.scalar_one_or_none()

    db_history = []
    if game:
        hist_result = await db.execute(
            select(PriceHistory)
            .where(PriceHistory.game_id == game.id)
            .order_by(PriceHistory.recorded_at.asc())
        )
        db_history = hist_result.scalars().all()

    # Also fetch from ITAD for richer history
    itad_history = await get_price_history(steam_appid)

    combined = [PriceHistoryPoint.model_validate(h) for h in db_history]

    for h in itad_history:
        from datetime import datetime
        try:
            recorded = datetime.fromisoformat(h["recorded_at"].replace("Z", "+00:00"))
        except Exception:
            recorded = datetime.utcnow()
        combined.append(
            PriceHistoryPoint(
                store_name=h["store_name"],
                price=h["price"],
                regular_price=h.get("regular_price"),
                discount_percent=h.get("discount_percent", 0),
                currency=h.get("currency", "USD"),
                recorded_at=recorded,
            )
        )

    return sorted(combined, key=lambda x: x.recorded_at)


def _enrich_game(game: Game) -> GameOut:
    """Add computed best_price/best_store fields."""
    prices = game.prices or []
    valid = [p for p in prices if (p.sale_price or p.regular_price)]
    best_price = None
    best_store = None
    if valid:
        best = min(valid, key=lambda x: x.sale_price or x.regular_price or 999)
        best_price = best.sale_price or best.regular_price
        best_store = best.store_name

    out = GameOut.model_validate(game)
    out.best_price = best_price
    out.best_store = best_store
    return out
