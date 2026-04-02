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
    import time

    cache_key = f"cs_browse:{page}:{limit}:{min_price}:{max_price}:{min_discount}:{sort_by}:{store_id or ''}"
    cached = _cache.get(cache_key, ttl=300)
    if cached is not None:
        return cached

    # Global cooldown after upstream 429s to avoid hammering CheapShark.
    # While this marker is active, skip live calls and rely on stale fallback.
    cheapshark_cooldown = _cache.get("cheapshark_429_cooldown", ttl=90)

    # Vercel function/runtime hard timeout is ~30s; keep a buffer.
    time_limit_s = 25.0
    start_time = time.monotonic()

    # Always target requested page size (default 60).
    effective_limit = limit

    # CheapShark has max 60 per page, so we need to fetch multiple pages
    # Dynamically adjust pages based on discount filter - higher discount needs more pages
    # Low discount (0-25%): 5 pages = 300 deals
    # Medium discount (25-50%): 8 pages = 480 deals
    # High discount (50-70%): 12 pages = 720 deals
    # Very high discount (70-85%): 25 pages = 1500 deals
    # Extreme discount (85-100%): 40 pages = 2400 deals (for rare high discounts)
    if min_discount >= 85:
        pages_to_fetch = 8
    elif min_discount >= 70:
        pages_to_fetch = 6
    elif min_discount >= 50:
        pages_to_fetch = 4
    elif min_discount >= 25:
        pages_to_fetch = 3
    else:
        pages_to_fetch = 2

    all_deals = []
    saw_429 = False

    # NOTE: For high discount filters we fetch many CheapShark pages.
    # Doing that fully in parallel can trigger timeouts / rate limiting and yield 0 results.
    # Use bounded concurrency with a shared client for stability.
    concurrency = 2 if pages_to_fetch >= 12 else 4
    semaphore = asyncio.Semaphore(concurrency)

    async def fetch_page(client: httpx.AsyncClient, page_num: int):
        nonlocal saw_429
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

        async with semaphore:
            backoff_s = 0.5
            for attempt in range(3):
                try:
                    resp = await client.get(f"{CHEAPSHARK_BASE}/deals", params=params)
                    resp.raise_for_status()
                    return resp.json()
                except httpx.HTTPStatusError as e:
                    status = e.response.status_code if e.response is not None else None
                    if status == 429:
                        saw_429 = True
                        retry_after = None
                        try:
                            retry_after = float(e.response.headers.get("Retry-After", ""))  # type: ignore[arg-type]
                        except Exception:
                            retry_after = None
                        # Cap sleep so we don't exceed overall request time budget.
                        sleep_s = retry_after if retry_after is not None else backoff_s
                        sleep_s = min(sleep_s, 2.5)
                        if time.monotonic() - start_time > (time_limit_s - 1.0):
                            return []
                        await asyncio.sleep(sleep_s)
                        backoff_s = min(backoff_s * 2, 2.5)
                        continue
                    return []
                except Exception:
                    return []
            return []

    fetched_pages = 0
    # Fetch pages incrementally. This reduces burstiness and helps avoid 429s.
    if not cheapshark_cooldown:
        async with httpx.AsyncClient(timeout=12) as client:
            base_page = page * pages_to_fetch
            batch_size = min(concurrency, 5)
            while fetched_pages < pages_to_fetch:
                if time.monotonic() - start_time > (time_limit_s - 1.0):
                    break

                take = min(batch_size, pages_to_fetch - fetched_pages)
                tasks = [
                    fetch_page(client, base_page + fetched_pages + i)
                    for i in range(take)
                ]
                pages_data = await asyncio.gather(*tasks)

                for deals in pages_data:
                    if deals:
                        all_deals.extend(deals)

                fetched_pages += take

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
            if sale < 0.1:
                continue
        elif min_discount < 75:
            # Medium discount search: allow cheaper games
            if sale < 0.25:
                continue
        # For 75%+ discount: no price filter (high discount deals can be very cheap)

        # With max min_discount capped at 90, hide free games from browse filters.
        if sale == 0 and min_discount < 90:
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

        # Apply minimum discount filter - use user's exact requirement
        if savings < min_discount:
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

    if saw_429:
        _cache.set("cheapshark_429_cooldown", True)

    # If CheapShark is rate-limiting (or cooling down), use stale fallback to fill missing items.
    if saw_429 or cheapshark_cooldown:
        is_default_browse = (
            min_discount == 0
            and min_price <= 0
            and max_price >= 999
            and not store_id
        )
        # Prefer a broad "default browse" cache to avoid tiny/random fallback sets.
        if is_default_browse:
            fallback_items = _cache.get("cs_browse_default_items", ttl=6 * 3600) or []
        else:
            fallback_items = _cache.get("cs_browse_last_success_items", ttl=6 * 3600) or []
        if fallback_items:
            filtered_fallback = []
            for item in fallback_items:
                sale = float(item.get("sale_price") or 0)
                regular = float(item.get("regular_price") or 0)
                discount = float(item.get("discount_percent") or 0)
                if sale < min_price or sale > max_price:
                    continue
                if discount < min_discount:
                    continue
                if sale == 0 and min_discount < 90:
                    continue
                if regular > 200:
                    continue
                filtered_fallback.append(item)

            if sort_by == "Price":
                filtered_fallback.sort(key=lambda x: x.get("sale_price", 999999))
            elif sort_by == "Savings":
                filtered_fallback.sort(key=lambda x: x.get("discount_percent", 0), reverse=True)
            elif sort_by == "Title":
                filtered_fallback.sort(key=lambda x: str(x.get("name", "")).lower())
            elif sort_by in {"Metacritic", "Reviews"}:
                # Not available in this data; keep default quality order.
                filtered_fallback.sort(key=lambda x: x.get("deal_rating", 0), reverse=True)
            else:
                filtered_fallback.sort(key=lambda x: x.get("deal_rating", 0), reverse=True)

            # Top up live results with fallback results without breaking active filters.
            if len(results) < effective_limit:
                seen = {str(r.get("steam_appid")) for r in results}
                for item in filtered_fallback:
                    appid = str(item.get("steam_appid"))
                    if appid in seen:
                        continue
                    results.append(item)
                    seen.add(appid)
                    if len(results) >= effective_limit:
                        break

            # If live had nothing, still return fallback.
            if not results:
                result = {
                    "items": filtered_fallback[:effective_limit],
                    "has_more": False,
                    "total_fetched": len(filtered_fallback)
                }
                _cache.set(cache_key, result)
                return result

    # Return paginated results with has_more indicator
    # Check if we got full pages from CheapShark (means there's likely more)
    has_more = (
        fetched_pages >= pages_to_fetch
        and len(all_deals) >= (pages_to_fetch * 60 * 0.9)  # 90% of expected
    )

    result = {
        "items": results[:effective_limit],
        "has_more": has_more,
        "total_fetched": len(results)
    }
    if results:
        _cache.set("cs_browse_last_success_items", results[:400])
        if min_discount == 0 and min_price <= 0 and max_price >= 999 and not store_id:
            _cache.set("cs_browse_default_items", results[:400])
    _cache.set(cache_key, result)
    return result


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
