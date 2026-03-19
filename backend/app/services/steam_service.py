"""
Steam API service – fetches game details and current prices from the Steam store.
"""
import httpx
from typing import Optional, Dict, Any
from app.config import settings


STEAM_STORE_BASE = "https://store.steampowered.com/api"
STEAM_API_BASE = "https://api.steampowered.com"


async def get_steam_app_details(appid: str) -> Optional[Dict[str, Any]]:
    """Fetch game metadata and Steam price for a given Steam appid."""
    url = f"{STEAM_STORE_BASE}/appdetails"
    params = {"appids": appid, "cc": "us", "l": "en"}

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None

    app_data = data.get(str(appid), {})
    if not app_data.get("success"):
        return None

    info = app_data.get("data", {})

    # Build a normalised price dict
    price_overview = info.get("price_overview", {})
    regular_price = None
    sale_price = None
    discount_pct = 0
    is_on_sale = False

    if price_overview:
        regular_price = price_overview.get("initial", 0) / 100
        sale_price = price_overview.get("final", 0) / 100
        discount_pct = price_overview.get("discount_percent", 0)
        is_on_sale = discount_pct > 0
        if not is_on_sale:
            sale_price = None  # show None when not on sale so frontend shows regular

    genres_raw = info.get("genres", [])
    genres = ", ".join(g.get("description", "") for g in genres_raw)

    return {
        "name": info.get("name", ""),
        "header_image": info.get("header_image", ""),
        "short_description": info.get("short_description", ""),
        "genres": genres,
        "developers": ", ".join(info.get("developers", [])),
        "publishers": ", ".join(info.get("publishers", [])),
        "release_date": info.get("release_date", {}).get("date", ""),
        "steam_url": f"https://store.steampowered.com/app/{appid}",
        "price": {
            "store_name": "Steam",
            "store_id": "steam",
            "regular_price": regular_price,
            "sale_price": sale_price,
            "discount_percent": discount_pct,
            "currency": price_overview.get("currency", "USD"),
            "url": f"https://store.steampowered.com/app/{appid}",
            "is_on_sale": is_on_sale,
        },
    }


async def search_steam_games(query: str):
    """Search for games using the Steam store search API."""
    url = "https://store.steampowered.com/api/storesearch/"
    params = {"term": query, "l": "english", "cc": "US"}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []

    results = []
    for item in data.get("items", []):
        results.append({
            "steam_appid": str(item["id"]),
            "name": item["name"],
            "header_image": item.get("tiny_image", ""),
        })
    return results


async def get_featured_deals():
    """Fetch featured / on-sale games from Steam."""
    url = f"{STEAM_STORE_BASE}/featuredcategories"
    params = {"cc": "us", "l": "en"}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []

    specials = data.get("specials", {}).get("items", [])
    results = []
    for item in specials[:20]:
        discount_pct = item.get("discount_percent", 0)
        final = item.get("final_price", 0) / 100
        original = item.get("original_price", 0) / 100
        results.append({
            "steam_appid": str(item["id"]),
            "name": item["name"],
            "header_image": item.get("large_capsule_image", item.get("header_image", "")),
            "regular_price": original,
            "sale_price": final if discount_pct > 0 else None,
            "discount_percent": discount_pct,
            "is_on_sale": discount_pct > 0,
        })
    return results
