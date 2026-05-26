from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import re
import json

from app.database import get_db
from app.models.models import (
    Game,
    GamePrice,
    PriceHistory,
    DailyFeaturedDeal,
    DailyFeaturedDealSkip,
    FeaturedQueueItem,
    FeaturedBlacklistItem,
    FeaturedWhitelistItem,
    AdminAuditLog,
    SiteSetting,
    User,
)
from app.models.schemas import GameOut, GamePriceOut, PriceHistoryPoint, SearchResult
from app.auth import get_admin_user
from app.services.steam_service import search_steam_games, get_featured_deals
from app.services.price_aggregator import upsert_game_and_prices
from app.services.itad_service import get_price_history, get_dlc_deals_for_game
import httpx

router = APIRouter(prefix="/api/games", tags=["games"])


FEATURED_MIN_DEAL_RATING_KEY = "featured_min_deal_rating"
FEATURED_MIN_SALE_PRICE_KEY = "featured_min_sale_price"
FEATURED_EXCLUDE_DAYS_KEY = "featured_exclude_days"
FEATURED_IMAGE_RETRY_KEY = "featured_image_retry_count"


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _get_site_setting(db: AsyncSession, key: str) -> Optional[str]:
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def _set_site_setting(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
    setting = result.scalar_one_or_none()
    if setting is None:
        setting = SiteSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value


async def _featured_config(db: AsyncSession) -> dict:
    min_rating = await _get_site_setting(db, FEATURED_MIN_DEAL_RATING_KEY)
    min_price = await _get_site_setting(db, FEATURED_MIN_SALE_PRICE_KEY)
    exclude_days = await _get_site_setting(db, FEATURED_EXCLUDE_DAYS_KEY)
    image_retry_count = await _get_site_setting(db, FEATURED_IMAGE_RETRY_KEY)
    return {
        "min_deal_rating": float(min_rating) if min_rating is not None else 5.0,
        "min_sale_price": float(min_price) if min_price is not None else 1.0,
        "exclude_days": int(exclude_days) if exclude_days is not None else 30,
        "image_retry_count": int(image_retry_count) if image_retry_count is not None else 10,
    }


async def _audit_log(
    db: AsyncSession,
    actor: str,
    action: str,
    target_type: Optional[str] = None,
    target_value: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor_username=actor,
            action=action,
            target_type=target_type,
            target_value=target_value,
            details=json.dumps(details) if details else None,
        )
    )


def _safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_optional_int(value) -> Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_optional_float(value) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_price_payload(raw: dict) -> dict:
    return {
        "store_name": str(raw.get("store_name") or "Unknown"),
        "store_id": _safe_optional_int(raw.get("store_id")),
        "regular_price": _safe_optional_float(raw.get("regular_price")),
        "sale_price": _safe_optional_float(raw.get("sale_price")),
        "discount_percent": _safe_int(raw.get("discount_percent"), 0),
        "currency": str(raw.get("currency") or "EUR"),
        "url": raw.get("url"),
        "is_on_sale": bool(raw.get("is_on_sale", False)),
        "lowest_ever_price": _safe_optional_float(raw.get("lowest_ever_price")),
        "lowest_ever_currency": raw.get("lowest_ever_currency"),
        "is_all_time_low": bool(raw.get("is_all_time_low", False)),
    }


def _extract_steam_movie_id(movie: dict) -> Optional[str]:
    movie_id = movie.get("id")
    if movie_id is not None:
        try:
            return str(int(movie_id))
        except (TypeError, ValueError):
            pass

    thumbnail = movie.get("thumbnail")
    if isinstance(thumbnail, str):
        match = re.search(r"/steam/apps/(\d+)/movie", thumbnail)
        if match:
                        return match.group(1)

    return None


def _steam_movie_mp4_url(movie_id: str) -> str:
    return f"https://cdn.akamai.steamstatic.com/steam/apps/{movie_id}/movie_max.mp4"


def _daily_featured_deal_to_dict(deal: DailyFeaturedDeal) -> dict:
    return {
        "steam_appid": deal.steam_appid,
        "name": deal.name,
        "sale_price": deal.sale_price,
        "regular_price": deal.regular_price,
        "discount_percent": deal.discount_percent,
        "store_name": deal.store_name,
        "header_image": deal.header_image,
        "deal_rating": deal.deal_rating,
        "url": deal.url,
    }


