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
        await db.commit()

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
    await db.commit()


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
    await db.commit()
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
    print(f"[Import] Received request from user {current_user.username}: '{user_input}'")

    if not user_input:
        raise HTTPException(status_code=400, detail="Steam ID, profile URL, or vanity name required")

    # Import wishlist from Steam
    result = await import_steam_wishlist(user_input)
    print(f"[Import] Steam wishlist result: {result}")

    if not result["success"]:
        error_msg = result.get("error", "Failed to import wishlist")
        print(f"[Import] Failed: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

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
    failed_games = []  # Track which games failed

    print(f"[Import] Processing {len(app_ids)} games from Steam wishlist")

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
                print(f"[Import] Skipping {app_id} - already in wishlist")
                skipped += 1
                continue

            # Try to find or create game
            game_result = await db.execute(
                select(Game).where(Game.steam_appid == app_id)
            )
            game = game_result.scalar_one_or_none()

            if not game:
                # Fetch game data from Steam
                print(f"[Import] Fetching game data for {app_id}")
                game = await upsert_game_and_prices(db, app_id, include_key_resellers=False)
                if not game:
                    print(f"[Import] Failed to fetch game {app_id} - game not found on Steam")
                    failed_games.append(app_id)
                    failed += 1
                    continue
                # Commit the new game immediately
                await db.commit()
                print(f"[Import] Successfully added game {game.name} ({app_id}) to database")

            # Add to wishlist
            wishlist_item = WishlistItem(
                user_id=current_user.id,
                game_id=game.id,
                target_price=None
            )
            db.add(wishlist_item)
            # Commit each wishlist item immediately to prevent loss on error
            await db.commit()
            print(f"[Import] Added {game.name} to wishlist")
            imported += 1

        except Exception as e:
            print(f"[Steam Import] ERROR importing {app_id}: {type(e).__name__}: {e}")
            failed_games.append(app_id)
            # Rollback the failed transaction
            try:
                await db.rollback()
            except:
                pass
            failed += 1
            continue

    if failed_games:
        print(f"[Import] Failed games: {', '.join(failed_games[:10])}{'...' if len(failed_games) > 10 else ''}")

    message = f"✅ {imported} games toegevoegd"
    if skipped > 0:
        message += f", {skipped} overgeslagen (al in wishlist)"
    if failed > 0:
        message += f", {failed} mislukt"

    print(f"[Import] Complete: {message}")

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "total": len(app_ids),
        "message": message
    }
