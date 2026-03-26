from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.database import get_db
from app.auth import get_current_user
from app.models.models import User, WishlistItem, Game
from app.models.schemas import WishlistItemCreate, WishlistItemOut
from app.services.price_aggregator import upsert_game_and_prices
from app.services.steam_wishlist_service import import_steam_wishlist
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
    try:
        game = None

        # Support both game_id and steam_appid
        if payload.steam_appid:
            # Try to find existing game by steam_appid
            result = await db.execute(
                select(Game).where(Game.steam_appid == payload.steam_appid)
            )
            game = result.scalar_one_or_none()

            # If not found, fetch and save it automatically
            if not game:
                game = await upsert_game_and_prices(db, payload.steam_appid, include_key_resellers=False)
                if not game:
                    raise HTTPException(status_code=404, detail="Game not found")
                await db.commit()
        elif payload.game_id:
            # Legacy: support game_id directly
            result = await db.execute(select(Game).where(Game.id == payload.game_id))
            game = result.scalar_one_or_none()
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")
        else:
            raise HTTPException(status_code=400, detail="Either game_id or steam_appid required")

        # Check duplicate
        existing = await db.execute(
            select(WishlistItem).where(
                WishlistItem.user_id == current_user.id,
                WishlistItem.game_id == game.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Already in wishlist")

        item = WishlistItem(
            user_id=current_user.id,
            game_id=game.id,
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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


@router.post("/import-steam")
async def import_from_steam(
    steam_input: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import games from a public Steam wishlist.
    Accepts Steam ID, profile URL, or vanity name.
    """
    user_input = steam_input.get("steam_input", "").strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="Steam ID, profile URL, or vanity name required")

    # Import wishlist from Steam
    result = await import_steam_wishlist(user_input)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to import wishlist"))

    app_ids = result.get("app_ids", [])
    if not app_ids:
        return {
            "success": True,
            "imported": 0,
            "skipped": 0,
            "failed": 0,
            "message": "Je Steam wishlist is leeg of kon niet worden opgehaald."
        }

    # Import games into user's wishlist
    imported = 0
    skipped = 0
    failed = 0

    for app_id in app_ids:
        try:
            # Check if already in wishlist
            existing = await db.execute(
                select(WishlistItem)
                .join(Game)
                .where(
                    WishlistItem.user_id == current_user.id,
                    Game.steam_appid == app_id
                )
            )
            if existing.scalar_one_or_none():
                skipped += 1
                continue

            # Try to find or create game
            game_result = await db.execute(
                select(Game).where(Game.steam_appid == app_id)
            )
            game = game_result.scalar_one_or_none()

            if not game:
                # Fetch game data from Steam
                game = await upsert_game_and_prices(db, app_id, include_key_resellers=False)
                if not game:
                    failed += 1
                    continue
                await db.commit()

            # Add to wishlist
            wishlist_item = WishlistItem(
                user_id=current_user.id,
                game_id=game.id,
                target_price=None
            )
            db.add(wishlist_item)
            await db.flush()
            imported += 1

        except Exception as e:
            print(f"[Steam Import] Failed to import {app_id}: {e}")
            failed += 1
            continue

    await db.commit()

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "total": len(app_ids),
        "message": f"{imported} games geïmporteerd, {skipped} overgeslagen (al in wishlist), {failed} mislukt."
    }
