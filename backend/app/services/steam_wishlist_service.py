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

    Note: This API endpoint works without authentication.
    """
    api_url = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/"
    params = {
        "vanityurl": vanity_url,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(api_url, params=params)
            resp.raise_for_status()
            data = resp.json()

            print(f"[Steam Vanity] Resolved '{vanity_url}' -> Success: {data.get('response', {}).get('success')}")

            if data.get("response", {}).get("success") == 1:
                steam_id = data["response"]["steamid"]
                print(f"[Steam Vanity] Found Steam ID: {steam_id}")
                return steam_id
            else:
                print(f"[Steam Vanity] Failed to resolve: {data}")
        except Exception as e:
            print(f"[Steam Vanity] Error: {e}")
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

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })

            print(f"[Steam Wishlist] Status: {resp.status_code}, URL: {url}")
            print(f"[Steam Wishlist] Response length: {len(resp.text)}")

            if resp.status_code == 403:
                print(f"[Steam Wishlist] 403 Forbidden - Profile or wishlist is private")
                return []

            resp.raise_for_status()

            # Check if response is valid JSON
            if not resp.text or resp.text.strip() == "[]" or resp.text.strip() == "{}":
                print(f"[Steam Wishlist] Empty response - wishlist is empty or private")
                return []

            data = resp.json()

            # Wishlist data is a dict with app IDs as keys
            if isinstance(data, dict):
                app_ids = list(data.keys())
                print(f"[Steam Wishlist] Found {len(app_ids)} games")
                return app_ids
            else:
                print(f"[Steam Wishlist] Unexpected response format: {type(data)}")
                return []

        except httpx.HTTPStatusError as e:
            print(f"[Steam Wishlist] HTTP error {e.response.status_code}: {e}")
            return []
        except Exception as e:
            print(f"[Steam Wishlist] Failed to fetch: {type(e).__name__}: {e}")
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
            "error": "Kon wishlist niet ophalen. Mogelijke oorzaken: 1) Wishlist is leeg, 2) Wishlist privacy staat op Private/Friends Only (moet Public zijn), 3) Verkeerd Steam ID. Check je privacy instellingen: steamcommunity.com/my/edit/settings → Game Details → My wishlist → Public"
        }

    return {
        "success": True,
        "steam_id": steam_id,
        "app_ids": app_ids,
        "count": len(app_ids)
    }
