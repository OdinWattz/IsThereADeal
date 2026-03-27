"""
CheapShark API service – free, no key needed.
Covers: Steam, Humble, GOG, GamersGate, GreenManGaming, Fanatical, etc.
Docs: https://apidocs.cheapshark.com/
"""
import httpx
from typing import List, Dict, Any, Optional
from app.services import cache as _cache

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
    async with httpx.AsyncClient(timeout=6) as client:
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


async def get_trending_deals(page: int = 0, limit: int = 20, apply_quality_filter: bool = True) -> List[Dict[str, Any]]:
    """
    Get quality deals sorted by CheapShark DealRating, filtered and randomized.
    Fetches more deals than needed, applies quality filters, then randomizes.

    Args:
        page: Page number
        limit: Results per page
        apply_quality_filter: If True, filters shovelware/adult. If False, shows everything.
    """
    import random

    # Fetch more deals for better randomization (3x requested)
    fetch_size = max(limit * 3, 60) if apply_quality_filter else limit

    params = {
        "sortBy": "DealRating",
        "onSale": 1,
        "upperPrice": 60,
        "pageNumber": page,
        "pageSize": fetch_size,
    }

    # Only apply minimum price on homepage/deals page
    if apply_quality_filter:
        params["lowerPrice"] = 2

    async with httpx.AsyncClient(timeout=6) as client:
        try:
            resp = await client.get(f"{CHEAPSHARK_BASE}/deals", params=params)
            resp.raise_for_status()
            deals = resp.json()
        except Exception:
            return []

    # Deduplicate and process results (keep best price per game)
    game_dict = {}

    for deal in deals:
        steam_appid = str(deal.get("steamAppID") or "").strip()
        if not steam_appid or steam_appid.lower() == "none":
            continue

        name = deal.get("title", "")
        store_id = str(deal.get("storeID", ""))
        sale = float(deal.get("salePrice") or 0)
        normal = float(deal.get("normalPrice") or 0)
        savings = float(deal.get("savings") or 0)

        # Only apply quality filters when requested (homepage/deals page)
        if apply_quality_filter:
            if sale < 2.0:  # Skip very cheap games
                continue
            if savings < 15:  # Skip small discounts (<15%)
                continue
            if normal > 150:  # Skip overpriced editions
                continue

            # Filter out adult/shovelware keywords
            name_lower = name.lower()
            skip_keywords = [
                'hentai', 'anime girl', 'waifu', 'ecchi', 'adult only',
                'sexual', 'erotic', '+18', 'nsfw', 'nude', 'sex',
                'soundtrack', 'artbook', 'wallpaper', 'OST'
            ]
            if any(kw in name_lower for kw in skip_keywords):
                continue

        # Deduplicate: only keep the best price per game
        if steam_appid in game_dict:
            if sale < game_dict[steam_appid]["sale_price"]:
                game_dict[steam_appid] = {
                    "steam_appid": steam_appid,
                    "name": name,
                    "sale_price": round(sale, 2),
                    "regular_price": round(normal, 2),
                    "discount_percent": min(round(savings), 100),
                    "store_name": STORE_NAMES.get(store_id, f"Store #{store_id}"),
                    "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{steam_appid}/header.jpg",
                    "deal_rating": float(deal.get("dealRating") or 0),
                }
        else:
            game_dict[steam_appid] = {
                "steam_appid": steam_appid,
                "name": name,
                "sale_price": round(sale, 2),
                "regular_price": round(normal, 2),
                "discount_percent": min(round(savings), 100),
                "store_name": STORE_NAMES.get(store_id, f"Store #{store_id}"),
                "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{steam_appid}/header.jpg",
                "deal_rating": float(deal.get("dealRating") or 0),
            }

    # Convert to list
    results = list(game_dict.values())

    # Randomize before limiting (only on homepage/deals)
    if apply_quality_filter:
        random.shuffle(results)

    return results[:limit]


