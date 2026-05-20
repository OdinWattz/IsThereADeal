"""
Regional pricing endpoints – fetch prices for different regions/currencies.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional

from app.database import get_db
from app.services.regional_pricing_service import (
    get_prices_by_region,
    get_supported_regions,
    REGION_MAP
)

router = APIRouter(prefix="/api/regional", tags=["regional"])


@router.get("/prices/{steam_appid}")
async def get_regional_prices(
    steam_appid: str,
    regions: Optional[str] = Query(None, description="Comma-separated region codes (NL,US,GB,DE)")
):
    """
    Get prices for a game across multiple regions.
    
    Example: GET /api/regional/prices/570040?regions=NL,US,GB,DE
    
    Returns: {
      "NL": {"best_price": 9.99, "currency": "EUR", "stores": [...]},
      "US": {"best_price": 7.99, "currency": "USD", "stores": [...]},
      ...
    }
    """
    try:
        region_list = regions.split(",") if regions else ["NL", "US", "GB", "DE"]
        region_list = [r.upper().strip() for r in region_list if r.strip()]
        
        # Validate regions
        for region in region_list:
            if region not in REGION_MAP:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported region: {region}. Supported: {', '.join(REGION_MAP.keys())}"
                )
        
        result = await get_prices_by_region(steam_appid, region_list)

        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch regional prices: {str(e)}")


@router.get("/regions")
async def get_regions() -> Dict[str, Dict[str, str]]:
    """
    Get list of supported regions.
    
    Returns: {
      "NL": {"name": "Netherlands", "currency": "EUR", "flag": "🇳🇱"},
      "US": {"name": "United States", "currency": "USD", "flag": "🇺🇸"},
      ...
    }
    """
    return await get_supported_regions()
