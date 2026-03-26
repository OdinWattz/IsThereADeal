from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import User, WishlistItem, PriceAlert, Game, GamePrice
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/savings")
async def get_user_savings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate user's potential savings from wishlisted games.
    Shows how much they could save vs regular price.
    """
    # Get all wishlist items (without join to avoid duplicates)
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .options(
            selectinload(WishlistItem.game).selectinload(Game.prices)
        )
    )
    wishlist_items = result.scalars().all()

    total_regular_price = 0.0
    total_sale_price = 0.0
    potential_savings = 0.0
    target_price_savings = 0.0
    games_on_sale = 0
    games_at_target = 0

    # Calculate savings per unique game
    for item in wishlist_items:
        if not item.game or not item.game.prices:
            continue

        # Find best current price across all stores
        best_regular = min((p.regular_price for p in item.game.prices if p.regular_price), default=0)
        best_sale = min(
            (p.sale_price for p in item.game.prices if p.sale_price and p.is_on_sale),
            default=best_regular
        )

        # Add to totals (once per game, not per store!)
        if best_regular > 0:
            total_regular_price += best_regular

        if best_sale > 0:
            total_sale_price += best_sale

            # Check if on sale
            if best_sale < best_regular:
                games_on_sale += 1
                potential_savings += (best_regular - best_sale)

            # Check if at target price
            if item.target_price and best_sale <= item.target_price:
                games_at_target += 1
                target_price_savings += (best_regular - item.target_price)

    # Get alert stats
    alert_result = await db.execute(
        select(func.count(PriceAlert.id))
        .where(PriceAlert.user_id == current_user.id, PriceAlert.is_active == True)
    )
    active_alerts = alert_result.scalar() or 0

    # Get recently triggered alerts (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    triggered_result = await db.execute(
        select(func.count(PriceAlert.id))
        .where(
            PriceAlert.user_id == current_user.id,
            PriceAlert.triggered_at >= thirty_days_ago
        )
    )
    recent_triggers = triggered_result.scalar() or 0

    return {
        "total_wishlist_games": len(wishlist_items),
        "games_on_sale": games_on_sale,
        "games_at_target_price": games_at_target,
        "total_regular_price": round(total_regular_price, 2),
        "total_sale_price": round(total_sale_price, 2),
        "potential_savings": round(potential_savings, 2),
        "target_price_savings": round(target_price_savings, 2),
        "savings_percentage": round((potential_savings / total_regular_price * 100) if total_regular_price > 0 else 0, 1),
        "active_alerts": active_alerts,
        "recent_alert_triggers": recent_triggers,
    }


@router.get("/activity")
async def get_user_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's activity statistics.
    """
    # Count wishlist items
    wishlist_result = await db.execute(
        select(func.count(WishlistItem.id))
        .where(WishlistItem.user_id == current_user.id)
    )
    wishlist_count = wishlist_result.scalar() or 0

    # Count active alerts
    alerts_result = await db.execute(
        select(func.count(PriceAlert.id))
        .where(PriceAlert.user_id == current_user.id, PriceAlert.is_active == True)
    )
    alerts_count = alerts_result.scalar() or 0

    # Recent wishlist additions (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_wishlist_result = await db.execute(
        select(func.count(WishlistItem.id))
        .where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.added_at >= seven_days_ago
        )
    )
    recent_wishlist = recent_wishlist_result.scalar() or 0

    return {
        "wishlist_count": wishlist_count,
        "active_alerts_count": alerts_count,
        "recent_wishlist_additions": recent_wishlist,
    }