async def _select_and_store_daily_featured_deal(
    db: AsyncSession,
    today,
    excluded_appids: Optional[set[str]] = None,
) -> Optional[DailyFeaturedDeal]:
    from app.services.cheapshark_service import get_trending_deals
    import random

    excluded_appids = excluded_appids or set()
    base_excluded_appids = {str(appid) for appid in excluded_appids if appid}
    config = await _featured_config(db)
    min_deal_rating = float(config["min_deal_rating"])
    min_sale_price = float(config["min_sale_price"])
    exclude_days = int(config["exclude_days"])
    image_retry_count = int(config["image_retry_count"])

    # Get top deals
    deals = await get_trending_deals(page=0, limit=100, apply_quality_filter=True)
    if not deals:
        return None

    # Filter to only include games with valid Steam data
    valid_deals = []
    for deal in deals:
        appid = str(deal.get("steam_appid", ""))
        if not appid or not appid.isdigit():
            continue
        if deal.get("deal_rating", 0) < min_deal_rating:
            continue
        if deal.get("sale_price", 0) < min_sale_price:
            continue
        valid_deals.append(deal)

    if not valid_deals:
        return None

    # Exclude active blacklist items.
    now_naive = _utcnow_naive()
    blacklist_result = await db.execute(
        select(FeaturedBlacklistItem.steam_appid)
        .where(FeaturedBlacklistItem.is_active == True)
        .where((FeaturedBlacklistItem.expires_at.is_(None)) | (FeaturedBlacklistItem.expires_at >= now_naive))
    )
    blacklisted_appids = {str(row[0]) for row in blacklist_result.all()}

    # Keep skip-history exclusion bounded to the same configured recent window.
    # This avoids exhausting the candidate pool while still preventing immediate repeats.
    recent_cutoff = today - timedelta(days=exclude_days)
    skipped_result = await db.execute(
        select(DailyFeaturedDealSkip.steam_appid).where(DailyFeaturedDealSkip.featured_date >= recent_cutoff)
    )
    skipped_appids = {str(row[0]) for row in skipped_result.all()}

    strict_excluded_appids = set(base_excluded_appids)
    strict_excluded_appids.update(blacklisted_appids)
    strict_excluded_appids.update(skipped_appids)

    # Exclude deals shown in the configured recent window and explicitly excluded appids.
    recent_result = await db.execute(
        select(DailyFeaturedDeal.steam_appid).where(DailyFeaturedDeal.featured_date >= recent_cutoff)
    )
    recent_appids = {str(row[0]) for row in recent_result.all()}
    recent_appids.update(strict_excluded_appids)

    eligible_deals = [deal for deal in valid_deals if str(deal.get("steam_appid", "")) not in recent_appids]
    chosen_pool = eligible_deals or [
        deal for deal in valid_deals if str(deal.get("steam_appid", "")) not in strict_excluded_appids
    ]

    # Final fallback: if strict rules exhaust the pool, keep only hard exclusions
    # so skip can still produce a replacement instead of returning 404.
    if not chosen_pool:
        relaxed_excluded_appids = set(base_excluded_appids)
        relaxed_excluded_appids.update(blacklisted_appids)
        chosen_pool = [
            deal for deal in valid_deals if str(deal.get("steam_appid", "")) not in relaxed_excluded_appids
        ]

    if not chosen_pool:
        return None

    # First try unconsumed queue items.
    queue_result = await db.execute(
        select(FeaturedQueueItem)
        .where(FeaturedQueueItem.consumed_at.is_(None))
        .order_by(FeaturedQueueItem.position.asc(), FeaturedQueueItem.created_at.asc())
    )
    queue_items = queue_result.scalars().all()
    selected = None
    selected_queue_item = None
    by_appid = {str(d.get("steam_appid", "")): d for d in chosen_pool}
    for queue_item in queue_items:
        q_appid = str(queue_item.steam_appid)
        if q_appid in by_appid:
            selected = by_appid[q_appid]
            selected_queue_item = queue_item
            break

    if selected is None:
        # Weighted random: whitelist appids get a boost.
        whitelist_result = await db.execute(
            select(FeaturedWhitelistItem.steam_appid, FeaturedWhitelistItem.boost)
            .where(FeaturedWhitelistItem.is_active == True)
        )
        whitelist_boost_map = {str(row[0]): max(1, int(row[1])) for row in whitelist_result.all()}
        weighted_deals = []
        for deal in chosen_pool:
            appid = str(deal.get("steam_appid", ""))
            weight = whitelist_boost_map.get(appid, 1)
            weighted_deals.extend([deal] * weight)

        random.shuffle(weighted_deals)
        selected = random.choice(weighted_deals)

    # Quick check if Steam header image exists (fast HEAD request)
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            img_url = selected.get("header_image", "")
            resp = await client.head(img_url)
            if resp.status_code != 200 and valid_deals:
                for candidate in chosen_pool[1:image_retry_count + 1]:
                    try:
                        candidate_img = candidate.get("header_image", "")
                        candidate_resp = await client.head(candidate_img)
                        if candidate_resp.status_code == 200:
                            selected = candidate
                            break
                    except Exception:
                        continue
    except Exception:
        pass

    existing_snapshot_result = await db.execute(
        select(DailyFeaturedDeal).where(DailyFeaturedDeal.featured_date == today)
    )
    existing_snapshot = existing_snapshot_result.scalar_one_or_none()

    if existing_snapshot:
        existing_snapshot.steam_appid = str(selected.get("steam_appid", ""))
        existing_snapshot.name = str(selected.get("name", ""))
        existing_snapshot.sale_price = float(selected.get("sale_price", 0) or 0)
        existing_snapshot.regular_price = float(selected.get("regular_price", 0) or 0)
        existing_snapshot.discount_percent = int(selected.get("discount_percent", 0) or 0)
        existing_snapshot.store_name = str(selected.get("store_name", "Steam"))
        existing_snapshot.header_image = str(selected.get("header_image", ""))
        existing_snapshot.deal_rating = float(selected.get("deal_rating", 0) or 0)
        existing_snapshot.url = selected.get("url")
        snapshot = existing_snapshot
    else:
        snapshot = DailyFeaturedDeal(
            featured_date=today,
            steam_appid=str(selected.get("steam_appid", "")),
            name=str(selected.get("name", "")),
            sale_price=float(selected.get("sale_price", 0) or 0),
            regular_price=float(selected.get("regular_price", 0) or 0),
            discount_percent=int(selected.get("discount_percent", 0) or 0),
            store_name=str(selected.get("store_name", "Steam")),
            header_image=str(selected.get("header_image", "")),
            deal_rating=float(selected.get("deal_rating", 0) or 0),
            url=selected.get("url"),
        )
        db.add(snapshot)
    if selected_queue_item is not None:
        selected_queue_item.consumed_at = _utcnow_naive()
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


