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


async def get_dlc_deals_for_game(steam_appid: str) -> List[Dict[str, Any]]:
    """
    Fetch the base game's DLC list from Steam, then get on-sale prices from ITAD.
    Returns only DLCs that currently have a discount.
    """
    import asyncio

    # Step 1 – get DLC appids from Steam
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                "https://store.steampowered.com/api/appdetails",
                params={"appids": steam_appid, "filters": "basic,dlc"},
            )
            game_data = resp.json().get(str(steam_appid), {}).get("data", {})
            dlc_appids = [str(a) for a in game_data.get("dlc", [])]
        except Exception:
            return []

    if not dlc_appids:
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
        return []

    # Step 3 – batch price fetch
    itad_ids = [l["itad_id"] for l in valid]
    rows = await _post("/games/prices/v3", {"country": "NL"}, itad_ids)
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

    return sorted(results, key=lambda x: x.get("sale_price") or 999)


async def get_price_history(steam_appid: str) -> List[Dict[str, Any]]:
    """Fetch historical prices from ITAD (GET /games/history/v2 returns a flat list)."""
    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        return []

    # Request 2 years of history
    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(days=730)).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Flat list: [{timestamp, shop, deal: {price, regular, cut}}]
    entries = await _get("/games/history/v2", {"id": game_id, "country": "NL", "since": since})
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
