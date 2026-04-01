from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.auth import get_current_user
from app.config import settings
from app.models.models import User, PriceAlert, Game
from app.models.schemas import PriceAlertCreate, PriceAlertOut
from app.routers.games import _enrich_game
from app.services.email_service import send_price_alert_email

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


async def _check_and_fire_alert(alert: PriceAlert, db: AsyncSession) -> bool:
    """Check one alert. Returns True if triggered and email sent."""
    prices = (alert.game.prices if alert.game else []) or []
    valid = [p for p in prices if (p.sale_price or p.regular_price)]
    if not valid:
        return False
    best = min(valid, key=lambda x: x.sale_price or x.regular_price or 999)
    current_price = best.sale_price or best.regular_price
    if current_price is None or current_price > alert.target_price:
        return False

    alert.triggered_at = datetime.now(timezone.utc).replace(tzinfo=None)
    alert.is_active = False
    await db.commit()

    if alert.notify_email and alert.user and alert.user.email:
        await send_price_alert_email(
            to_email=alert.user.email,
            username=alert.user.username,
            game_name=alert.game.name,
            current_price=current_price,
            target_price=alert.target_price,
            store_name=best.store_name,
            store_url=best.url or "",
            header_image=alert.game.header_image or "",
        )
    return True


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
    game = None

    # Support both game_id and steam_appid
    if payload.steam_appid:
        # Try to find existing game by steam_appid
        result = await db.execute(
            select(Game).where(Game.steam_appid == payload.steam_appid).options(selectinload(Game.prices))
        )
        game = result.scalar_one_or_none()

        # If not found, fetch and save it automatically
        if not game:
            from app.services.price_aggregator import upsert_game_and_prices
            game = await upsert_game_and_prices(db, payload.steam_appid, include_key_resellers=False)
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")
            await db.commit()
            # Reload with prices
            result = await db.execute(
                select(Game).where(Game.id == game.id).options(selectinload(Game.prices))
            )
            game = result.scalar_one()
    elif payload.game_id:
        # Legacy: support game_id directly
        result = await db.execute(
            select(Game).where(Game.id == payload.game_id).options(selectinload(Game.prices))
        )
        game = result.scalar_one_or_none()
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
    else:
        raise HTTPException(status_code=400, detail="Either game_id or steam_appid required")

    alert = PriceAlert(
        user_id=current_user.id,
        game_id=game.id,
        target_price=payload.target_price,
        notify_email=payload.notify_email,
    )
    # Attach relations so _check_and_fire_alert can work inline
    alert.game = game
    alert.user = current_user
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Immediate check: if the current price already meets the target, fire right away
    try:
        await _check_and_fire_alert(alert, db)
    except Exception:
        pass

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


@router.post("/run-check", status_code=200, include_in_schema=False)
async def run_alert_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Cron endpoint: check all active alerts and send email notifications.
    Called by Vercel Cron (Authorization: Bearer {CRON_SECRET}).
    """
    auth = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    is_vercel_cron = request.headers.get("x-vercel-cron") == "1"
    is_valid_secret = bool(settings.CRON_SECRET) and auth == settings.CRON_SECRET
    if not (is_vercel_cron or is_valid_secret):
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.is_active == True)
        .options(
            selectinload(PriceAlert.user),
            selectinload(PriceAlert.game).selectinload(Game.prices),
        )
    )
    alerts = result.scalars().all()

    triggered = 0
    for alert in alerts:
        try:
            if await _check_and_fire_alert(alert, db):
                triggered += 1
        except Exception as e:
            print(f"[Alerts cron] Error on alert {alert.id}: {e}")

    return {"checked": len(alerts), "triggered": triggered}


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
    await db.commit()

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
