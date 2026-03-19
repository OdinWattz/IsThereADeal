"""
Background scheduler – periodically refreshes prices and fires alerts.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from app.database import AsyncSessionLocal
from app.models.models import Game, PriceAlert, WishlistItem, GamePrice
from app.services.price_aggregator import upsert_game_and_prices
from app.services.email_service import send_price_alert_email

scheduler = AsyncIOScheduler()


async def refresh_all_prices():
    """Refresh prices for all tracked games."""
    print(f"[Scheduler] Refreshing all game prices at {datetime.now(timezone.utc)}")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Game))
        games = result.scalars().all()

    for game in games:
        try:
            async with AsyncSessionLocal() as db:
                await upsert_game_and_prices(db, game.steam_appid)
        except Exception as e:
            print(f"[Scheduler] Error refreshing {game.name}: {e}")


async def check_price_alerts():
    """Check all active price alerts and send notifications if triggered."""
    print(f"[Scheduler] Checking price alerts at {datetime.now(timezone.utc)}")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PriceAlert)
            .where(PriceAlert.is_active == True)
            .options(
                selectinload(PriceAlert.user),
                selectinload(PriceAlert.game).selectinload(Game.prices),
            )
        )
        alerts = result.scalars().all()

    for alert in alerts:
        try:
            game = alert.game
            prices = game.prices if game else []
            if not prices:
                continue

            # Find the best current price
            valid = [p for p in prices if (p.sale_price or p.regular_price)]
            if not valid:
                continue

            best = min(valid, key=lambda x: x.sale_price or x.regular_price or 999)
            current_price = best.sale_price or best.regular_price

            if current_price is not None and current_price <= alert.target_price:
                async with AsyncSessionLocal() as db:
                    # Mark alert as triggered
                    db_alert = await db.get(PriceAlert, alert.id)
                    if db_alert:
                        db_alert.triggered_at = datetime.now(timezone.utc).replace(tzinfo=None)
                        db_alert.is_active = False
                        await db.commit()

                if alert.notify_email and alert.user.email:
                    await send_price_alert_email(
                        to_email=alert.user.email,
                        username=alert.user.username,
                        game_name=game.name,
                        current_price=current_price,
                        target_price=alert.target_price,
                        store_name=best.store_name,
                        store_url=best.url or "",
                        header_image=game.header_image or "",
                    )
                    print(f"[Alerts] Triggered alert for {game.name} → {alert.user.username}")
        except Exception as e:
            print(f"[Alerts] Error processing alert {alert.id}: {e}")


def start_scheduler():
    scheduler.add_job(
        refresh_all_prices,
        trigger=IntervalTrigger(hours=6),
        id="refresh_prices",
        replace_existing=True,
    )
    scheduler.add_job(
        check_price_alerts,
        trigger=IntervalTrigger(hours=1),
        id="check_alerts",
        replace_existing=True,
    )
    scheduler.start()
    print("[Scheduler] Started: prices refresh every 6h, alerts checked every 1h")


def stop_scheduler():
    scheduler.shutdown(wait=False)
