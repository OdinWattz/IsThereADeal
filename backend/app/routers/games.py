from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import re

from app.database import get_db
from app.models.models import Game, GamePrice, PriceHistory, DailyFeaturedDeal, User
from app.models.schemas import GameOut, GamePriceOut, PriceHistoryPoint, SearchResult
from app.auth import get_admin_user
from app.services.steam_service import search_steam_games, get_featured_deals
from app.services.price_aggregator import upsert_game_and_prices
from app.services.itad_service import get_price_history, get_dlc_deals_for_game
import httpx

router = APIRouter(prefix="/api/games", tags=["games"])


def _safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_optional_int(value) -> Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_optional_float(value) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_price_payload(raw: dict) -> dict:
    return {
        "store_name": str(raw.get("store_name") or "Unknown"),
        "store_id": _safe_optional_int(raw.get("store_id")),
        "regular_price": _safe_optional_float(raw.get("regular_price")),
        "sale_price": _safe_optional_float(raw.get("sale_price")),
        "discount_percent": _safe_int(raw.get("discount_percent"), 0),
        "currency": str(raw.get("currency") or "EUR"),
        "url": raw.get("url"),
        "is_on_sale": bool(raw.get("is_on_sale", False)),
        "lowest_ever_price": _safe_optional_float(raw.get("lowest_ever_price")),
        "lowest_ever_currency": raw.get("lowest_ever_currency"),
        "is_all_time_low": bool(raw.get("is_all_time_low", False)),
    }


def _extract_steam_movie_id(movie: dict) -> Optional[str]:
    movie_id = movie.get("id")
    if movie_id is not None:
        try:
            return str(int(movie_id))
        except (TypeError, ValueError):
            pass

    thumbnail = movie.get("thumbnail")
    if isinstance(thumbnail, str):
        match = re.search(r"/steam/apps/(\d+)/movie", thumbnail)
        if match:
                        return match.group(1)

    return None


def _steam_movie_mp4_url(movie_id: str) -> str:
    return f"https://cdn.akamai.steamstatic.com/steam/apps/{movie_id}/movie_max.mp4"


def _daily_featured_deal_to_dict(deal: DailyFeaturedDeal) -> dict:
    return {
        "steam_appid": deal.steam_appid,
        "name": deal.name,
        "sale_price": deal.sale_price,
        "regular_price": deal.regular_price,
        "discount_percent": deal.discount_percent,
        "store_name": deal.store_name,
        "header_image": deal.header_image,
        "deal_rating": deal.deal_rating,
        "url": deal.url,
    }


