"""
Key-reseller service.

G2A, Kinguin, Eneba and AllKeyShop all actively block server-side requests
(Cloudflare / changed APIs). Their prices are therefore surfaced as search
links in the frontend rather than fetched here.

This module is kept for future use if official affiliate API keys become
available.
"""
from typing import List, Dict, Any


async def get_all_key_reseller_prices(game_name: str) -> List[Dict[str, Any]]:  # noqa: ARG001
    """Returns empty list – grey-market sites block automated access."""
    return []



