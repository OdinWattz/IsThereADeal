"""\nPrice aggregator – combines prices from Steam, ITAD, CheapShark and key resellers\nand persists them to the database.\n"""
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.models import Game, GamePrice, PriceHistory
from app.services.steam_service import get_steam_app_details
from app.services.itad_service import get_prices_for_game, get_price_history
from app.services.cheapshark_service import get_deals_by_steam_appid
from app.services.keyreseller_service import get_all_key_reseller_prices
from app.services import cache as _cache

_PRICES_TTL = 300   # 5 minutes
_HISTORY_TTL = 1800  # 30 minutes


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def fetch_all_prices(steam_appid: str, include_key_resellers: bool = False) -> Dict[str, Any]:
    """
    Fetch prices from all sources in parallel and return a merged dict.
    Results are cached in-memory for _PRICES_TTL seconds.

    Args:
        steam_appid: Steam application ID
        include_key_resellers: If True, fetch prices from key resellers (slower)
    """
    cache_key = f"prices:{steam_appid}"
    cached = _cache.get(cache_key, ttl=_PRICES_TTL)
    if cached is not None:
        return cached
    steam_task = get_steam_app_details(steam_appid)
    itad_task = get_prices_for_game(steam_appid)
    cheap_task = get_deals_by_steam_appid(steam_appid)

    steam_data, itad_prices, cheap_prices = await asyncio.gather(
        steam_task, itad_task, cheap_task, return_exceptions=True
    )

    if isinstance(steam_data, Exception):
        steam_data = None
    if isinstance(itad_prices, Exception):
        itad_prices = []
    if isinstance(cheap_prices, Exception):
        cheap_prices = []

    # Fetch key reseller prices (slower, run after we have game name)
    # Only if explicitly requested - uses separate cache
    key_prices = []
    if include_key_resellers:
        game_name = ""
        if steam_data:
            game_name = steam_data.get("name", "")

        if game_name:
            # Check separate cache first (longer TTL for slow API calls)
            key_cache_key = f"key_resellers:{game_name.lower()}"
            cached_keys = _cache.get(key_cache_key, ttl=600)  # 10 min
            if cached_keys is not None:
                key_prices = cached_keys
            else:
                key_prices = await get_all_key_reseller_prices(game_name)
                _cache.set(key_cache_key, key_prices)

    # Merge: deduplicate by normalised store name
    all_prices: List[Dict] = []
    seen_names: set = set()

    def _name_key(p: Dict) -> str:
        return p.get("store_name", "").lower().strip()

    # Steam official first
    if steam_data and "price" in steam_data:
        p = steam_data["price"]
        if p.get("regular_price") is not None:
            all_prices.append(p)
            seen_names.add(_name_key(p))

    # ITAD prices
    for p in (itad_prices or []):
        k = _name_key(p)
        if k not in seen_names:
            all_prices.append(p)
            seen_names.add(k)

    # CheapShark fills in gaps
    for p in (cheap_prices or []):
        k = _name_key(p)
        if k not in seen_names:
            all_prices.append(p)
            seen_names.add(k)

    # Key reseller prices (always unique enough)
    for p in key_prices:
        p["is_key_reseller"] = True
        all_prices.append(p)

    # Best price
    valid = [p for p in all_prices if (p.get("sale_price") or p.get("regular_price"))]
    if valid:
        best = min(valid, key=lambda x: x.get("sale_price") or x.get("regular_price") or 999)
    else:
        best = None

    result = {
        "steam_data": steam_data,
        "prices": all_prices,
        "best_price": best,
    }
    _cache.set(cache_key, result)
    return result


async def upsert_game_and_prices(db: AsyncSession, steam_appid: str, include_key_resellers: bool = False) -> Optional[Game]:
    """
    Fetch all data for a game, upsert the Game record, and refresh its prices.

    Args:
        db: Database session
        steam_appid: Steam application ID
        include_key_resellers: If True, fetch prices from key resellers (slower)
    """
    data = await fetch_all_prices(steam_appid, include_key_resellers)
    steam_data = data.get("steam_data")
    prices = data.get("prices", [])

    if not steam_data:
        return None

    # Upsert game
    result = await db.execute(select(Game).where(Game.steam_appid == steam_appid))
    game = result.scalar_one_or_none()

    if game is None:
        game = Game(steam_appid=steam_appid)
        db.add(game)

    game.name = steam_data.get("name", "")
    game.header_image = steam_data.get("header_image", "")
    game.short_description = steam_data.get("short_description", "")
    game.genres = steam_data.get("genres", "")
    game.developers = steam_data.get("developers", "")
    game.publishers = steam_data.get("publishers", "")
    game.release_date = steam_data.get("release_date", "")
    game.steam_url = steam_data.get("steam_url", "")
    game.last_updated = utcnow()

    await db.flush()

    # Delete old prices and replace – commit first so the unique constraint is cleared
    await db.execute(delete(GamePrice).where(GamePrice.game_id == game.id))
    await db.execute(delete(PriceHistory).where(
        PriceHistory.game_id == game.id,
        PriceHistory.recorded_at >= utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ))
    await db.flush()

    for p in prices:
        gp = GamePrice(
            game_id=game.id,
            store_name=p.get("store_name", "Unknown"),
            store_id=p.get("store_id"),
            regular_price=p.get("regular_price"),
            sale_price=p.get("sale_price"),
            discount_percent=p.get("discount_percent", 0),
            currency=p.get("currency", "EUR"),
            url=p.get("url", ""),
            is_on_sale=p.get("is_on_sale", False),
            fetched_at=utcnow(),
        )
        db.add(gp)

        # Record price history for official stores
        if not p.get("is_key_reseller"):
            ph = PriceHistory(
                game_id=game.id,
                store_name=p.get("store_name", "Unknown"),
                price=p.get("sale_price") or p.get("regular_price") or 0,
                regular_price=p.get("regular_price"),
                discount_percent=p.get("discount_percent", 0),
                currency=p.get("currency", "EUR"),
                recorded_at=utcnow(),
            )
            db.add(ph)

    await db.flush()

    # Update historic low if current price is lower
    valid_prices = [p for p in prices if (p.get("sale_price") or p.get("regular_price"))]
    if valid_prices:
        current_low = min(valid_prices, key=lambda x: x.get("sale_price") or x.get("regular_price") or 999)
        current_low_price = current_low.get("sale_price") or current_low.get("regular_price")

        if current_low_price:
            # Check if this is a new historic low
            if game.historic_low_price is None or current_low_price < game.historic_low_price:
                game.historic_low_price = current_low_price
                game.historic_low_date = utcnow()
                print(f"[Historic Low] New low for {game.name}: €{current_low_price} (was: €{game.historic_low_price or 'N/A'})")

    await db.flush()

    # Eagerly load prices relationship before returning to avoid N+1 queries
    await db.refresh(game, ["prices"])

    return game
