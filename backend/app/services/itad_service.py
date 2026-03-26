"""\nIsThereAnyDeal (ITAD) API service – fetches deals from 30+ stores.\nDocs: https://docs.isthereanydeal.com/\n"""
import httpx
from typing import Optional, List, Dict, Any
from app.config import settings
from app.services import cache as _cache

_HISTORY_TTL = 1800  # 30 minutes
_DLC_TTL = 1800      # 30 minutes
_ITAD_ID_TTL = 86400  # 24 hours – game IDs are stable

ITAD_BASE = "https://api.isthereanydeal.com"


def _has_key() -> bool:
    return bool(settings.ITAD_API_KEY) and settings.ITAD_API_KEY not in ("your_itad_api_key_here", "")


async def _get(path: str, params: dict) -> Optional[Any]:
    if not _has_key():
        return None
    params["key"] = settings.ITAD_API_KEY
    async with httpx.AsyncClient(timeout=5) as client:
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
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.post(f"{ITAD_BASE}{path}", params=params, json=body)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


async def get_game_id_by_appid(steam_appid: str) -> Optional[str]:
    """Resolve a Steam appid to an ITAD plain/id. Result cached 24 h."""
    cache_key = f"itad_id:{steam_appid}"
    cached = _cache.get(cache_key, ttl=_ITAD_ID_TTL)
    if cached is not None:
        return None if cached == "__not_found__" else cached

    data = await _get("/games/lookup/v1", {"appid": steam_appid})
    if data and data.get("found"):
        game_id = data["game"]["id"]
        _cache.set(cache_key, game_id)
        return game_id

    # Cache negative result to avoid hammering ITAD for unknown games
    _cache.set(cache_key, "__not_found__")
    return None


async def get_prices_for_game(steam_appid: str) -> List[Dict[str, Any]]:
    """Fetch current prices across all stores tracked by ITAD."""
    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        return []

    # ITAD v3 uses POST with a JSON array of game IDs and returns [{id, deals}]
    try:
        rows = await _post("/games/prices/v3", {"country": "NL"}, [game_id])
    except Exception:
        # API failure - return empty but don't cache
        return []

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


async def get_dlc_deals_for_game(steam_appid: str) -> List[Dict[str, Any]]:
    """
    Fetch the base game's DLC list from Steam, then get on-sale prices from ITAD.
    Returns only DLCs that currently have a discount.
    """
    import asyncio

    cache_key = f"dlc:{steam_appid}"
    cached = _cache.get(cache_key, ttl=_DLC_TTL)
    if cached is not None:
        return cached

    # Step 1 – get DLC appids from Steam
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            resp = await client.get(
                "https://store.steampowered.com/api/appdetails",
                params={"appids": steam_appid, "filters": "basic,dlc"},
            )
            game_data = resp.json().get(str(steam_appid), {}).get("data", {})
            dlc_appids = [str(a) for a in game_data.get("dlc", [])]
    except Exception:
        # Steam API failure - don't cache
        return []

    if not dlc_appids:
        # No DLC available - cache empty result for shorter time
        _cache.set(cache_key, [], ttl=600)  # 10 min
        return []

    dlc_appids = dlc_appids[:15]  # cap at 15 to keep request time reasonable

    # Step 2 – resolve each DLC steam appid → ITAD game id + title (concurrent)
    async def lookup_dlc(appid: str):
        data = await _get("/games/lookup/v1", {"appid": appid})
        if data and data.get("found"):
            return {"appid": appid, "itad_id": data["game"]["id"], "title": data["game"]["title"]}
        return None

    lookups = await asyncio.gather(*[lookup_dlc(a) for a in dlc_appids])
    valid = [l for l in lookups if l]
    if not valid:
        # Couldn't resolve DLC IDs - don't cache (might be ITAD issue)
        return []

    # Step 3 – batch price fetch
    itad_ids = [l["itad_id"] for l in valid]
    try:
        rows = await _post("/games/prices/v3", {"country": "NL"}, itad_ids)
    except Exception:
        # ITAD API failure - don't cache
        return []

    if not rows or not isinstance(rows, list):
        return []

    id_map = {l["itad_id"]: l for l in valid}

    results = []
    for row in rows:
        info = id_map.get(row.get("id"), {})
        on_sale = [d for d in row.get("deals", []) if d.get("cut", 0) > 0]
        if not on_sale:
            continue
        best = min(on_sale, key=lambda d: d.get("price", {}).get("amount") or 999)
        price_info = best.get("price", {})
        regular_info = best.get("regular", {})
        shop = best.get("shop", {})
        results.append({
            "steam_appid": info.get("appid", ""),
            "title": info.get("title", "Onbekende DLC"),
            "sale_price": price_info.get("amount"),
            "regular_price": regular_info.get("amount"),
            "discount_percent": best.get("cut", 0),
            "store_name": shop.get("name", ""),
            "url": best.get("url", ""),
            "currency": price_info.get("currency", "EUR"),
        })

    results.sort(key=lambda x: x.get("sale_price") or 999)
    # Only cache if we have results
    if results:
        _cache.set(cache_key, results)
    return results


async def get_price_history(steam_appid: str) -> List[Dict[str, Any]]:
    """Fetch historical prices from ITAD (GET /games/history/v2 returns a flat list)."""
    cache_key = f"history:{steam_appid}"
    cached = _cache.get(cache_key, ttl=_HISTORY_TTL)
    if cached is not None:
        return cached

    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        # Cache "not found" for shorter time (5 min) to allow retries
        _cache.set(cache_key, [], ttl=300)
        return []

    # Request 2 years of history
    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(days=730)).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Flat list: [{timestamp, shop, deal: {price, regular, cut}}]
    entries = await _get("/games/history/v2", {"id": game_id, "country": "NL", "since": since})
    if not entries or not isinstance(entries, list):
        # Don't cache API failures - allow immediate retry
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

    # Only cache successful results with data
    if results:
        _cache.set(cache_key, results)

    return results
