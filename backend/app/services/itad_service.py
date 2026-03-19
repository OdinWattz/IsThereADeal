"""
IsThereAnyDeal (ITAD) API service – fetches deals from 30+ stores.
Docs: https://docs.isthereanydeal.com/
"""
import httpx
from typing import Optional, List, Dict, Any
from app.config import settings

ITAD_BASE = "https://api.isthereanydeal.com"


def _has_key() -> bool:
    return bool(settings.ITAD_API_KEY) and settings.ITAD_API_KEY not in ("your_itad_api_key_here", "")


async def _get(path: str, params: dict) -> Optional[Any]:
    if not _has_key():
        return None
    params["key"] = settings.ITAD_API_KEY
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{ITAD_BASE}{path}", params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


async def _post(path: str, params: dict, body: Any) -> Optional[Any]:
    if not _has_key():
        return None
    params["key"] = settings.ITAD_API_KEY
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(f"{ITAD_BASE}{path}", params=params, json=body)
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

    # ITAD v3 uses POST with a JSON array of game IDs and returns [{id, deals}]
    rows = await _post("/games/prices/v3", {"country": "NL"}, [game_id])
    if not rows or not isinstance(rows, list):
        return []

    results = []
    for row in rows:
        for deal in row.get("deals", []):
            shop = deal.get("shop", {})
            price_info = deal.get("price", {})
            regular_info = deal.get("regular", {})

            sale_price = price_info.get("amount")
            regular_price = regular_info.get("amount")
            currency = price_info.get("currency", "EUR")
            discount_pct = deal.get("cut", 0)
            is_on_sale = discount_pct > 0

            results.append({
                "store_name": shop.get("name", "Unknown"),
                "store_id": str(shop.get("id", "")),
                "regular_price": regular_price,
                "sale_price": sale_price if is_on_sale else None,
                "discount_percent": discount_pct,
                "currency": currency,
                "url": deal.get("url", ""),
                "is_on_sale": is_on_sale,
            })

    return sorted(results, key=lambda x: (x.get("sale_price") or x.get("regular_price") or 999))


async def get_price_history(steam_appid: str) -> List[Dict[str, Any]]:
    """Fetch historical prices from ITAD (GET /games/history/v2 returns a flat list)."""
    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        return []

    # Flat list: [{timestamp, shop, deal: {price, regular, cut}}]
    entries = await _get("/games/history/v2", {"id": game_id, "country": "NL"})
    if not entries or not isinstance(entries, list):
        return []

    results = []
    for entry in entries:
        shop = entry.get("shop", {})
        deal = entry.get("deal", {})
        price_info = deal.get("price", {})
        regular_info = deal.get("regular", {})
        results.append({
            "store_name": shop.get("name", "Unknown"),
            "price": price_info.get("amount", 0),
            "regular_price": regular_info.get("amount"),
            "discount_percent": deal.get("cut", 0),
            "currency": price_info.get("currency", "EUR"),
            "recorded_at": entry.get("timestamp", ""),  # timestamp is on root entry
        })
    return results
