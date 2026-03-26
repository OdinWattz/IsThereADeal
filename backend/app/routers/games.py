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
from app.services.itad_service import get_price_history, get_dlc_deals_for_game

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("/search", response_model=List[SearchResult])
async def search_games(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Search Steam for games."""
    steam_results = await search_steam_games(q)

    # Check which ones are already in our DB – non-fatal if DB is unavailable
    appids = [r["steam_appid"] for r in steam_results]
    try:
        db_result = await db.execute(select(Game).where(Game.steam_appid.in_(appids)))
        db_games = {g.steam_appid: g for g in db_result.scalars().all()}
    except Exception:
        db_games = {}

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


@router.get("/browse", response_model=List[GameOut])
async def browse_games(
    q: Optional[str] = None,
    genre: Optional[str] = None,
    developer: Optional[str] = None,
    publisher: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_discount: Optional[int] = None,
    min_metacritic: Optional[int] = None,
    min_review_score: Optional[int] = None,
    on_sale: Optional[bool] = None,
    sort_by: str = "name",
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Advanced search/browse with filters."""
    try:
        from sqlalchemy import or_

        # Get games - increase limit to get more games
        query = select(Game).options(selectinload(Game.prices)).limit(500)

        filters = []
        if q:
            search_term = f"%{q.lower()}%"
            filters.append(
                or_(
                    Game.name.ilike(search_term),
                    Game.developers.ilike(search_term),
                    Game.publishers.ilike(search_term),
                    Game.genres.ilike(search_term),
                )
            )

        if genre:
            filters.append(Game.genres.ilike(f"%{genre}%"))

        if developer:
            filters.append(Game.developers.ilike(f"%{developer}%"))

        if publisher:
            filters.append(Game.publishers.ilike(f"%{publisher}%"))

        if min_metacritic is not None:
            filters.append(Game.metacritic_score >= min_metacritic)

        if min_review_score is not None:
            filters.append(Game.steam_review_score >= min_review_score)

        if filters:
            query = query.where(*filters)

        result = await db.execute(query)
        games = result.scalars().all()

        # Enrich and filter in Python
        enriched_games = []
        for game in games:
            try:
                # Skip if no prices
                if not game.prices or len(game.prices) == 0:
                    continue

                enriched = _enrich_game(game)

                # Apply remaining filters
                if min_price is not None and (enriched.get("best_price") is None or enriched["best_price"] < min_price):
                    continue
                if max_price is not None and (enriched.get("best_price") is None or enriched["best_price"] > max_price):
                    continue
                if on_sale and not any(p.is_on_sale for p in game.prices):
                    continue
                if min_discount is not None:
                    max_discount = max((p.discount_percent for p in game.prices), default=0)
                    if max_discount < min_discount:
                        continue

                enriched_games.append(enriched)
            except Exception as e:
                print(f"Error enriching game {game.id}: {e}")
                continue

        # Sort
        if sort_by == "price":
            enriched_games.sort(key=lambda g: g.get("best_price") or 999999)
        elif sort_by == "discount":
            enriched_games.sort(
                key=lambda g: max((p.get("discount_percent", 0) for p in g.get("prices", [])), default=0),
                reverse=True,
            )
        elif sort_by == "metacritic":
            enriched_games.sort(key=lambda g: g.get("metacritic_score") or 0, reverse=True)
        elif sort_by == "reviews":
            enriched_games.sort(key=lambda g: g.get("steam_review_score") or 0, reverse=True)
        else:
            enriched_games.sort(key=lambda g: (g.get("name") or "").lower())

        # Paginate
        paginated = enriched_games[offset : offset + limit]

        return [GameOut(**g) for g in paginated]

    except Exception as e:
        print(f"Browse endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/featured", response_model=List[dict])
async def featured_deals():
    """Get featured Steam deals (no auth needed)."""
    return await get_featured_deals()


@router.get("/deal-of-the-day")
async def get_deal_of_the_day():
    """
    Get the featured Deal of the Day.
    Changes daily at midnight (deterministic based on date seed).
    """
    from app.services.cheapshark_service import get_trending_deals
    from datetime import datetime
    import random
    import httpx

    # Get top deals
    deals = await get_trending_deals(page=0, limit=100, apply_quality_filter=True)

    if not deals:
        return None

    # Filter to only include games with valid Steam data
    valid_deals = []
    for deal in deals:
        # Skip games with obviously invalid appids
        appid = str(deal.get("steam_appid", ""))
        if not appid or not appid.isdigit():
            continue

        # Skip games with very low deal ratings
        if deal.get("deal_rating", 0) < 5.0:
            continue

        # Skip games that are too cheap (often broken/removed)
        if deal.get("sale_price", 0) < 1.0:
            continue

        valid_deals.append(deal)

    if not valid_deals:
        return None

    # Use today's date as seed for deterministic daily selection
    today = datetime.utcnow().date()
    seed = int(today.strftime("%Y%m%d"))
    random.seed(seed)

    # Select from top 30 valid deals
    top_deals = valid_deals[:min(30, len(valid_deals))]

    # Try up to 5 times to find a game with a valid image
    for attempt in range(5):
        selected = random.choice(top_deals)

        # Quick check if Steam header image exists (fast HEAD request)
        try:
            async with httpx.AsyncClient(timeout=2) as client:
                img_url = selected.get("header_image", "")
                resp = await client.head(img_url)
                if resp.status_code == 200:
                    return selected  # Found a valid one!
        except:
            pass  # Try next one

        # Remove this deal and try again
        top_deals.remove(selected)
        if not top_deals:
            break

    # Fallback: return first deal even if image might be broken
    return valid_deals[0] if valid_deals else None


@router.get("/deals")
async def get_deals(
    page: int = 0,
    limit: int = 20,
):
    """Get trending deals from CheapShark (fresh, paginated, sorted by deal quality)."""
    from app.services.cheapshark_service import get_trending_deals
    return await get_trending_deals(page, limit, apply_quality_filter=True)


@router.get("/free")
async def get_free_games_route(limit: int = 50):
    """
    Get currently free games from various stores.
    Returns games that are free to play or temporarily free.

    Query params:
        limit: Maximum number of results (default: 50)
    """
    from app.services.cheapshark_service import get_free_games
    return await get_free_games(limit)


@router.get("/{steam_appid}", response_model=GameOut)
async def get_game(
    steam_appid: str,
    refresh: bool = False,
    include_key_resellers: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Get a game with all prices. Fetches from APIs if not in DB or refresh=true.

    Args:
        steam_appid: Steam application ID
        refresh: Force refresh from APIs
        include_key_resellers: Include key reseller prices (slower, opt-in)
    """
    # Check in-memory cache first for non-refresh requests
    from app.services import cache as _cache
    cache_key = f"game_full:{steam_appid}"
    if not refresh:
        cached = _cache.get(cache_key, ttl=300)  # 5 min cache
        if cached is not None:
            return cached

    game = None
    try:
        result = await db.execute(
            select(Game)
            .where(Game.steam_appid == steam_appid)
            .options(selectinload(Game.prices))
        )
        game = result.scalar_one_or_none()
    except Exception:
        game = None

    if game is None or refresh:
        try:
            game = await upsert_game_and_prices(db, steam_appid, include_key_resellers)
            if game is None:
                raise HTTPException(status_code=404, detail="Game not found")
            # Prices already loaded via eager loading - no second query needed!
        except HTTPException:
            raise
        except Exception:
            # DB unavailable – fetch directly from APIs and return without persisting
            from app.services.price_aggregator import fetch_all_prices
            data = await fetch_all_prices(steam_appid, include_key_resellers)
            steam_data = data.get("steam_data")
            if not steam_data:
                raise HTTPException(status_code=404, detail="Game not found")
            prices_out = [
                {
                    "store_name": p.get("store_name", "Unknown"),
                    "store_id": p.get("store_id"),
                    "regular_price": p.get("regular_price"),
                    "sale_price": p.get("sale_price"),
                    "discount_percent": p.get("discount_percent", 0),
                    "currency": p.get("currency", "EUR"),
                    "url": p.get("url"),
                    "is_on_sale": p.get("is_on_sale", False),
                }
                for p in data.get("prices", [])
            ]
            best = data.get("best_price")
            from app.models.schemas import GameOut as GameOutSchema, GamePriceOut
            return GameOutSchema(
                id=0,
                steam_appid=steam_appid,
                name=steam_data.get("name", ""),
                header_image=steam_data.get("header_image"),
                short_description=steam_data.get("short_description"),
                genres=steam_data.get("genres"),
                developers=steam_data.get("developers"),
                publishers=steam_data.get("publishers"),
                release_date=steam_data.get("release_date"),
                steam_url=steam_data.get("steam_url"),
                prices=[GamePriceOut(**p) for p in prices_out],
                best_price=best.get("sale_price") or best.get("regular_price") if best else None,
                best_store=best.get("store_name") if best else None,
            )

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    result = _enrich_game(game)
    _cache.set(cache_key, result)
    return result


@router.get("/{steam_appid}/history", response_model=List[PriceHistoryPoint])
async def get_price_history_route(
    steam_appid: str,
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a game – from DB + ITAD."""
    db_history = []
    try:
        result = await db.execute(select(Game).where(Game.steam_appid == steam_appid))
        game = result.scalar_one_or_none()
        if game:
            hist_result = await db.execute(
                select(PriceHistory)
                .where(PriceHistory.game_id == game.id)
                .order_by(PriceHistory.recorded_at.asc())
            )
            db_history = hist_result.scalars().all()
    except Exception:
        db_history = []

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


@router.get("/{steam_appid}/dlc-deals", response_model=List[dict])
async def get_dlc_deals_route(steam_appid: str):
    """Get on-sale DLC for a game (no DB needed, live from Steam + ITAD)."""
    try:
        return await get_dlc_deals_for_game(steam_appid)
    except Exception:
        return []


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
