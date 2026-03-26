from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.models import FollowedGame, Game, User
from app.models.schemas import FollowedGameCreate, FollowedGameOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/followed", tags=["followed"])


@router.get("", response_model=List[FollowedGameOut])
async def get_followed_games(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all games the user is following."""
    result = await db.execute(
        select(FollowedGame)
        .where(FollowedGame.user_id == current_user.id)
        .options(selectinload(FollowedGame.game).selectinload(Game.prices))
        .order_by(FollowedGame.followed_at.desc())
    )
    followed = result.scalars().all()
    return followed


@router.post("", response_model=FollowedGameOut)
async def follow_game(
    data: FollowedGameCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Follow a game. Resolves steam_appid to game_id if needed."""
    game_id = data.game_id

    if not game_id and data.steam_appid:
        result = await db.execute(select(Game).where(Game.steam_appid == data.steam_appid))
        game = result.scalar_one_or_none()
        if not game:
            # Game not in DB - fetch it
            from app.services.price_aggregator import upsert_game_and_prices
            game = await upsert_game_and_prices(db, data.steam_appid, include_key_resellers=False)
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")
        game_id = game.id

    if not game_id:
        raise HTTPException(status_code=400, detail="Must provide game_id or steam_appid")

    # Check if already following
    result = await db.execute(
        select(FollowedGame).where(
            FollowedGame.user_id == current_user.id,
            FollowedGame.game_id == game_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already following this game")

    followed = FollowedGame(
        user_id=current_user.id,
        game_id=game_id,
        notify_on_sale=data.notify_on_sale,
        notify_on_release=data.notify_on_release,
    )
    db.add(followed)
    await db.commit()
    await db.refresh(followed)

    # Load game relationship
    await db.execute(
        select(FollowedGame)
        .where(FollowedGame.id == followed.id)
        .options(selectinload(FollowedGame.game).selectinload(Game.prices))
    )
    await db.refresh(followed)

    return followed


@router.delete("/{followed_id}")
async def unfollow_game(
    followed_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unfollow a game."""
    result = await db.execute(
        select(FollowedGame).where(
            FollowedGame.id == followed_id,
            FollowedGame.user_id == current_user.id
        )
    )
    followed = result.scalar_one_or_none()

    if not followed:
        raise HTTPException(status_code=404, detail="Followed game not found")

    await db.delete(followed)
    await db.commit()

    return {"message": "Game unfollowed successfully"}


@router.patch("/{followed_id}/notifications")
async def update_notifications(
    followed_id: int,
    notify_on_sale: bool = True,
    notify_on_release: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences for a followed game."""
    result = await db.execute(
        select(FollowedGame).where(
            FollowedGame.id == followed_id,
            FollowedGame.user_id == current_user.id
        )
    )
    followed = result.scalar_one_or_none()

    if not followed:
        raise HTTPException(status_code=404, detail="Followed game not found")

    followed.notify_on_sale = notify_on_sale
    followed.notify_on_release = notify_on_release
    await db.commit()

    return {"message": "Notification preferences updated"}
