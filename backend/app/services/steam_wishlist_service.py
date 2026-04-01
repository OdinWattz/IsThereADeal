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
    # Try multiple URL formats - Steam has different endpoints
    urls = [
        f"https://store.steampowered.com/wishlist/profiles/{steam_id}/wishlistdata/?p=0",
        f"https://store.steampowered.com/wishlist/profiles/{steam_id}/wishlistdata/",
    ]

    async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
        # Try each URL format
        for url in urls:
            try:
                # Add Steam age verification cookie to bypass age gates
                resp = await client.get(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://store.steampowered.com/',
                }, cookies={
                    'birthtime': '0',
                    'lastagecheckage': '1-0-1990',
                    'wants_mature_content': '1',
                })

                print(f"[Steam Wishlist] Status: {resp.status_code}, URL: {url}")
                print(f"[Steam Wishlist] Response length: {len(resp.text)}")

                # Check for redirects (302 = private)
                if resp.status_code == 302:
                    print(f"[Steam Wishlist] 302 Redirect - Wishlist is private or inaccessible")
                    continue

                if resp.status_code == 403:
                    print(f"[Steam Wishlist] 403 Forbidden - Profile or wishlist is private")
                    continue

                if resp.status_code == 404:
                    print(f"[Steam Wishlist] 404 Not Found - Invalid Steam ID")
                    continue

                if resp.status_code != 200:
                    print(f"[Steam Wishlist] Unexpected status: {resp.status_code}")
                    continue

                print(f"[Steam Wishlist] Response preview: {resp.text[:200]}")

                # Check if response is valid JSON
                if not resp.text or resp.text.strip() == "[]" or resp.text.strip() == "{}":
                    print(f"[Steam Wishlist] Empty response")
                    return []

                # Try to parse JSON
                try:
                    data = resp.json()
                except Exception as json_err:
                    print(f"[Steam Wishlist] Failed to parse JSON: {json_err}")
                    print(f"[Steam Wishlist] Response: {resp.text[:500]}")
                    continue

                # Wishlist data is a dict with app IDs as keys
                if isinstance(data, dict) and len(data) > 0:
                    app_ids = list(data.keys())
                    print(f"[Steam Wishlist] ✓ Found {len(app_ids)} games: {app_ids[:10]}")
                    return app_ids

            except Exception as e:
                print(f"[Steam Wishlist] Error with {url}: {type(e).__name__}: {e}")
                continue

        # If we get here, all methods failed
        print(f"[Steam Wishlist] All fetch methods failed")
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
    print(f"[Import] Fetching wishlist for Steam ID: {steam_id}")
    app_ids = await fetch_steam_wishlist(steam_id)

    if not app_ids:
        print(f"[Import] No games found in wishlist for Steam ID: {steam_id}")
        return {
            "success": False,
            "steam_id": steam_id,
            "error": f"Kon geen games vinden in je Steam wishlist (Steam ID: {steam_id}).\n\n"
                     f"CONTROLEER DEZE 3 PRIVACY INSTELLINGEN:\n\n"
                     f"1. Profiel Privacy → steamcommunity.com/my/edit/settings\n"
                     f"   • My profile: Public\n"
                     f"   • Game details: Public\n\n"
                     f"2. Game Details Privacy → steamcommunity.com/my/edit/settings\n"
                     f"   • My game details: Public\n\n"
                     f"3. Wishlist Privacy → In je profiel settings\n"
                     f"   • Wishlist must be visible\n\n"
                     f"LET OP: Na het wijzigen van instellingen kan het 5-10 minuten duren voordat Steam de wijzigingen doorvoert!\n\n"
                     f"Test of je wishlist publiek is: open https://steamcommunity.com/profiles/{steam_id}/wishlist/ in een incognito venster."
        }

    print(f"[Import] Successfully found {len(app_ids)} games in wishlist")
    return {
        "success": True,
        "steam_id": steam_id,
        "app_ids": app_ids,
        "count": len(app_ids)
    }
