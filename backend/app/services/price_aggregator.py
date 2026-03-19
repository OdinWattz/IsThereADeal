"""
Price aggregator – combines prices from Steam, ITAD, CheapShark and key resellers
and persists them to the database.
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.models.models import Game, GamePrice, PriceHistory
from app.services.steam_service import get_steam_app_details
from app.services.itad_service import get_prices_for_game, get_price_history
from app.services.cheapshark_service import get_deals_by_steam_appid
from app.services.keyreseller_service import get_all_key_reseller_prices


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def fetch_all_prices(steam_appid: str) -> Dict[str, Any]:
    """
    Fetch prices from all sources in parallel and return a merged dict.
    """
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
    game_name = ""
    if steam_data:
        game_name = steam_data.get("name", "")

    key_prices = []
    if game_name:
        key_prices = await get_all_key_reseller_prices(game_name)

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

    return {
        "steam_data": steam_data,
        "prices": all_prices,
        "best_price": best,
    }


async def upsert_game_and_prices(db: AsyncSession, steam_appid: str) -> Optional[Game]:
    """
    Fetch all data for a game, upsert the Game record, and refresh its prices.
    """
    data = await fetch_all_prices(steam_appid)
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
    return game
