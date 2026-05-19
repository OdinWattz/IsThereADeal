"""
Bundle checker service – finds if a game is included in current bundles.
Integrates with Humble Bundle, Fanatical, and other bundle platforms.
"""
import httpx
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.services import cache as _cache
import re

_BUNDLES_TTL = 3600  # 1 hour – bundle listings update regularly

BUNDLE_SOURCES = {
    "humble": {
        "name": "Humble Bundle",
        "icon": "🙏",
        "url_base": "https://www.humblebundle.com",
    },
    "fanatical": {
        "name": "Fanatical",
        "icon": "🔥",
        "url_base": "https://www.fanatical.com",
    },
    "groupees": {
        "name": "Groupees",
        "icon": "📦",
        "url_base": "https://www.groupees.com",
    },
}


async def get_humble_current_bundles() -> List[Dict[str, Any]]:
    """
    Fetch current active Humble Bundles.
    """
    cache_key = "bundles:humble"
    cached = _cache.get(cache_key, ttl=_BUNDLES_TTL)
    if cached is not None:
        return cached
    
    try:
        # Humble Bundle API endpoint for bundle data
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://www.humblebundle.com/api/v1/bundles",
                headers={"User-Agent": "GameDeals/1.0"},
            )
            resp.raise_for_status()
            data = resp.json()
            
            bundles = []
            for bundle in data.get("current", []):
                bundle_info = {
                    "name": bundle.get("name", ""),
                    "slug": bundle.get("slug", ""),
                    "bundle_id": bundle.get("bundle_id", ""),
                    "thumbnail": bundle.get("header_image", ""),
                    "description": bundle.get("description", ""),
                    "price": float(bundle.get("price", 0)),
                    "short_url": bundle.get("short_url", f"https://www.humblebundle.com/bundles/{bundle.get('slug')}"),
                    "source": "humble",
                    "games": [],
                    "expiry_date": bundle.get("expiry_date"),
                }
                
                # Fetch items in bundle
                for item in bundle.get("items", []):
                    bundle_info["games"].append({
                        "name": item.get("human_name", ""),
                        "machine_name": item.get("machine_name", ""),
                    })
                
                if bundle_info["games"]:  # Only include if has games
                    bundles.append(bundle_info)
            
            _cache.set(cache_key, bundles)
            print(f"[Bundles] Found {len(bundles)} Humble Bundles")
            return bundles
    
    except Exception as e:
        print(f"[Bundles] Failed to fetch Humble Bundles: {e}")
        return []


async def get_fanatical_current_bundles() -> List[Dict[str, Any]]:
    """
    Fetch current Fanatical bundles.
    Note: Fanatical may require web scraping; this is a placeholder.
    """
    cache_key = "bundles:fanatical"
    cached = _cache.get(cache_key, ttl=_BUNDLES_TTL)
    if cached is not None:
        return cached
    
    try:
        # Fanatical bundles endpoint (if available)
        # In production, may need to use RSS feed or web scraping
        print("[Bundles] Fanatical requires web scraping - implement as needed")
        return []
    
    except Exception as e:
        print(f"[Bundles] Failed to fetch Fanatical bundles: {e}")
        return []


async def find_game_in_bundles(game_name: str) -> List[Dict[str, Any]]:
    """
    Find all bundles that contain a specific game.
    Uses fuzzy matching on game titles.
    
    Returns: [
      {
        "bundle_name": "Indie Mix Bundle",
        "bundle_source": "humble",
        "bundle_price": 9.99,
        "bundle_url": "https://..."
      }
    ]
    """
    cache_key = f"bundles:contains:{game_name}"
    cached = _cache.get(cache_key, ttl=_BUNDLES_TTL)
    if cached is not None:
        return cached
    
    game_name_lower = game_name.lower()
    results = []
    
    # Get all bundles
    humble = await get_humble_current_bundles()
    fanatical = await get_fanatical_current_bundles()
    all_bundles = humble + fanatical
    
    for bundle in all_bundles:
        for game in bundle.get("games", []):
            bundle_game_name = game.get("name", "").lower() or game.get("machine_name", "").lower()
            
            # Fuzzy matching
            if (game_name_lower in bundle_game_name or
                bundle_game_name in game_name_lower or
                _levenshtein_distance(game_name_lower, bundle_game_name) < 3):
                
                results.append({
                    "bundle_name": bundle.get("name"),
                    "bundle_source": bundle.get("source"),
                    "bundle_price": bundle.get("price"),
                    "bundle_url": bundle.get("short_url"),
                    "expiry_date": bundle.get("expiry_date"),
                    "game_in_bundle": game.get("name") or game.get("machine_name"),
                })
                break  # Found in this bundle, move to next bundle
    
    _cache.set(cache_key, results)
    print(f"[Bundles] Found {game_name} in {len(results)} bundles")
    return results


async def get_all_active_bundles() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all currently active bundles from all sources.
    
    Returns: {
      "humble": [...],
      "fanatical": [...],
    }
    """
    result = {
        "humble": await get_humble_current_bundles(),
        "fanatical": await get_fanatical_current_bundles(),
    }
    return result


def _levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate Levenshtein distance between two strings for fuzzy matching.
    """
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            # insertions, deletions, or substitutions
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]