@router.get("/search", response_model=List[SearchResult])
async def search_games(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Search Steam for games."""
    steam_results = await search_steam_games(q)

    # Check which ones are already in our DB – non-fatal if DB is unavailable
    appids = [r["steam_appid"] for r in steam_results]
    try:
        db_result = await db.execute(select(Game).where(Game.steam_appid.in_(appids)))
        db_games = {g.steam_appid: g for g in db_result.scalars().all()}
    except Exception:
        db_games = {}

    results = []
    for r in steam_results:
        db_game = db_games.get(r["steam_appid"])
        results.append(
            SearchResult(
                steam_appid=r["steam_appid"],
                name=r["name"],
                header_image=r.get("header_image"),
                is_in_db=db_game is not None,
                game_id=db_game.id if db_game else None,
            )
        )
    return results


@router.get("/browse")
async def browse_games(
    page: int = 0,
    limit: int = Query(100, ge=1, le=100),
    min_price: float = 0,
    max_price: float = 999,
    min_discount: int = Query(0, ge=0, le=90),
    sort_by: str = "DealRating",
):
    """
    Browse game deals from CheapShark with filters.
    Shows live deals from multiple stores.

    Note: Text filters (q, genre, developer, publisher) are not supported
    because CheapShark API doesn't support them. Use price/discount filters instead.
    """
    from app.services.cheapshark_service import browse_all_deals

    # Map frontend sort values to CheapShark sort values
    sort_map = {
        "name": "Title",
        "price": "Price",
        "discount": "Savings",
        "metacritic": "Metacritic",
        "reviews": "Reviews",
    }
    cs_sort = sort_map.get(sort_by, "DealRating")

    # If user wants high discounts, automatically sort by Savings for better results
    if min_discount >= 50 and cs_sort == "DealRating":
        cs_sort = "Savings"

    result = await browse_all_deals(page, limit, min_price, max_price, min_discount, cs_sort)
    return result


@router.get("/featured", response_model=List[dict])
async def featured_deals():
    """Get featured Steam deals (no auth needed)."""
    return await get_featured_deals()


@router.get("/deal-of-the-day")
async def get_deal_of_the_day(db: AsyncSession = Depends(get_db)):
    """
    Get the featured Deal of the Day.
    Stores one selected deal per day and avoids reusing deals from the last 30 days.
    """
    today = datetime.now(timezone.utc).date()

    existing_result = await db.execute(
        select(DailyFeaturedDeal).where(DailyFeaturedDeal.featured_date == today)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return _daily_featured_deal_to_dict(existing)

    snapshot = await _select_and_store_daily_featured_deal(db=db, today=today)
    if not snapshot:
        return None

    return _daily_featured_deal_to_dict(snapshot)


@router.post("/deal-of-the-day/skip")
async def skip_deal_of_the_day(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: skip today's featured deal and select another one."""
    _ = current_user
    today = datetime.now(timezone.utc).date()

    existing_result = await db.execute(
        select(DailyFeaturedDeal).where(DailyFeaturedDeal.featured_date == today)
    )
    existing = existing_result.scalar_one_or_none()

    skip_history_result = await db.execute(
        select(DailyFeaturedDealSkip.steam_appid).where(DailyFeaturedDealSkip.featured_date == today)
    )
    today_skipped_appids = {str(row[0]) for row in skip_history_result.all()}

    excluded_appids: set[str] = set()
    excluded_appids.update(today_skipped_appids)
    if existing:
        current_appid = str(existing.steam_appid)
        excluded_appids.add(current_appid)
        if current_appid not in today_skipped_appids:
            db.add(
                DailyFeaturedDealSkip(
                    featured_date=today,
                    steam_appid=current_appid,
                )
            )

    snapshot = await _select_and_store_daily_featured_deal(
        db=db,
        today=today,
        excluded_appids=excluded_appids,
    )

    if not snapshot:
        raise HTTPException(status_code=404, detail="No replacement deal available")

    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_skip",
        target_type="deal_of_the_day",
        target_value=str(snapshot.steam_appid),
        details={"date": today.isoformat()},
    )
    await db.commit()

    return _daily_featured_deal_to_dict(snapshot)


