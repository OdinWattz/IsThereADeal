"""
CheapShark API service – free, no key needed.
Covers: Steam, Humble, GOG, GamersGate, GreenManGaming, Fanatical, etc.
Docs: https://apidocs.cheapshark.com/
"""
import httpx
from typing import List, Dict, Any, Optional

CHEAPSHARK_BASE = "https://www.cheapshark.com/api/1.0"

# Map CheapShark storeID -> friendly name
STORE_NAMES: Dict[str, str] = {
    "1": "Steam",
    "2": "GamersGate",
    "3": "GreenManGaming",
    "7": "GOG",
    "8": "Origin",
    "11": "Humble Store",
    "13": "Fanatical",
    "15": "Dreamgame",
    "21": "WinGameStore",
    "23": "GameBillet",
    "24": "Voidu",
    "25": "Epic Games Store",
    "27": "Games Planet",
    "28": "Games Load",
    "29": "2Game",
    "30": "IndieGala Store",
    "31": "Blizzard Shop",
    "33": "DLGamer",
    "34": "Noctre",
    "35": "DreamGame",
}


async def get_deals_for_title(game_title: str) -> List[Dict[str, Any]]:
    """Search CheapShark for deals by exact or fuzzy title."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{CHEAPSHARK_BASE}/deals",
                params={"title": game_title, "sortBy": "Price", "pageSize": 10},
            )
            resp.raise_for_status()
            deals = resp.json()
        except Exception:
            return []

    results = []
    for deal in deals:
        store_id = deal.get("storeID", "0")
        store_name = STORE_NAMES.get(store_id, f"Store #{store_id}")
        regular = float(deal.get("normalPrice", 0))
        sale = float(deal.get("salePrice", 0))
        discount_pct = int(deal.get("savings", 0))
        is_on_sale = discount_pct > 0

        results.append({
            "store_name": store_name,
            "store_id": f"cheapshark_{store_id}",
            "regular_price": regular,
            "sale_price": sale if is_on_sale else None,
            "discount_percent": discount_pct,
            "currency": "USD",
            "url": f"https://www.cheapshark.com/redirect?dealID={deal.get('dealID', '')}",
            "is_on_sale": is_on_sale,
        })
    return results


async def get_deals_by_steam_appid(steam_appid: str) -> List[Dict[str, Any]]:
    """Look up deals for a game by Steam appid via CheapShark."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{CHEAPSHARK_BASE}/games",
                params={"steamAppID": steam_appid},
            )
            resp.raise_for_status()
            games = resp.json()
        except Exception:
            return []

    if not games:
        return []

    game_id = games[0].get("gameID")
    if not game_id:
        return []

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{CHEAPSHARK_BASE}/games",
                params={"id": game_id},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []

    results = []
    for deal in data.get("deals", []):
        store_id = deal.get("storeID", "0")
        store_name = STORE_NAMES.get(store_id, f"Store #{store_id}")
        regular = float(deal.get("retailPrice", 0))
        sale = float(deal.get("price", 0))
        discount_pct = round((1 - sale / regular) * 100) if regular > 0 else 0
        is_on_sale = discount_pct > 0

        results.append({
            "store_name": store_name,
            "store_id": f"cheapshark_{store_id}",
            "regular_price": regular,
            "sale_price": sale if is_on_sale else None,
            "discount_percent": discount_pct,
            "currency": "USD",
            "url": f"https://www.cheapshark.com/redirect?dealID={deal.get('dealID', '')}",
            "is_on_sale": is_on_sale,
        })
    return results