async def _select_and_store_daily_featured_deal(
    db: AsyncSession,
    today,
    excluded_appids: Optional[set[str]] = None,
) -> Optional[DailyFeaturedDeal]:
    from app.services.cheapshark_service import get_trending_deals
    import random

    excluded_appids = excluded_appids or set()

    # Get top deals
    deals = await get_trending_deals(page=0, limit=100, apply_quality_filter=True)
    if not deals:
        return None

    # Filter to only include games with valid Steam data
    valid_deals = []
    for deal in deals:
        appid = str(deal.get("steam_appid", ""))
        if not appid or not appid.isdigit():
            continue
        if deal.get("deal_rating", 0) < 5.0:
            continue
        if deal.get("sale_price", 0) < 1.0:
            continue
        valid_deals.append(deal)

    if not valid_deals:
        return None

    # Exclude deals shown in the last 30 days and explicitly excluded appids.
    recent_cutoff = today - timedelta(days=30)
    recent_result = await db.execute(
        select(DailyFeaturedDeal.steam_appid).where(DailyFeaturedDeal.featured_date >= recent_cutoff)
    )
    recent_appids = {str(row[0]) for row in recent_result.all()}
    recent_appids.update(str(appid) for appid in excluded_appids if appid)

    eligible_deals = [deal for deal in valid_deals if str(deal.get("steam_appid", "")) not in recent_appids]
    chosen_pool = eligible_deals or [
        deal for deal in valid_deals if str(deal.get("steam_appid", "")) not in excluded_appids
    ]

    if not chosen_pool:
        return None

    # Shuffle to avoid picking the same top item every time if the upstream list order is stable.
    random.shuffle(chosen_pool)
    selected = chosen_pool[0]

    # Quick check if Steam header image exists (fast HEAD request)
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            img_url = selected.get("header_image", "")
            resp = await client.head(img_url)
            if resp.status_code != 200 and valid_deals:
                for candidate in chosen_pool[1:10]:
                    try:
                        candidate_img = candidate.get("header_image", "")
                        candidate_resp = await client.head(candidate_img)
                        if candidate_resp.status_code == 200:
                            selected = candidate
                            break
                    except Exception:
                        continue
    except Exception:
        pass

    snapshot = DailyFeaturedDeal(
        featured_date=today,
        steam_appid=str(selected.get("steam_appid", "")),
        name=str(selected.get("name", "")),
        sale_price=float(selected.get("sale_price", 0) or 0),
        regular_price=float(selected.get("regular_price", 0) or 0),
        discount_percent=int(selected.get("discount_percent", 0) or 0),
        store_name=str(selected.get("store_name", "Steam")),
        header_image=str(selected.get("header_image", "")),
        deal_rating=float(selected.get("deal_rating", 0) or 0),
        url=selected.get("url"),
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


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


@router.get("/browse")
async def browse_games(
    page: int = 0,
    limit: int = Query(100, ge=1, le=100),
    min_price: float = 0,
    max_price: float = 999,
    min_discount: int = Query(0, ge=0, le=90),
    sort_by: str = "DealRating",
):
    """
    Browse game deals from CheapShark with filters.
    Shows live deals from multiple stores.

    Note: Text filters (q, genre, developer, publisher) are not supported
    because CheapShark API doesn't support them. Use price/discount filters instead.
    """
    from app.services.cheapshark_service import browse_all_deals

    # Map frontend sort values to CheapShark sort values
    sort_map = {
        "name": "Title",
        "price": "Price",
        "discount": "Savings",
        "metacritic": "Metacritic",
        "reviews": "Reviews",
    }
    cs_sort = sort_map.get(sort_by, "DealRating")

    # If user wants high discounts, automatically sort by Savings for better results
    if min_discount >= 50 and cs_sort == "DealRating":
        cs_sort = "Savings"

    result = await browse_all_deals(page, limit, min_price, max_price, min_discount, cs_sort)
    return result


@router.get("/featured", response_model=List[dict])
async def featured_deals():
    """Get featured Steam deals (no auth needed)."""
    return await get_featured_deals()


@router.get("/deal-of-the-day")
async def get_deal_of_the_day(db: AsyncSession = Depends(get_db)):
    """
    Get the featured Deal of the Day.
    Stores one selected deal per day and avoids reusing deals from the last 30 days.
    """
    today = datetime.now(timezone.utc).date()

    existing_result = await db.execute(
        select(DailyFeaturedDeal).where(DailyFeaturedDeal.featured_date == today)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return _daily_featured_deal_to_dict(existing)

    snapshot = await _select_and_store_daily_featured_deal(db=db, today=today)
    if not snapshot:
        return None

    return _daily_featured_deal_to_dict(snapshot)


@router.post("/deal-of-the-day/skip")
async def skip_deal_of_the_day(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: skip today's featured deal and select another one."""
    _ = current_user
    today = datetime.now(timezone.utc).date()

    existing_result = await db.execute(
        select(DailyFeaturedDeal).where(DailyFeaturedDeal.featured_date == today)
    )
    existing = existing_result.scalar_one_or_none()

    excluded_appids: set[str] = set()
    if existing:
        excluded_appids.add(str(existing.steam_appid))
        await db.delete(existing)
        await db.commit()

    snapshot = await _select_and_store_daily_featured_deal(
        db=db,
        today=today,
        excluded_appids=excluded_appids,
    )

    if not snapshot:
        raise HTTPException(status_code=404, detail="No replacement deal available")

    return _daily_featured_deal_to_dict(snapshot)


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
    cache_key = f"game_full:{steam_appid}:kr:{int(include_key_resellers)}"
    if not refresh:
        cached = _cache.get(cache_key, ttl=900)  # 15 min cache
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
            # Reload with prices eagerly loaded
            result = await db.execute(
                select(Game)
                .where(Game.id == game.id)
                .options(selectinload(Game.prices))
            )
            game = result.scalar_one_or_none()
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Persist Error] Could not save {steam_appid}: {e}")
            try:
                await db.rollback()
            except Exception:
                pass
            # DB unavailable – fetch directly from APIs and return without persisting
            from app.services.price_aggregator import fetch_all_prices
            data = await fetch_all_prices(steam_appid, include_key_resellers)
            steam_data = data.get("steam_data")
            if not steam_data:
                raise HTTPException(status_code=404, detail="Game not found")
            prices_out = [
                _safe_price_payload(p)
                for p in data.get("prices", [])
            ]
            best = data.get("best_price")
            from app.models.schemas import GameOut as GameOutSchema, GamePriceOut
            out = GameOutSchema(
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
            _cache.set(cache_key, out, ttl=900)
            return out

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    result = _enrich_game(game)
    _cache.set(cache_key, result, ttl=900)
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

    from datetime import timezone

    def _sort_key(point: PriceHistoryPoint):
        recorded_at = point.recorded_at
        if recorded_at.tzinfo is None:
            return recorded_at.replace(tzinfo=timezone.utc)
        return recorded_at.astimezone(timezone.utc)

    return sorted(combined, key=_sort_key)


@router.get("/{steam_appid}/dlc-deals", response_model=List[dict])
async def get_dlc_deals_route(steam_appid: str):
    """Get on-sale DLC for a game (no DB needed, live from Steam + ITAD)."""
    try:
        return await get_dlc_deals_for_game(steam_appid)
    except Exception:
        return []


@router.get("/{steam_appid}/media")
async def get_game_media(steam_appid: str):
    """Get screenshot/media assets from the Steam store page."""
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=8.0),
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/json,text/plain,*/*",
            },
        ) as client:
            resp = await client.get(
                "https://store.steampowered.com/api/appdetails",
                params={"appids": steam_appid, "l": "english", "cc": "NL"},
            )
            resp.raise_for_status()
            data = resp.json().get(str(steam_appid), {})

        if not data.get("success"):
            print(f"[media] Steam appdetails returned success=false for {steam_appid}")
            return {"screenshots": [], "trailers": []}

        app_data = data.get("data", {})
        screenshots = []
        for shot in app_data.get("screenshots", []):
            full = shot.get("path_full")
            thumb = shot.get("path_thumbnail")
            if full:
                screenshots.append({"full": full, "thumb": thumb or full})

        trailers = []
        for movie in app_data.get("movies", []):
            try:
                thumb = movie.get("thumbnail")
                mp4 = (movie.get("mp4") or {}).get("max") or (movie.get("mp4") or {}).get("480")
                webm = (movie.get("webm") or {}).get("max") or (movie.get("webm") or {}).get("480")

                movie_id = _extract_steam_movie_id(movie)
                if not mp4 and movie_id:
                    mp4 = _steam_movie_mp4_url(movie_id)

                highlight = movie.get("highlight")
                steam_url = None
                if isinstance(highlight, dict):
                    steam_url = highlight.get("mp4") or highlight.get("webm")
                elif isinstance(highlight, str):
                    steam_url = highlight

                if thumb or mp4 or webm:
                    trailers.append({
                        "name": movie.get("name") or "Steam trailer",
                        "thumbnail": thumb,
                        "mp4": mp4,
                        "webm": webm,
                        "steam_url": steam_url,
                    })
            except Exception:
                # Never fail the whole endpoint on one malformed movie payload.
                continue

        return {
            "screenshots": screenshots[:12],
            "trailers": trailers[:6],
        }
    except Exception as e:
        print(f"[media] Failed to fetch media for {steam_appid}: {e}")
        return {"screenshots": [], "trailers": []}


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

    try:
        out = GameOut.model_validate(game)
    except Exception:
        price_models = []
        for price in prices:
            price_models.append(GamePriceOut(**_safe_price_payload({
                "store_name": getattr(price, "store_name", None),
                "store_id": getattr(price, "store_id", None),
                "regular_price": getattr(price, "regular_price", None),
                "sale_price": getattr(price, "sale_price", None),
                "discount_percent": getattr(price, "discount_percent", 0),
                "currency": getattr(price, "currency", "EUR"),
                "url": getattr(price, "url", None),
                "is_on_sale": getattr(price, "is_on_sale", False),
                "lowest_ever_price": getattr(price, "lowest_ever_price", None),
                "lowest_ever_currency": getattr(price, "lowest_ever_currency", None),
                "is_all_time_low": getattr(price, "is_all_time_low", False),
            })))

        out = GameOut(
            id=game.id,
            steam_appid=game.steam_appid,
            name=game.name,
            header_image=game.header_image,
            short_description=game.short_description,
            genres=game.genres,
            developers=game.developers,
            publishers=game.publishers,
            release_date=game.release_date,
            steam_url=game.steam_url,
            prices=price_models,
            historic_low_price=game.historic_low_price,
            historic_low_date=game.historic_low_date,
            metacritic_score=game.metacritic_score,
            steam_review_score=game.steam_review_score,
            steam_review_count=game.steam_review_count,
            player_count_current=game.player_count_current,
            player_count_peak=game.player_count_peak,
        )
    out.best_price = best_price
    out.best_store = best_store
    return out