async def get_free_games(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Get currently free games (price = 0).
    Returns games that are free to play or temporarily free.
    """
    cache_key = "free_games"
    cached = _cache.get(cache_key, ttl=3600)  # Cache for 1 hour
    if cached:
        return cached[:limit]

    params = {
        "sortBy": "DealRating",
        "upperPrice": 0,  # Only free games
        "pageSize": 100,  # Fetch more to filter and deduplicate
    }

    async with httpx.AsyncClient(timeout=8) as client:
        try:
            resp = await client.get(f"{CHEAPSHARK_BASE}/deals", params=params)
            resp.raise_for_status()
            deals = resp.json()
        except Exception:
            return []

    # Deduplicate by steam_appid
    game_dict = {}

    for deal in deals:
        steam_appid = str(deal.get("steamAppID") or "").strip()
        if not steam_appid or steam_appid.lower() == "none":
            continue

        name = deal.get("title", "")
        store_id = str(deal.get("storeID", ""))

        # Filter out DLC, soundtracks, and other non-game content
        name_lower = name.lower()
        skip_keywords = [
            'soundtrack', 'artbook', 'wallpaper', 'ost', ' dlc',
            'expansion pack', 'season pass', 'cosmetic'
        ]
        if any(kw in name_lower for kw in skip_keywords):
            continue

        # Only keep one entry per game (first one found, which has best deal rating)
        if steam_appid not in game_dict:
            game_dict[steam_appid] = {
                "steam_appid": steam_appid,
                "name": name,
                "store_name": STORE_NAMES.get(store_id, f"Store #{store_id}"),
                "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{steam_appid}/header.jpg",
                "deal_rating": float(deal.get("dealRating") or 0),
                "url": f"https://www.cheapshark.com/redirect?dealID={deal.get('dealID', '')}",
            }

    results = list(game_dict.values())

    # Sort by deal rating (highest first)
    results.sort(key=lambda x: x["deal_rating"], reverse=True)

    _cache.set(cache_key, results)
    return results[:limit]


async def browse_all_deals(
    page: int = 0,
    limit: int = 60,
    min_price: float = 0,
    max_price: float = 999,
    min_discount: int = 0,
    sort_by: str = "DealRating",
    store_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Browse all deals with custom filters and quality filtering.
    Filters out shovelware, adult content, and low-quality deals.
    Returns dict with 'items' and 'has_more' for pagination.

    Args:
        page: Page number
        limit: Results per page (we'll fetch multiple CheapShark pages if needed)
        min_price: Minimum price filter
        max_price: Maximum price filter
        min_discount: Minimum discount percentage (0-100)
        sort_by: Sort method (DealRating, Price, Savings, Recent, etc.)
        store_id: Filter by specific store ID
    """
    import asyncio

    # CheapShark has max 60 per page, so we need to fetch multiple pages
    # Dynamically adjust pages based on discount filter - higher discount needs more pages
    # Low discount (0-25%): 5 pages = 300 deals
    # Medium discount (25-50%): 8 pages = 480 deals
    # High discount (50-70%): 12 pages = 720 deals
    # Very high discount (70-85%): 25 pages = 1500 deals
    # Extreme discount (85-100%): 40 pages = 2400 deals (for rare high discounts)
    if min_discount >= 85:
        pages_to_fetch = 40
    elif min_discount >= 70:
        pages_to_fetch = 25
    elif min_discount >= 50:
        pages_to_fetch = 12
    elif min_discount >= 25:
        pages_to_fetch = 8
    else:
        pages_to_fetch = 5

    all_deals = []

    async def fetch_page(page_num: int):
        params = {
            "sortBy": sort_by,
            "onSale": 1,
            "lowerPrice": min_price,
            "upperPrice": max_price,
            "pageNumber": page_num,
            "pageSize": 60,
        }
        if store_id:
            params["storeID"] = store_id

        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(f"{CHEAPSHARK_BASE}/deals", params=params)
                resp.raise_for_status()
                return resp.json()
            except Exception:
                return []

    # Fetch multiple pages in parallel
    tasks = [fetch_page(page * pages_to_fetch + i) for i in range(pages_to_fetch)]
    pages_data = await asyncio.gather(*tasks)

    # Combine all pages
    for deals in pages_data:
        if deals:
            all_deals.extend(deals)

    # Process and deduplicate results (keep best price per game)
    game_dict = {}  # steam_appid -> best deal

    for deal in all_deals:
        steam_appid = str(deal.get("steamAppID") or "").strip()
        if not steam_appid or steam_appid.lower() == "none":
            continue

        name = deal.get("title", "")
        store_id_result = str(deal.get("storeID", ""))
        sale = float(deal.get("salePrice") or 0)
        normal = float(deal.get("normalPrice") or 0)
        savings = float(deal.get("savings") or 0)

        # Quality filters to remove shovelware/junk games
        # For high discount searches, allow cheaper games (they're discounted heavily)
        if min_discount < 50:
            # Low discount search: skip very cheap games (likely broken/removed)
            if sale < 0.5:
                continue
        elif min_discount < 75:
            # Medium discount search: allow cheaper games
            if sale < 0.25:
                continue
        # For 75%+ discount: no price filter (high discount deals can be very cheap)

        # Only show free games if user wants 100% discount (changed from 95% to 100%)
        if sale == 0 and min_discount < 100:
            continue

        if normal > 200:  # Skip overpriced special editions
            continue

        # Filter out adult/shovelware keywords
        name_lower = name.lower()
        skip_keywords = [
            'hentai', 'anime girl', 'waifu', 'ecchi', 'adult only',
            'sexual', 'erotic', '+18', 'nsfw', 'nude', 'sex',
            'soundtrack', 'artbook', 'wallpaper', 'OST', 'anime schoolgirl',
            'dating sim', 'visual novel bundle'
        ]
        if any(kw in name_lower for kw in skip_keywords):
            continue

        # Apply minimum discount filter
        # Use either user-specified min_discount OR default 5% (whichever is higher)
        effective_min_discount = max(min_discount, 5)
        if savings < effective_min_discount:
            continue

        # Deduplicate: only keep the best price per game
        if steam_appid in game_dict:
            # Keep the deal with the lowest price
            if sale < game_dict[steam_appid]["sale_price"]:
                game_dict[steam_appid] = {
                    "steam_appid": steam_appid,
                    "name": name,
                    "sale_price": round(sale, 2),
                    "regular_price": round(normal, 2),
                    "discount_percent": min(round(savings), 100),
                    "store_name": STORE_NAMES.get(store_id_result, f"Store #{store_id_result}"),
                    "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{steam_appid}/header.jpg",
                    "deal_rating": float(deal.get("dealRating") or 0),
                }
        else:
            game_dict[steam_appid] = {
                "steam_appid": steam_appid,
                "name": name,
                "sale_price": round(sale, 2),
                "regular_price": round(normal, 2),
                "discount_percent": min(round(savings), 100),
                "store_name": STORE_NAMES.get(store_id_result, f"Store #{store_id_result}"),
                "header_image": f"https://cdn.cloudflare.steamstatic.com/steam/apps/{steam_appid}/header.jpg",
                "deal_rating": float(deal.get("dealRating") or 0),
            }

    # Convert to list and sort by deal rating (best deals first)
    results = list(game_dict.values())
    results.sort(key=lambda x: x["deal_rating"], reverse=True)

    # Return paginated results with has_more indicator
    # Check if we got full pages from CheapShark (means there's likely more)
    has_more = len(all_deals) >= (pages_to_fetch * 60 * 0.9)  # 90% of expected

    # For high discount filters, return more results (since there are fewer matches)
    if min_discount >= 85:
        effective_limit = min(limit * 4, 240)  # 85%+: show up to 240 results
    elif min_discount >= 70:
        effective_limit = min(limit * 3, 180)  # 70%+: show up to 180 results
    elif min_discount >= 50:
        effective_limit = min(limit * 2, 120)  # 50%+: show up to 120 results
    else:
        effective_limit = limit  # Default 60 results

    return {
        "items": results[:effective_limit],
        "has_more": has_more,
        "total_fetched": len(results)
    }


async def get_deals_by_steam_appid(steam_appid: str) -> List[Dict[str, Any]]:
    """Look up deals for a game by Steam appid via CheapShark.

    Uses caching to reduce API calls: the steam_appid -> gameID mapping
    is cached for 24 hours, eliminating the first lookup on repeat requests.
    """
    # Check cache for steam_appid -> gameID mapping (24 hours)
    cache_key = f"cheapshark_id:{steam_appid}"
    game_id = _cache.get(cache_key, ttl=86400)  # 24 hours

    if not game_id:
        # First API call: lookup gameID by steam_appid
        async with httpx.AsyncClient(timeout=6) as client:
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

        # Cache the mapping for future requests
        _cache.set(cache_key, game_id)

    # Second API call: get deals using gameID (always needed, but faster if cached)
    async with httpx.AsyncClient(timeout=6) as client:
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
