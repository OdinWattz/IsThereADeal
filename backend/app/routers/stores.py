from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.models import Store, StoreReview, User
from app.models.schemas import StoreOut, StoreDetailOut, StoreReviewCreate, StoreReviewOut
from app.auth import get_current_user

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("", response_model=list[StoreOut])
async def list_stores(db: AsyncSession = Depends(get_db)):
    """List all stores with ratings"""
    result = await db.execute(select(Store).order_by(Store.avg_rating.desc()))
    stores = result.scalars().all()
    return stores


@router.get("/{store_id}", response_model=StoreDetailOut)
async def get_store(store_id: int, db: AsyncSession = Depends(get_db)):
    """Get store details with reviews"""
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.post("/{store_id}/reviews", response_model=StoreReviewOut)
async def add_store_review(
    store_id: int,
    review: StoreReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add review to store (1 review per user per store)"""
    # Check if store exists
    store_result = await db.execute(select(Store).where(Store.id == store_id))
    store = store_result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Check if user already reviewed
    existing = await db.execute(
        select(StoreReview).where(
            (StoreReview.store_id == store_id) & (StoreReview.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already reviewed this store")
    
    # Create review
    new_review = StoreReview(
        store_id=store_id,
        user_id=current_user.id,
        rating=review.rating,
        comment=review.comment,
    )
    db.add(new_review)
    
    # Update store rating
    result = await db.execute(
        select(func.avg(StoreReview.rating), func.count(StoreReview.id)).where(
            StoreReview.store_id == store_id
        )
    )
    avg_rating, count = result.one()
    store.avg_rating = float(avg_rating) if avg_rating else 0.0
    store.review_count = count or 0
    
    await db.commit()
    await db.refresh(new_review)
    return new_review


@router.get("/{store_id}/reviews", response_model=list[StoreReviewOut])
async def get_store_reviews(store_id: int, db: AsyncSession = Depends(get_db)):
    """Get all reviews for a store"""
    result = await db.execute(
        select(StoreReview)
        .where(StoreReview.store_id == store_id)
        .order_by(StoreReview.created_at.desc())
    )
    return result.scalars().all()
