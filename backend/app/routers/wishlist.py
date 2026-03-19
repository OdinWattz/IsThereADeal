from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.models import User, WishlistItem, Game
from app.models.schemas import WishlistItemCreate, WishlistItemOut
from app.services.price_aggregator import upsert_game_and_prices
from app.routers.games import _enrich_game

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


@router.get("", response_model=List[WishlistItemOut])
async def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .options(
            selectinload(WishlistItem.game).selectinload(Game.prices)
        )
        .order_by(WishlistItem.added_at.desc())
    )
    items = result.scalars().all()

    enriched = []
    for item in items:
        item_dict = {
            "id": item.id,
            "game_id": item.game_id,
            "added_at": item.added_at,
            "target_price": item.target_price,
            "game": _enrich_game(item.game),
        }
        enriched.append(WishlistItemOut(**item_dict))
    return enriched


@router.post("", response_model=WishlistItemOut, status_code=201)
async def add_to_wishlist(
    payload: WishlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ensure game exists
    result = await db.execute(select(Game).where(Game.id == payload.game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Check duplicate
    existing = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.game_id == payload.game_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already in wishlist")

    item = WishlistItem(
        user_id=current_user.id,
        game_id=payload.game_id,
        target_price=payload.target_price,
    )
    db.add(item)
    await db.flush()

    # Reload with relations
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item.id)
        .options(selectinload(WishlistItem.game).selectinload(Game.prices))
    )
    item = result.scalar_one()
    return WishlistItemOut(
        id=item.id,
        game_id=item.game_id,
        added_at=item.added_at,
        target_price=item.target_price,
        game=_enrich_game(item.game),
    )


@router.delete("/{item_id}", status_code=204)
async def remove_from_wishlist(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    await db.delete(item)


@router.patch("/{item_id}/target-price", response_model=WishlistItemOut)
async def update_target_price(
    item_id: int,
    target_price: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id, WishlistItem.user_id == current_user.id)
        .options(selectinload(WishlistItem.game).selectinload(Game.prices))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")

    item.target_price = target_price
    await db.flush()
    return WishlistItemOut(
        id=item.id,
        game_id=item.game_id,
        added_at=item.added_at,
        target_price=item.target_price,
        game=_enrich_game(item.game),
    )
