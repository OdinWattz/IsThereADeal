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


@router.post("/test-steam")
async def test_steam_wishlist(
    steam_input: Dict[str, Any],
    _current_user: User = Depends(get_current_user),
):
    """Test if a Steam wishlist is accessible (for debugging)."""
    user_input = steam_input.get("steam_input", "").strip()

    if not user_input:
        raise HTTPException(status_code=400, detail="Steam ID required")

    result = await import_steam_wishlist(user_input)

    return {
        "test": True,
        "input": user_input,
        "result": result,
        "accessible": result["success"],
        "game_count": result.get("count", 0) if result["success"] else 0,
    }


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
            "failed": 0,
            "total": 0,
            "already_imported": 0,
            "remaining": 0,
            "batch_size": 0,
            "message": "Je Steam wishlist is leeg of kon niet worden opgehaald."
        }

    # BATCH PROCESSING: Limit to prevent timeout (Vercel has 30s HARD LIMIT)
    # Optimized but sequential (DB session issues prevent true parallel)
    # Each game: ~2-3s (APIs already parallel within upsert_game_and_prices)
    # 10 games = ~20-25s (safe for 30s limit)
    BATCH_SIZE = 10
    total_games = len(app_ids)

    # Find games already in wishlist to skip them
    existing_check = await db.execute(
        select(Game.steam_appid)
        .join(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
    )
    existing_appids = {row[0] for row in existing_check.all()}

    # Filter out already imported games
    new_app_ids = [aid for aid in app_ids if aid not in existing_appids]
    already_imported = len(app_ids) - len(new_app_ids)

    # Take only first BATCH_SIZE games to process
    app_ids_to_process = new_app_ids[:BATCH_SIZE]
    remaining = len(new_app_ids) - len(app_ids_to_process)

    print(f"[Import] Total: {total_games}, Already imported: {already_imported}, "
          f"To process now: {len(app_ids_to_process)}, Remaining: {remaining}")

    # Import games into user's wishlist
    # PARALLEL PROCESSING - fetch all games at once for speed!
    imported = 0
    failed = 0
    failed_games = []  # Track which games failed

    print(f"[Import] Processing batch of {len(app_ids_to_process)} games IN PARALLEL")

    # Step 1: Check which games already exist in DB (batch query)
    existing_games_result = await db.execute(
        select(Game).where(Game.steam_appid.in_(app_ids_to_process))
    )
    existing_games = {g.steam_appid: g for g in existing_games_result.scalars().all()}
    print(f"[Import] Found {len(existing_games)} games already in database")

    # Step 2: Fetch missing games SEQUENTIALLY
    # (Each game's APIs are already parallel within upsert_game_and_prices)
    missing_app_ids = [aid for aid in app_ids_to_process if aid not in existing_games]

    if missing_app_ids:
        print(f"[Import] Fetching {len(missing_app_ids)} new games...")

        for app_id in missing_app_ids:
            try:
                game = await upsert_game_and_prices(db, app_id, include_key_resellers=False)

                if game is None:
                    print(f"[Import] Game {app_id} not found on Steam")
                    failed_games.append(app_id)
                    failed += 1
                else:
                    existing_games[app_id] = game
                    print(f"[Import] Fetched {game.name}")

            except Exception as e:
                print(f"[Import] Error fetching {app_id}: {type(e).__name__}: {e}")
                failed_games.append(app_id)
                failed += 1

        # Batch commit all new games at once
        if len(existing_games) > len(existing_games_result.scalars().all()):
            try:
                await db.commit()
                print(f"[Import] Committed {len(missing_app_ids) - failed} new games to database")
            except Exception as e:
                print(f"[Import] Error committing games: {e}")
                await db.rollback()

    # Step 3: Add all games to wishlist in batch
    for app_id in app_ids_to_process:
        if app_id in existing_games:
            game = existing_games[app_id]
            wishlist_item = WishlistItem(
                user_id=current_user.id,
                game_id=game.id,
                target_price=None
            )
            db.add(wishlist_item)
            imported += 1

    # Final batch commit for all wishlist items
    try:
        await db.commit()
        print(f"[Import] Added {imported} games to wishlist")
    except Exception as e:
        print(f"[Import] Error committing wishlist items: {e}")
        await db.rollback()
        # Try one by one as fallback
        imported = 0
        for app_id in app_ids_to_process:
            if app_id in existing_games:
                try:
                    game = existing_games[app_id]
                    wishlist_item = WishlistItem(
                        user_id=current_user.id,
                        game_id=game.id,
                        target_price=None
                    )
                    db.add(wishlist_item)
                    await db.commit()
                    imported += 1
                except:
                    failed += 1
                    failed_games.append(app_id)

    if failed_games:
        print(f"[Import] Failed games: {', '.join(failed_games[:10])}{'...' if len(failed_games) > 10 else ''}")

    # Build message
    message = f"✅ {imported} games toegevoegd"
    if already_imported > 0:
        message += f", {already_imported} al geïmporteerd"
    if failed > 0:
        message += f", {failed} mislukt"

    # If there are more games to import, tell user to run again
    if remaining > 0:
        message += f"\n\n🔄 Nog {remaining} games over! Klik opnieuw op 'Importeren' om door te gaan."

    print(f"[Import] Complete: {message}")

    return {
        "success": True,
        "imported": imported,
        "failed": failed,
        "total": total_games,
        "already_imported": already_imported,
        "remaining": remaining,
        "batch_size": BATCH_SIZE,
        "message": message
    }
