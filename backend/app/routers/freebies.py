"""
Freebies endpoints – track games that are temporarily free on various platforms.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional

from app.services.freebies_service import (
    get_all_current_freebies,
    check_if_game_is_free,
    FREEBIE_SOURCES,
)

router = APIRouter(prefix="/api/freebies", tags=["freebies"])


@router.get("/current")
async def get_current_freebies() -> Dict[str, Any]:
    """
    Get all current free games from Epic Games Store, Prime Gaming, etc.
    
    Returns: {
      "epic": [
        {
          "title": "Dying Light 2",
          "original_price": 59.99,
          "thumbnail": "https://...",
          "source": "epic",
          "url": "https://www.epicgames.com/store/..."
        }
      ],
      "prime": [...]
    }
    """
    try:
        result = await get_all_current_freebies()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch freebies: {str(e)}")


@router.get("/game/{steam_appid}")
async def is_game_free(steam_appid: str, game_name: str) -> Optional[Dict[str, Any]]:
    """
    Check if a specific game is currently free on any platform.
    
    Example: GET /api/freebies/game/570040?game_name=Dying+Light+2
    
    Returns: {
      "title": "Dying Light 2",
      "source": "epic",
      "original_price": 59.99,
      ...
    } or null if not free
    """
    try:
        freebie = await check_if_game_is_free(steam_appid, game_name)
        return freebie
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check freebie status: {str(e)}")


@router.get("/sources")
async def get_freebie_sources() -> Dict[str, Dict[str, str]]:
    """
    Get list of supported freebie sources.
    
    Returns: {
      "epic": {"name": "Epic Games Store", "icon": "⚡", ...},
      "prime": {"name": "Prime Gaming", "icon": "👑", ...},
      ...
    }
    """
    return FREEBIE_SOURCES