@router.get("/deal-of-the-day/skips/today")
async def get_today_deal_skip_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: return today's skipped featured appids."""
    _ = current_user
    today = datetime.now(timezone.utc).date()

    result = await db.execute(
        select(DailyFeaturedDealSkip.steam_appid, Game.name)
        .select_from(DailyFeaturedDealSkip)
        .outerjoin(Game, Game.steam_appid == DailyFeaturedDealSkip.steam_appid)
        .where(DailyFeaturedDealSkip.featured_date == today)
        .order_by(DailyFeaturedDealSkip.created_at.asc())
    )
    rows = result.all()
    skipped_appids = [str(row[0]) for row in rows]

    return {
        "date": today.isoformat(),
        "count": len(skipped_appids),
        "skipped_appids": skipped_appids,
        "skipped_games": [
            {
                "steam_appid": str(row[0]),
                "name": row[1],
            }
            for row in rows
        ],
    }


@router.get("/deal-of-the-day/skips")
async def get_deal_skip_history(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: return featured deal skip history (newest first)."""
    _ = current_user

    result = await db.execute(
        select(
            DailyFeaturedDealSkip.id,
            DailyFeaturedDealSkip.featured_date,
            DailyFeaturedDealSkip.steam_appid,
            DailyFeaturedDealSkip.created_at,
            Game.name,
        )
        .select_from(DailyFeaturedDealSkip)
        .outerjoin(Game, Game.steam_appid == DailyFeaturedDealSkip.steam_appid)
        .order_by(DailyFeaturedDealSkip.created_at.desc())
        .limit(limit)
    )
    rows = result.all()

    items = [
        {
            "id": int(row[0]),
            "featured_date": row[1].isoformat() if row[1] else None,
            "steam_appid": str(row[2]),
            "created_at": row[3].isoformat() if row[3] else None,
            "game_name": row[4],
        }
        for row in rows
    ]

    return {
        "count": len(items),
        "items": items,
    }


@router.delete("/deal-of-the-day/skips/{skip_id}")
async def delete_deal_skip_history_item(
    skip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: delete one skip-history entry so that appid can be eligible again."""
    _ = current_user

    result = await db.execute(
        select(DailyFeaturedDealSkip).where(DailyFeaturedDealSkip.id == skip_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Skip history entry not found")

    deleted_appid = str(entry.steam_appid)
    await db.delete(entry)
    await _audit_log(
        db,
        actor=current_user.username,
        action="skip_history_delete",
        target_type="daily_featured_deal_skip",
        target_value=deleted_appid,
        details={"skip_id": skip_id},
    )
    await db.commit()

    return {"ok": True, "deleted_id": skip_id}


@router.delete("/deal-of-the-day/skips/by-date/{featured_date}")
async def delete_deal_skip_history_by_date(
    featured_date: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: delete all skip entries for a specific date (YYYY-MM-DD)."""
    try:
        date_obj = datetime.strptime(featured_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    result = await db.execute(
        select(DailyFeaturedDealSkip).where(DailyFeaturedDealSkip.featured_date == date_obj)
    )
    entries = result.scalars().all()

    for entry in entries:
        await db.delete(entry)

    await _audit_log(
        db,
        actor=current_user.username,
        action="skip_history_bulk_delete",
        target_type="daily_featured_deal_skip",
        target_value=featured_date,
        details={"count": len(entries)},
    )
    await db.commit()
    return {"ok": True, "deleted_count": len(entries), "date": featured_date}


@router.get("/deal-of-the-day/config")
async def get_featured_config_admin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    _ = current_user
    return await _featured_config(db)


@router.patch("/deal-of-the-day/config")
async def update_featured_config_admin(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    min_rating = float(payload.get("min_deal_rating", 5.0))
    min_price = float(payload.get("min_sale_price", 1.0))
    exclude_days = int(payload.get("exclude_days", 30))
    image_retry_count = int(payload.get("image_retry_count", 10))

    await _set_site_setting(db, FEATURED_MIN_DEAL_RATING_KEY, str(min_rating))
    await _set_site_setting(db, FEATURED_MIN_SALE_PRICE_KEY, str(min_price))
    await _set_site_setting(db, FEATURED_EXCLUDE_DAYS_KEY, str(exclude_days))
    await _set_site_setting(db, FEATURED_IMAGE_RETRY_KEY, str(image_retry_count))
    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_config_update",
        target_type="site_setting",
        details={
            "min_deal_rating": min_rating,
            "min_sale_price": min_price,
            "exclude_days": exclude_days,
            "image_retry_count": image_retry_count,
        },
    )
    await db.commit()
    return await _featured_config(db)


@router.post("/deal-of-the-day/manual")
async def set_manual_featured_deal(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    from app.services.cheapshark_service import get_trending_deals

    steam_appid = str(payload.get("steam_appid", "")).strip()
    if not steam_appid or not steam_appid.isdigit():
        raise HTTPException(status_code=400, detail="Valid steam_appid is required")

    today = datetime.now(timezone.utc).date()
    deals = await get_trending_deals(page=0, limit=250, apply_quality_filter=False)
    selected = next((d for d in deals if str(d.get("steam_appid", "")) == steam_appid), None)
    if not selected:
        # Fallback: use existing DB data or fetch fresh data for this appid.
        game = None
        try:
            game = await upsert_game_and_prices(db, steam_appid, include_key_resellers=False)
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            game = None

        if game is None:
            game_result = await db.execute(
                select(Game)
                .where(Game.steam_appid == steam_appid)
                .options(selectinload(Game.prices))
            )
            game = game_result.scalar_one_or_none()
        else:
            game_result = await db.execute(
                select(Game)
                .where(Game.id == game.id)
                .options(selectinload(Game.prices))
            )
            game = game_result.scalar_one_or_none()

        if game is None:
            raise HTTPException(status_code=404, detail="Game/appid not found")

        prices = list(game.prices or [])
        prices_with_sale = [p for p in prices if p.sale_price is not None]
        if prices_with_sale:
            best_price = min(prices_with_sale, key=lambda p: float(p.sale_price or 0))
        else:
            prices_with_regular = [p for p in prices if p.regular_price is not None]
            best_price = min(prices_with_regular, key=lambda p: float(p.regular_price or 0)) if prices_with_regular else None

        sale_price = float(best_price.sale_price or best_price.regular_price or 0) if best_price else 0.0
        regular_price = float(best_price.regular_price or sale_price or 0) if best_price else 0.0
        discount_percent = int(best_price.discount_percent or 0) if best_price else 0

        selected = {
            "steam_appid": str(game.steam_appid),
            "name": str(game.name or "Unknown Game"),
            "sale_price": sale_price,
            "regular_price": regular_price,
            "discount_percent": discount_percent,
            "store_name": str(best_price.store_name) if best_price and best_price.store_name else "Unknown",
            "header_image": str(game.header_image or ""),
            "deal_rating": 0.0,
            "url": str(best_price.url) if best_price and best_price.url else None,
        }

    existing_result = await db.execute(
        select(DailyFeaturedDeal).where(DailyFeaturedDeal.featured_date == today)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        existing.steam_appid = str(selected.get("steam_appid", ""))
        existing.name = str(selected.get("name", ""))
        existing.sale_price = float(selected.get("sale_price", 0) or 0)
        existing.regular_price = float(selected.get("regular_price", 0) or 0)
        existing.discount_percent = int(selected.get("discount_percent", 0) or 0)
        existing.store_name = str(selected.get("store_name", "Steam"))
        existing.header_image = str(selected.get("header_image", ""))
        existing.deal_rating = float(selected.get("deal_rating", 0) or 0)
        existing.url = selected.get("url")
        snapshot = existing
    else:
        snapshot = DailyFeaturedDeal(
            featured_date=today,
            steam_appid=str(selected.get("steam_appid", "")),
            name=str(selected.get("name", "")),
            sale_price=float(selected.get("sale_price", 0) or 0),
            regular_price=float(selected.get("regular_price", 0) or 0),
            discount_percent=int(selected.get("discount_percent", 0) or 0),
            store_name=str(selected.get("store_name", "Steam")),
            header_image=str(selected.get("header_image", "")),
            deal_rating=float(selected.get("deal_rating", 0) or 0),
            url=selected.get("url"),
        )
        db.add(snapshot)
    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_manual_override",
        target_type="deal_of_the_day",
        target_value=steam_appid,
        details={"date": today.isoformat()},
    )
    await db.commit()
    await db.refresh(snapshot)
    return _daily_featured_deal_to_dict(snapshot)


@router.get("/deal-of-the-day/history")
async def get_featured_deal_history(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin-only: return featured deal history from daily_featured_deals table."""
    _ = current_user

    result = await db.execute(
        select(DailyFeaturedDeal)
        .order_by(DailyFeaturedDeal.featured_date.desc(), DailyFeaturedDeal.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()

    items = [
        {
            "id": row.id,
            "featured_date": row.featured_date.isoformat() if row.featured_date else None,
            "steam_appid": row.steam_appid,
            "name": row.name,
            "sale_price": row.sale_price,
            "regular_price": row.regular_price,
            "discount_percent": row.discount_percent,
            "store_name": row.store_name,
            "header_image": row.header_image,
            "deal_rating": row.deal_rating,
            "url": row.url,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]

    return {
        "count": len(items),
        "items": items,
    }


@router.get("/deal-of-the-day/queue")
async def get_featured_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    _ = current_user
    result = await db.execute(
        select(FeaturedQueueItem).order_by(FeaturedQueueItem.position.asc(), FeaturedQueueItem.created_at.asc())
    )
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": item.id,
                "steam_appid": item.steam_appid,
                "note": item.note,
                "position": item.position,
                "consumed_at": item.consumed_at.isoformat() if item.consumed_at else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
    }


@router.post("/deal-of-the-day/queue")
async def add_featured_queue_item(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    steam_appid = str(payload.get("steam_appid", "")).strip()
    if not steam_appid or not steam_appid.isdigit():
        raise HTTPException(status_code=400, detail="Valid steam_appid is required")
    note = payload.get("note")

    max_position_result = await db.execute(select(func.max(FeaturedQueueItem.position)))
    max_position = max_position_result.scalar_one_or_none() or 0
    item = FeaturedQueueItem(
        steam_appid=steam_appid,
        note=str(note) if note else None,
        position=int(max_position) + 1,
    )
    db.add(item)
    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_queue_add",
        target_type="featured_queue_item",
        target_value=steam_appid,
    )
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "steam_appid": item.steam_appid, "position": item.position}


@router.delete("/deal-of-the-day/queue/{queue_id}")
async def delete_featured_queue_item(
    queue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(FeaturedQueueItem).where(FeaturedQueueItem.id == queue_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    target = str(item.steam_appid)
    await db.delete(item)
    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_queue_delete",
        target_type="featured_queue_item",
        target_value=target,
    )
    await db.commit()
    return {"ok": True, "deleted_id": queue_id}


@router.get("/deal-of-the-day/blacklist")
async def get_featured_blacklist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    _ = current_user
    result = await db.execute(select(FeaturedBlacklistItem).order_by(FeaturedBlacklistItem.created_at.desc()))
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": item.id,
                "steam_appid": item.steam_appid,
                "reason": item.reason,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
                "is_active": item.is_active,
            }
            for item in items
        ],
    }


@router.post("/deal-of-the-day/blacklist")
async def add_featured_blacklist_item(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    steam_appid = str(payload.get("steam_appid", "")).strip()
    if not steam_appid or not steam_appid.isdigit():
        raise HTTPException(status_code=400, detail="Valid steam_appid is required")

    reason = payload.get("reason")
    expires_days = payload.get("expires_in_days")
    expires_at = None
    if expires_days is not None:
        expires_at = _utcnow_naive() + timedelta(days=int(expires_days))

    existing_result = await db.execute(
        select(FeaturedBlacklistItem).where(FeaturedBlacklistItem.steam_appid == steam_appid)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        existing.reason = str(reason) if reason else existing.reason
        existing.expires_at = expires_at
        existing.is_active = True
        item = existing
    else:
        item = FeaturedBlacklistItem(
            steam_appid=steam_appid,
            reason=str(reason) if reason else None,
            expires_at=expires_at,
            is_active=True,
        )
        db.add(item)

    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_blacklist_upsert",
        target_type="featured_blacklist_item",
        target_value=steam_appid,
        details={"expires_in_days": expires_days},
    )
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "steam_appid": item.steam_appid, "is_active": item.is_active}


@router.delete("/deal-of-the-day/blacklist/{item_id}")
async def delete_featured_blacklist_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(FeaturedBlacklistItem).where(FeaturedBlacklistItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Blacklist item not found")
    target = str(item.steam_appid)
    await db.delete(item)
    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_blacklist_delete",
        target_type="featured_blacklist_item",
        target_value=target,
    )
    await db.commit()
    return {"ok": True, "deleted_id": item_id}


@router.get("/deal-of-the-day/whitelist")
async def get_featured_whitelist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    _ = current_user
    result = await db.execute(select(FeaturedWhitelistItem).order_by(FeaturedWhitelistItem.created_at.desc()))
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": item.id,
                "steam_appid": item.steam_appid,
                "boost": item.boost,
                "is_active": item.is_active,
            }
            for item in items
        ],
    }


