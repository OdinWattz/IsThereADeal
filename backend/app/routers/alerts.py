from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.auth import get_current_user
from app.models.models import User, PriceAlert, Game
from app.models.schemas import PriceAlertCreate, PriceAlertOut
from app.routers.games import _enrich_game

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[PriceAlertOut])
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.user_id == current_user.id)
        .options(selectinload(PriceAlert.game).selectinload(Game.prices))
        .order_by(PriceAlert.created_at.desc())
    )
    alerts = result.scalars().all()
    return [
        PriceAlertOut(
            id=a.id,
            game_id=a.game_id,
            target_price=a.target_price,
            is_active=a.is_active,
            created_at=a.created_at,
            triggered_at=a.triggered_at,
            notify_email=a.notify_email,
            game=_enrich_game(a.game),
        )
        for a in alerts
    ]


@router.post("", response_model=PriceAlertOut, status_code=201)
async def create_alert(
    payload: PriceAlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Game)
        .where(Game.id == payload.game_id)
        .options(selectinload(Game.prices))
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    alert = PriceAlert(
        user_id=current_user.id,
        game_id=payload.game_id,
        target_price=payload.target_price,
        notify_email=payload.notify_email,
    )
    db.add(alert)
    await db.flush()

    return PriceAlertOut(
        id=alert.id,
        game_id=alert.game_id,
        target_price=alert.target_price,
        is_active=alert.is_active,
        created_at=alert.created_at,
        triggered_at=alert.triggered_at,
        notify_email=alert.notify_email,
        game=_enrich_game(game),
    )


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)


@router.patch("/{alert_id}/toggle", response_model=PriceAlertOut)
async def toggle_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
        .options(selectinload(PriceAlert.game).selectinload(Game.prices))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_active = not alert.is_active
    if alert.is_active:
        alert.triggered_at = None
    await db.flush()

    return PriceAlertOut(
        id=alert.id,
        game_id=alert.game_id,
        target_price=alert.target_price,
        is_active=alert.is_active,
        created_at=alert.created_at,
        triggered_at=alert.triggered_at,
        notify_email=alert.notify_email,
        game=_enrich_game(alert.game),
    )
