"""
Steam Wishlist Import Service
Fetches a user's public Steam wishlist and imports games.
"""
import httpx
import re
from typing import List, Dict, Any, Optional


async def get_steam_id_from_vanity_url(vanity_url: str) -> Optional[str]:
    """
    Convert Steam vanity URL to Steam ID.
    Example: "gabelogannewell" -> "76561197960287930"
    """
    api_url = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/"
    params = {
        "vanityurl": vanity_url,
        "key": "YOUR_STEAM_API_KEY"  # Optional - works without key for vanity URL
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(api_url, params=params)
            resp.raise_for_status()
            data = resp.json()

            if data.get("response", {}).get("success") == 1:
                return data["response"]["steamid"]
        except Exception:
            pass

    return None


async def extract_steam_id_from_input(user_input: str) -> Optional[str]:
    """
    Extract Steam ID from various input formats:
    - Direct Steam ID: "76561197960287930"
    - Profile URL: "https://steamcommunity.com/profiles/76561197960287930"
    - Vanity URL: "https://steamcommunity.com/id/gabelogannewell"
    - Just vanity name: "gabelogannewell"
    """
    user_input = user_input.strip()

    # Direct Steam ID (17 digits)
    if re.match(r'^\d{17}$', user_input):
        return user_input

    # Profile URL with Steam ID
    profile_match = re.search(r'steamcommunity\.com/profiles/(\d{17})', user_input)
    if profile_match:
        return profile_match.group(1)

    # Vanity URL
    vanity_match = re.search(r'steamcommunity\.com/id/([^/]+)', user_input)
    if vanity_match:
        vanity_name = vanity_match.group(1)
        return await get_steam_id_from_vanity_url(vanity_name)

    # Assume it's just a vanity name
    return await get_steam_id_from_vanity_url(user_input)


async def fetch_steam_wishlist(steam_id: str) -> List[str]:
    """
    Fetch a user's public Steam wishlist.
    Returns list of app IDs.

    Note: Steam wishlist must be public for this to work.
    """
    url = f"https://store.steampowered.com/wishlist/profiles/{steam_id}/wishlistdata/"

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

            # Wishlist data is a dict with app IDs as keys
            app_ids = list(data.keys())
            return app_ids
        except Exception as e:
            print(f"[Steam Wishlist] Failed to fetch: {e}")
            return []


async def import_steam_wishlist(user_input: str) -> Dict[str, Any]:
    """
    Import a user's Steam wishlist.

    Args:
        user_input: Steam ID, profile URL, or vanity name

    Returns:
        {
            "success": bool,
            "steam_id": str,
            "app_ids": List[str],
            "count": int,
            "error": Optional[str]
        }
    """
    # Extract Steam ID from input
    steam_id = await extract_steam_id_from_input(user_input)

    if not steam_id:
        return {
            "success": False,
            "error": "Kon Steam ID niet vinden. Zorg dat je profiel publiek is."
        }

    # Fetch wishlist
    app_ids = await fetch_steam_wishlist(steam_id)

    if not app_ids:
        return {
            "success": False,
            "steam_id": steam_id,
            "error": "Kon wishlist niet ophalen. Zorg dat je wishlist publiek is in je Steam privacy instellingen."
        }

    return {
        "success": True,
        "steam_id": steam_id,
        "app_ids": app_ids,
        "count": len(app_ids)
    }