@router.post("/deal-of-the-day/whitelist")
async def add_featured_whitelist_item(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    steam_appid = str(payload.get("steam_appid", "")).strip()
    if not steam_appid or not steam_appid.isdigit():
        raise HTTPException(status_code=400, detail="Valid steam_appid is required")

    boost = max(1, int(payload.get("boost", 3)))
    existing_result = await db.execute(
        select(FeaturedWhitelistItem).where(FeaturedWhitelistItem.steam_appid == steam_appid)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        existing.boost = boost
        existing.is_active = True
        item = existing
    else:
        item = FeaturedWhitelistItem(steam_appid=steam_appid, boost=boost, is_active=True)
        db.add(item)

    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_whitelist_upsert",
        target_type="featured_whitelist_item",
        target_value=steam_appid,
        details={"boost": boost},
    )
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "steam_appid": item.steam_appid, "boost": item.boost}


@router.delete("/deal-of-the-day/whitelist/{item_id}")
async def delete_featured_whitelist_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    result = await db.execute(select(FeaturedWhitelistItem).where(FeaturedWhitelistItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Whitelist item not found")
    target = str(item.steam_appid)
    await db.delete(item)
    await _audit_log(
        db,
        actor=current_user.username,
        action="featured_whitelist_delete",
        target_type="featured_whitelist_item",
        target_value=target,
    )
    await db.commit()
    return {"ok": True, "deleted_id": item_id}


@router.get("/admin/audit")
async def get_admin_audit_log(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    _ = current_user
    result = await db.execute(select(AdminAuditLog).order_by(desc(AdminAuditLog.created_at)).limit(limit))
    rows = result.scalars().all()
    return {
        "count": len(rows),
        "items": [
            {
                "id": row.id,
                "actor_username": row.actor_username,
                "action": row.action,
                "target_type": row.target_type,
                "target_value": row.target_value,
                "details": row.details,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@router.get("/admin/health")
async def get_admin_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    _ = current_user
    today = datetime.now(timezone.utc).date()
    today_skip_count_result = await db.execute(
        select(func.count(DailyFeaturedDealSkip.id)).where(DailyFeaturedDealSkip.featured_date == today)
    )
    queue_pending_result = await db.execute(
        select(func.count(FeaturedQueueItem.id)).where(FeaturedQueueItem.consumed_at.is_(None))
    )
    blacklist_active_result = await db.execute(
        select(func.count(FeaturedBlacklistItem.id)).where(FeaturedBlacklistItem.is_active == True)
    )
    whitelist_active_result = await db.execute(
        select(func.count(FeaturedWhitelistItem.id)).where(FeaturedWhitelistItem.is_active == True)
    )
    users_result = await db.execute(select(func.count(User.id)))

    return {
        "today": today.isoformat(),
        "today_skip_count": int(today_skip_count_result.scalar_one() or 0),
        "queue_pending": int(queue_pending_result.scalar_one() or 0),
        "blacklist_active": int(blacklist_active_result.scalar_one() or 0),
        "whitelist_active": int(whitelist_active_result.scalar_one() or 0),
        "user_count": int(users_result.scalar_one() or 0),
    }


@router.get("/deals")
async def get_deals(
    page: int = 0,
    limit: int = 20,
):
    """Get trending deals from CheapShark (fresh, paginated, sorted by deal quality)."""
    from app.services.cheapshark_service import get_trending_deals
    return await get_trending_deals(page, limit, apply_quality_filter=True)


@router.get("/free")
async def get_free_games_route(limit: int = 50):
    """
    Get currently free games from various stores.
    Returns games that are free to play or temporarily free.

    Query params:
        limit: Maximum number of results (default: 50)
    """
    from app.services.cheapshark_service import get_free_games
    return await get_free_games(limit)


@router.get("/{steam_appid}", response_model=GameOut)
async def get_game(
    steam_appid: str,
    refresh: bool = False,
    include_key_resellers: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Get a game with all prices. Fetches from APIs if not in DB or refresh=true.

    Args:
        steam_appid: Steam application ID
        refresh: Force refresh from APIs
        include_key_resellers: Include key reseller prices (slower, opt-in)
    """
    # Check in-memory cache first for non-refresh requests
    from app.services import cache as _cache
    cache_key = f"game_full:{steam_appid}:kr:{int(include_key_resellers)}"
    if not refresh:
        cached = _cache.get(cache_key, ttl=900)  # 15 min cache
        if cached is not None:
            return cached

    game = None
    try:
        result = await db.execute(
            select(Game)
            .where(Game.steam_appid == steam_appid)
            .options(selectinload(Game.prices))
        )
        game = result.scalar_one_or_none()
    except Exception:
        game = None

    if game is None or refresh:
        try:
            game = await upsert_game_and_prices(db, steam_appid, include_key_resellers)
            if game is None:
                raise HTTPException(status_code=404, detail="Game not found")
            # Reload with prices eagerly loaded
            result = await db.execute(
                select(Game)
                .where(Game.id == game.id)
                .options(selectinload(Game.prices))
            )
            game = result.scalar_one_or_none()
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Persist Error] Could not save {steam_appid}: {e}")
            try:
                await db.rollback()
            except Exception:
                pass
            # DB unavailable – fetch directly from APIs and return without persisting
            from app.services.price_aggregator import fetch_all_prices
            data = await fetch_all_prices(steam_appid, include_key_resellers)
            steam_data = data.get("steam_data")
            if not steam_data:
                raise HTTPException(status_code=404, detail="Game not found")
            prices_out = [
                _safe_price_payload(p)
                for p in data.get("prices", [])
            ]
            best = data.get("best_price")
            from app.models.schemas import GameOut as GameOutSchema, GamePriceOut
            out = GameOutSchema(
                id=0,
                steam_appid=steam_appid,
                name=steam_data.get("name", ""),
                header_image=steam_data.get("header_image"),
                short_description=steam_data.get("short_description"),
                genres=steam_data.get("genres"),
                developers=steam_data.get("developers"),
                publishers=steam_data.get("publishers"),
                release_date=steam_data.get("release_date"),
                steam_url=steam_data.get("steam_url"),
                prices=[GamePriceOut(**p) for p in prices_out],
                best_price=best.get("sale_price") or best.get("regular_price") if best else None,
                best_store=best.get("store_name") if best else None,
            )
            _cache.set(cache_key, out, ttl=900)
            return out

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    result = _enrich_game(game)
    _cache.set(cache_key, result, ttl=900)
    return result


@router.get("/{steam_appid}/history", response_model=List[PriceHistoryPoint])
async def get_price_history_route(
    steam_appid: str,
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a game – from DB + ITAD."""
    db_history = []
    try:
        result = await db.execute(select(Game).where(Game.steam_appid == steam_appid))
        game = result.scalar_one_or_none()
        if game:
            hist_result = await db.execute(
                select(PriceHistory)
                .where(PriceHistory.game_id == game.id)
                .order_by(PriceHistory.recorded_at.asc())
            )
            db_history = hist_result.scalars().all()
    except Exception:
        db_history = []

    # Also fetch from ITAD for richer history
    itad_history = await get_price_history(steam_appid)

    combined = [PriceHistoryPoint.model_validate(h) for h in db_history]

    for h in itad_history:
        from datetime import datetime
        try:
            recorded = datetime.fromisoformat(h["recorded_at"].replace("Z", "+00:00"))
        except Exception:
            recorded = datetime.utcnow()
        combined.append(
            PriceHistoryPoint(
                store_name=h["store_name"],
                price=h["price"],
                regular_price=h.get("regular_price"),
                discount_percent=h.get("discount_percent", 0),
                currency=h.get("currency", "USD"),
                recorded_at=recorded,
            )
        )

    from datetime import timezone

    def _sort_key(point: PriceHistoryPoint):
        recorded_at = point.recorded_at
        if recorded_at.tzinfo is None:
            return recorded_at.replace(tzinfo=timezone.utc)
        return recorded_at.astimezone(timezone.utc)

    return sorted(combined, key=_sort_key)


@router.get("/{steam_appid}/dlc-deals", response_model=List[dict])
async def get_dlc_deals_route(steam_appid: str):
    """Get on-sale DLC for a game (no DB needed, live from Steam + ITAD)."""
    try:
        return await get_dlc_deals_for_game(steam_appid)
    except Exception:
        return []


@router.get("/{steam_appid}/media")
async def get_game_media(steam_appid: str):
    """Get screenshot/media assets from the Steam store page."""
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=8.0),
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/json,text/plain,*/*",
            },
        ) as client:
            resp = await client.get(
                "https://store.steampowered.com/api/appdetails",
                params={"appids": steam_appid, "l": "english", "cc": "NL"},
            )
            resp.raise_for_status()
            data = resp.json().get(str(steam_appid), {})

        if not data.get("success"):
            print(f"[media] Steam appdetails returned success=false for {steam_appid}")
            return {"screenshots": [], "trailers": []}

        app_data = data.get("data", {})
        screenshots = []
        for shot in app_data.get("screenshots", []):
            full = shot.get("path_full")
            thumb = shot.get("path_thumbnail")
            if full:
                screenshots.append({"full": full, "thumb": thumb or full})

        trailers = []
        for movie in app_data.get("movies", []):
            try:
                thumb = movie.get("thumbnail")
                mp4 = (movie.get("mp4") or {}).get("max") or (movie.get("mp4") or {}).get("480")
                webm = (movie.get("webm") or {}).get("max") or (movie.get("webm") or {}).get("480")

                movie_id = _extract_steam_movie_id(movie)
                if not mp4 and movie_id:
                    mp4 = _steam_movie_mp4_url(movie_id)

                highlight = movie.get("highlight")
                steam_url = None
                if isinstance(highlight, dict):
                    steam_url = highlight.get("mp4") or highlight.get("webm")
                elif isinstance(highlight, str):
                    steam_url = highlight

                if thumb or mp4 or webm:
                    trailers.append({
                        "name": movie.get("name") or "Steam trailer",
                        "thumbnail": thumb,
                        "mp4": mp4,
                        "webm": webm,
                        "steam_url": steam_url,
                    })
            except Exception:
                # Never fail the whole endpoint on one malformed movie payload.
                continue

        return {
            "screenshots": screenshots[:12],
            "trailers": trailers[:6],
        }
    except Exception as e:
        print(f"[media] Failed to fetch media for {steam_appid}: {e}")
        return {"screenshots": [], "trailers": []}


def _enrich_game(game: Game) -> GameOut:
    """Add computed best_price/best_store fields."""
    prices = game.prices or []
    valid = [p for p in prices if (p.sale_price or p.regular_price)]
    best_price = None
    best_store = None
    if valid:
        best = min(valid, key=lambda x: x.sale_price or x.regular_price or 999)
        best_price = best.sale_price or best.regular_price
        best_store = best.store_name

    try:
        out = GameOut.model_validate(game)
    except Exception:
        price_models = []
        for price in prices:
            price_models.append(GamePriceOut(**_safe_price_payload({
                "store_name": getattr(price, "store_name", None),
                "store_id": getattr(price, "store_id", None),
                "regular_price": getattr(price, "regular_price", None),
                "sale_price": getattr(price, "sale_price", None),
                "discount_percent": getattr(price, "discount_percent", 0),
                "currency": getattr(price, "currency", "EUR"),
                "url": getattr(price, "url", None),
                "is_on_sale": getattr(price, "is_on_sale", False),
                "lowest_ever_price": getattr(price, "lowest_ever_price", None),
                "lowest_ever_currency": getattr(price, "lowest_ever_currency", None),
                "is_all_time_low": getattr(price, "is_all_time_low", False),
            })))

        out = GameOut(
            id=game.id,
            steam_appid=game.steam_appid,
            name=game.name,
            header_image=game.header_image,
            short_description=game.short_description,
            genres=game.genres,
            developers=game.developers,
            publishers=game.publishers,
            release_date=game.release_date,
            steam_url=game.steam_url,
            prices=price_models,
            historic_low_price=game.historic_low_price,
            historic_low_date=game.historic_low_date,
            metacritic_score=game.metacritic_score,
            steam_review_score=game.steam_review_score,
            steam_review_count=game.steam_review_count,
            player_count_current=game.player_count_current,
            player_count_peak=game.player_count_peak,
        )
    out.best_price = best_price
    out.best_store = best_store
    return out
