"""
Regional pricing service – fetches prices for different regions/currencies.
Supports: NL (EUR), US (USD), UK (GBP), DE (EUR), FR (EUR), etc.
"""
import asyncio
import httpx
from typing import Dict, List, Optional, Any
from app.services import cache as _cache
from app.services.itad_service import get_game_id_by_appid, _post

_REGIONAL_TTL = 1800  # 30 minutes

REGION_MAP = {
    "NL": {"name": "Netherlands", "currency": "EUR", "flag": "🇳🇱"},
    "US": {"name": "United States", "currency": "USD", "flag": "🇺🇸"},
    "GB": {"name": "United Kingdom", "currency": "GBP", "flag": "🇬🇧"},
    "DE": {"name": "Germany", "currency": "EUR", "flag": "🇩🇪"},
    "FR": {"name": "France", "currency": "EUR", "flag": "🇫🇷"},
    "ES": {"name": "Spain", "currency": "EUR", "flag": "🇪🇸"},
    "IT": {"name": "Italy", "currency": "EUR", "flag": "🇮🇹"},
    "CA": {"name": "Canada", "currency": "CAD", "flag": "🇨🇦"},
    "AU": {"name": "Australia", "currency": "AUD", "flag": "🇦🇺"},
    "BR": {"name": "Brazil", "currency": "BRL", "flag": "🇧🇷"},
}


async def get_prices_by_region(steam_appid: str, regions: List[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Fetch prices for a game across multiple regions from ITAD.
    
    Returns: {region_code: {"best_price": 9.99, "currency": "EUR", "stores": [...]}}
    """
    if regions is None:
        regions = ["NL", "US", "GB", "DE"]
    
    result = {}

    game_id = await get_game_id_by_appid(steam_appid)
    if not game_id:
        return result

    async def _fetch_one(region: str):
        cache_key = f"regional_prices:{steam_appid}:{region}"
        cached = _cache.get(cache_key, ttl=_REGIONAL_TTL)
        if cached is not None:
            return region, cached
        
        try:
            # ITAD v3 prices for specific region
            rows = await _post("/games/prices/v3", {
                "country": region,
            }, [game_id])
            
            if not rows or not isinstance(rows, list) or not rows[0].get("deals"):
                return region, None
            
            region_data = {
                "region": region,
                "currency": REGION_MAP.get(region, {}).get("currency", ""),
                "name": REGION_MAP.get(region, {}).get("name", region),
                "flag": REGION_MAP.get(region, {}).get("flag", ""),
                "best_price": None,
                "best_store": None,
                "stores": []
            }
            
            prices = []
            for deal in rows[0].get("deals", []):
                shop = deal.get("shop", {})
                price_info = deal.get("price", {})
                regular_info = deal.get("regular", {})
                
                current_price = price_info.get("amount")
                if current_price:
                    prices.append({
                        "store": shop.get("name", "Unknown"),
                        "price": current_price,
                        "regular": regular_info.get("amount"),
                        "discount": deal.get("cut", 0),
                        "currency": price_info.get("currency", ""),
                    })
            
            if prices:
                best = min(prices, key=lambda x: x["price"])
                region_data["best_price"] = best["price"]
                region_data["best_store"] = best["store"]
                region_data["stores"] = prices[:5]  # Top 5 stores
            
            _cache.set(cache_key, region_data)
            return region, region_data
            
        except Exception as e:
            print(f"[Regional Pricing] Failed for {steam_appid} in {region}: {e}")
            return region, None

    fetched = await asyncio.gather(*[_fetch_one(region) for region in regions], return_exceptions=True)
    for item in fetched:
        if isinstance(item, Exception):
            continue
        region, region_data = item
        if region_data is not None:
            result[region] = region_data
    
    return result


async def get_supported_regions() -> Dict[str, Dict[str, str]]:
    """Get list of supported regions for regional pricing."""
    return REGION_MAP
