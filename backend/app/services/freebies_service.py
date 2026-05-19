"""
Freebies service – tracks games that are temporarily free on Epic Games Store, Prime Gaming, etc.
"""
import httpx
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.services import cache as _cache

_FREEBIES_TTL = 3600  # 1 hour – Epic updates every Thursday/Friday

FREEBIE_SOURCES = {
    "epic": {
        "name": "Epic Games Store",
        "icon": "⚡",
        "url_base": "https://www.epicgames.com/store/en-US/free-games",
    },
    "prime": {
        "name": "Prime Gaming",
        "icon": "👑",
        "url_base": "https://gaming.amazon.com/",
    },
    "steam": {
        "name": "Steam",
        "icon": "🎮",
        "url_base": "https://store.steampowered.com/search",
    },
}


async def get_epic_free_games() -> List[Dict[str, Any]]:
    """
    Fetch current free games from Epic Games Store API.
    Epic updates free games every Thursday/Friday.
    """
    cache_key = "freebies:epic"
    cached = _cache.get(cache_key, ttl=_FREEBIES_TTL)
    if cached is not None:
        return cached
    
    try:
        # Epic Games graphQL API for free games
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://www.epicgames.com/graphql",
                json={
                    "query": """
                    {
                        Catalog {
                            searchStore(first: 100, filter: "category:games/Edition:base",
                                         sort: "releaseDate", sortDirection: DESC) {
                                elements {
                                    title
                                    id
                                    keyImages {
                                        type
                                        url
                                    }
                                    currentPrice
                                    originalPrice
                                }
                            }
                        }
                    }
                    """
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            if not data.get("data"):
                return []
            
            elements = data["data"].get("Catalog", {}).get("searchStore", {}).get("elements", [])
            
            free_games = []
            for game in elements:
                current = game.get("currentPrice", 0)
                original = game.get("originalPrice", 0)
                
                # Free if current price is 0 and original > 0
                if current == 0 and original > 0:
                    images = game.get("keyImages", [])
                    thumbnail = next(
                        (img["url"] for img in images if img.get("type") == "Thumbnail"),
                        None
                    )
                    
                    free_games.append({
                        "title": game.get("title"),
                        "epic_id": game.get("id"),
                        "thumbnail": thumbnail,
                        "original_price": original / 100,  # Epic returns prices in cents
                        "source": "epic",
                        "url": f"https://www.epicgames.com/store/en-US/p/{game.get('id')}",
                    })
            
            _cache.set(cache_key, free_games)
            print(f"[Freebies] Found {len(free_games)} free games on Epic")
            return free_games
    
    except Exception as e:
        print(f"[Freebies] Failed to fetch Epic free games: {e}")
        return []


async def get_prime_gaming_freebies() -> List[Dict[str, Any]]:
    """
    Fetch current free games from Prime Gaming.
    Note: Prime Gaming requires authentication or scraping; here we return mock data.
    In production, use AWS SDK or Prime Gaming RSS feed.
    """
    cache_key = "freebies:prime"
    cached = _cache.get(cache_key, ttl=_FREEBIES_TTL)
    if cached is not None:
        return cached
    
    try:
        # Prime Gaming updates usually on the 1st of each month
        # For MVP, we'll skip detailed scraping and note that this requires auth
        # In production: use AWS GamesOnDemand API or RSS feed
        print("[Freebies] Prime Gaming requires authentication - implement AWS integration")
        return []
    
    except Exception as e:
        print(f"[Freebies] Failed to fetch Prime Gaming freebies: {e}")
        return []


async def check_if_game_is_free(steam_appid: str, game_name: str) -> Optional[Dict[str, Any]]:
    """
    Check if a specific game is currently free on any platform.
    Returns freebie info if found, None otherwise.
    """
    cache_key = f"freebies:check:{steam_appid}"
    cached = _cache.get(cache_key, ttl=_FREEBIES_TTL)
    if cached is not None:
        return None if cached == "__not_free__" else cached
    
    # Get all current freebies
    epic_free = await get_epic_free_games()
    prime_free = await get_prime_gaming_freebies()
    all_free = epic_free + prime_free
    
    # Try to match by game name (fuzzy matching)
    for freebie in all_free:
        if game_name.lower() in freebie["title"].lower() or freebie["title"].lower() in game_name.lower():
            _cache.set(cache_key, freebie)
            print(f"[Freebies] Found {game_name} free on {freebie['source']}")
            return freebie
    
    # Not found
    _cache.set(cache_key, "__not_free__")
    return None


async def get_all_current_freebies() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all current freebies from all sources.
    
    Returns: {
        "epic": [{"title": "Game Name", "original_price": 29.99, ...}],
        "prime": [...],
    }
    """
    result = {
        "epic": await get_epic_free_games(),
        "prime": await get_prime_gaming_freebies(),
    }
    return result
