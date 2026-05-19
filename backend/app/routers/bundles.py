"""
Bundle checker endpoints – find if a game is included in current bundles.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from app.services.bundle_checker_service import (
    get_all_active_bundles,
    find_game_in_bundles,
    BUNDLE_SOURCES,
)

router = APIRouter(prefix="/api/bundles", tags=["bundles"])


@router.get("/current")
async def get_current_bundles() -> Dict[str, Any]:
    """
    Get all currently active game bundles.
    
    Returns: {
      "humble": [
        {
          "name": "Indie Mix Vol. 5",
          "price": 12.99,
          "short_url": "https://www.humblebundle.com/bundles/...",
          "games": [{"name": "Game Title"}, ...]
        }
      ],
      "fanatical": [...]
    }
    """
    try:
        return await get_all_active_bundles()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch bundles: {str(e)}")


@router.get("/game/{game_name}")
async def check_game_in_bundles(game_name: str) -> List[Dict[str, Any]]:
    """
    Check if a specific game is included in any currently active bundle.
    
    Example: GET /api/bundles/game/Hollow%20Knight
    
    Returns: [
      {
        "bundle_name": "Indie Mix Vol. 5",
        "bundle_source": "humble",
        "bundle_price": 12.99,
        "bundle_url": "https://www.humblebundle.com/...",
        "game_in_bundle": "Hollow Knight"
      }
    ] or [] if not in any bundle
    """
    try:
        return await find_game_in_bundles(game_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check bundles: {str(e)}")


@router.get("/sources")
async def get_bundle_sources() -> Dict[str, Dict[str, str]]:
    """
    Get list of supported bundle sources.
    """
    return BUNDLE_SOURCES
