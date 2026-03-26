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
    params = {"appids": appid, "cc": "nl", "l": "en"}

    async with httpx.AsyncClient(timeout=8) as client:
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
            "currency": price_overview.get("currency", "EUR"),
            "url": f"https://store.steampowered.com/app/{appid}",
            "is_on_sale": is_on_sale,
        },
    }


async def search_steam_games(query: str):
    """Search for games using the Steam store search API."""
    url = "https://store.steampowered.com/api/storesearch/"
    params = {"term": query, "l": "english", "cc": "NL", "count": 50}

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
            "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{item['id']}/header.jpg",
        })
    return results


async def get_featured_deals():
    """Fetch featured / on-sale games from Steam, filtered and randomized."""
    import random

    url = f"{STEAM_STORE_BASE}/featuredcategories"
    params = {"cc": "nl", "l": "en"}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []

    seen_ids: set = set()
    results = []

    def _add_items(items, max_items=50):
        """Add items with quality filtering"""
        added = 0
        for item in items:
            if added >= max_items:
                break
            try:
                appid = str(item.get("id") or "")
                name = item.get("name") or ""
                if not appid or not name or appid in seen_ids:
                    continue

                discount_pct = item.get("discount_percent", 0) or 0
                final = (item.get("final_price") or 0) / 100
                original = (item.get("original_price") or 0) / 100

                # Quality filters to avoid shovelware and adult content
                if final > 0 and final < 2.0:  # Skip very cheap games (usually shovelware)
                    continue
                if discount_pct > 0 and discount_pct < 10:  # Skip tiny discounts
                    continue
                if original > 150:  # Skip overpriced bundles/editions
                    continue

                # Filter out common adult/shovelware keywords
                name_lower = name.lower()
                skip_keywords = [
                    'hentai', 'anime girl', 'waifu', 'ecchi', 'adult only',
                    'sexual', 'erotic', '+18', 'nsfw', 'nude', 'sex',
                    'soundtrack only', 'artbook', 'wallpaper'
                ]
                if any(kw in name_lower for kw in skip_keywords):
                    continue

                seen_ids.add(appid)
                results.append({
                    "steam_appid": appid,
                    "name": name,
                    "header_image": item.get("large_capsule_image") or item.get("header_image") or "",
                    "regular_price": original,
                    "sale_price": final if discount_pct > 0 else None,
                    "discount_percent": discount_pct,
                    "is_on_sale": discount_pct > 0,
                })
                added += 1
            except Exception:
                continue

    # Collect more games than needed for better randomization
    _add_items(data.get("specials", {}).get("items", []), max_items=50)
    _add_items(data.get("top_sellers", {}).get("items", []), max_items=30)
    _add_items(data.get("new_releases", {}).get("items", []), max_items=20)

    # Randomize and limit to 40 games for homepage
    random.shuffle(results)
    return results[:40]
