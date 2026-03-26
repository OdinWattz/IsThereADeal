"""
Key-reseller service – fetches prices from Eneba, G2A, Kinguin, AllKeyShop
using their public / affiliate APIs or web scraping as fallback.

NOTE: These sites have varying ToS regarding scraping.
      Replace with official affiliate/API keys when available.
"""
import httpx
from typing import List, Dict, Any
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0 Safari/537.36"
    )
}


async def get_allkeyshop_prices(game_name: str) -> List[Dict[str, Any]]:
    """
    AllKeyShop has a public comparison API endpoint.
    Returns prices from hundreds of key resellers.
    """
    search_url = "https://www.allkeyshop.com/blog/wp-admin/admin-ajax.php"
    params = {
        "action": "get_offers_v2",
        "currency": "usd",
        "search": game_name,
    }
    results = []

    async with httpx.AsyncClient(timeout=8, headers=HEADERS) as client:
        try:
            resp = await client.get(search_url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return results

    offers = data.get("offers", [])
    for offer in offers[:15]:  # limit to top 15
        merchant = offer.get("merchant", {})
        price_info = offer.get("price", {})
        price_usd = price_info.get("eur", price_info.get("usd", 0))
        results.append({
            "store_name": merchant.get("name", "Unknown"),
            "store_id": f"aks_{merchant.get('id', '')}",
            "regular_price": None,
            "sale_price": float(price_usd) if price_usd else None,
            "discount_percent": 0,
            "currency": "USD",
            "url": offer.get("affiliateUrl", offer.get("url", "")),
            "is_on_sale": False,
            "is_key_reseller": True,
        })

    return results


async def get_eneba_prices(game_name: str) -> List[Dict[str, Any]]:
    """
    Eneba public GraphQL API.
    """
    url = "https://www.eneba.com/graphql/"
    query = """
    query SearchProducts($text: String!) {
      products(text: $text, first: 5) {
        edges {
          node {
            name
            slug
            auctions {
              price { amount currency }
              merchantName
              url
            }
          }
        }
      }
    }
    """
    results = []
    async with httpx.AsyncClient(timeout=6, headers=HEADERS) as client:
        try:
            resp = await client.post(
                url,
                json={"query": query, "variables": {"text": game_name}},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return results

    edges = data.get("data", {}).get("products", {}).get("edges", [])
    for edge in edges[:5]:
        node = edge.get("node", {})
        for auction in node.get("auctions", [])[:3]:
            price = auction.get("price", {})
            amount = price.get("amount", 0)
            if amount:
                amount = amount / 100  # Eneba returns cents
            results.append({
                "store_name": f"Eneba – {auction.get('merchantName', 'Seller')}",
                "store_id": "eneba",
                "regular_price": None,
                "sale_price": float(amount) if amount else None,
                "discount_percent": 0,
                "currency": price.get("currency", "EUR"),
                "url": f"https://www.eneba.com/store/{node.get('slug', '')}",
                "is_on_sale": False,
                "is_key_reseller": True,
            })

    return results


async def get_g2a_prices(game_name: str) -> List[Dict[str, Any]]:
    """
    G2A public search API.
    """
    url = "https://www.g2a.com/search/api/v2/products"
    params = {"query": game_name, "itemsPerPage": 5, "currency": "USD"}
    results = []

    async with httpx.AsyncClient(timeout=6, headers=HEADERS) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return results

    for product in data.get("products", [])[:5]:
        price = product.get("minPrice", 0)
        results.append({
            "store_name": "G2A",
            "store_id": "g2a",
            "regular_price": None,
            "sale_price": float(price) if price else None,
            "discount_percent": 0,
            "currency": "USD",
            "url": f"https://www.g2a.com{product.get('url', '')}",
            "is_on_sale": False,
            "is_key_reseller": True,
        })

    return results


async def get_all_key_reseller_prices(game_name: str) -> List[Dict[str, Any]]:
    """Aggregate prices from all key resellers."""
    import asyncio
    tasks = [
        get_allkeyshop_prices(game_name),
        get_g2a_prices(game_name),
    ]
    results_nested = await asyncio.gather(*tasks, return_exceptions=True)
    combined = []
    for res in results_nested:
        if isinstance(res, list):
            combined.extend(res)
    return combined
