"""
IsThereAnyDeal (ITAD) API service – fetches deals from 30+ stores.
Docs: https://docs.isthereanydeal.com/
"""
import httpx
from typing import Optional, List, Dict, Any
from app.config import settings

ITAD_BASE = "https://api.isthereanydeal.com"


async def _get(path: str, params: dict) -> Optional[Any]:
    if not settings.ITAD_API_KEY or settings.ITAD_API_KEY in ("your_itad_api_key_here", ""):
        return None
    params["key"] = settings.ITAD_API_KEY
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{ITAD_BASE}{path}", params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


async def get_game_id_by_appid(steam_appid: str) -> Optional[str]:
    """Resolve a Steam appid to an ITAD plain/id."""
    data = await _get("/games/lookup/v1", {"appid": steam_appid})
    if data and data.get("found"):
        return data["game"]["id"]
    return None


async def get_prices_for_game(steam_appid: str) -> List[Dict[str, Any]]:
    """Fetch current prices across all stores tracked by ITAD."""
    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        return []

    data = await _get("/games/prices/v2", {"id": game_id, "country": "NL"})
    if not data:
        return []

    results = []
    for deal in data.get("deals", []):
        shop = deal.get("shop", {})
        price_info = deal.get("price", {})
        regular_info = deal.get("regular", {})

        sale_price = price_info.get("amount")
        regular_price = regular_info.get("amount")
        currency = price_info.get("currency", "EUR")
        discount_pct = 0
        is_on_sale = False
        if regular_price and sale_price and regular_price > 0:
            discount_pct = round((1 - sale_price / regular_price) * 100)
            is_on_sale = discount_pct > 0

        results.append({
            "store_name": shop.get("name", "Unknown"),
            "store_id": shop.get("id", ""),
            "regular_price": regular_price,
            "sale_price": sale_price if is_on_sale else None,
            "discount_percent": discount_pct,
            "currency": currency,
            "url": deal.get("url", ""),
            "is_on_sale": is_on_sale,
        })

    return sorted(results, key=lambda x: (x.get("sale_price") or x.get("regular_price") or 999))


async def get_price_history(steam_appid: str) -> List[Dict[str, Any]]:
    """Fetch historical low prices from ITAD."""
    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        return []

    data = await _get("/games/history/v2", {"id": game_id, "country": "NL"})
    if not data:
        return []

    results = []
    for entry in data:
        shop = entry.get("shop", {})
        price_info = entry.get("deal", {})
        results.append({
            "store_name": shop.get("name", "Unknown"),
            "price": price_info.get("price", {}).get("amount", 0),
            "regular_price": price_info.get("regular", {}).get("amount"),
            "discount_percent": price_info.get("cut", 0),
            "currency": price_info.get("price", {}).get("currency", "USD"),
            "recorded_at": price_info.get("timestamp", ""),
        })
    return results
