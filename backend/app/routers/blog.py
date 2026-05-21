from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update
from app.database import get_db
from app.models.models import BlogPost, SiteSetting, User
from app.models.schemas import (
    BlogPostOut,
    BlogPostCreate,
    BlogPostUpdate,
    GuidesVisibilityOut,
    GuidesVisibilityUpdate,
)
from app.auth import get_current_user, get_admin_user
from datetime import datetime, timezone
import asyncio
import logging

router = APIRouter(prefix="/api/blog", tags=["blog"])
_blog_seed_lock = asyncio.Lock()
_blog_seed_checked = False
GUIDES_VISIBILITY_KEY = "guides_enabled"


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _ensure_default_blog_posts(db: AsyncSession):
    global _blog_seed_checked
    if _blog_seed_checked:
        return

    async with _blog_seed_lock:
        if _blog_seed_checked:
            return
        try:
            from seed_blog_posts import seed_blog_posts
            await seed_blog_posts(db=db, quiet=True)
            _blog_seed_checked = True
        except Exception as e:
            logging.getLogger(__name__).warning("default blog seed fallback failed: %s", e)


@router.get("", response_model=list[BlogPostOut])
async def list_posts(
    category: str = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List published blog posts"""
    await _ensure_default_blog_posts(db)

    query = select(BlogPost).where(BlogPost.is_published == True).order_by(desc(BlogPost.published_at))
    
    if category:
        query = query.where(BlogPost.category == category)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/categories", response_model=list[str])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all post categories"""
    await _ensure_default_blog_posts(db)

    result = await db.execute(select(BlogPost.category).distinct())
    return result.scalars().all()


@router.get("/visibility", response_model=GuidesVisibilityOut)
async def get_guides_visibility(db: AsyncSession = Depends(get_db)):
    """Public visibility setting for guides/blog navigation button."""
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key == GUIDES_VISIBILITY_KEY)
    )
    setting = result.scalar_one_or_none()

    if not setting:
        return GuidesVisibilityOut(guides_enabled=True)

    return GuidesVisibilityOut(guides_enabled=setting.value.lower() == "true")


@router.patch("/admin/visibility", response_model=GuidesVisibilityOut)
async def set_guides_visibility(
    payload: GuidesVisibilityUpdate,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only toggle for guides/blog navigation visibility."""
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key == GUIDES_VISIBILITY_KEY)
    )
    setting = result.scalar_one_or_none()

    if setting is None:
        setting = SiteSetting(key=GUIDES_VISIBILITY_KEY, value="true" if payload.guides_enabled else "false")
        db.add(setting)
    else:
        setting.value = "true" if payload.guides_enabled else "false"

    await db.commit()
    return GuidesVisibilityOut(guides_enabled=payload.guides_enabled)


@router.get("/admin/posts", response_model=list[BlogPostOut])
async def admin_list_posts(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all blog posts for admin (including unpublished)."""
    await _ensure_default_blog_posts(db)

    result = await db.execute(select(BlogPost).order_by(desc(BlogPost.updated_at), desc(BlogPost.created_at)))
    return result.scalars().all()


@router.get("/{slug}", response_model=BlogPostOut)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    """Get blog post by slug + increment view count"""
    await _ensure_default_blog_posts(db)

    result = await db.execute(
        select(BlogPost).where((BlogPost.slug == slug) & (BlogPost.is_published == True))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment view count
    await db.execute(
        update(BlogPost).where(BlogPost.id == post.id).values(view_count=BlogPost.view_count + 1)
    )
    await db.commit()
    await db.refresh(post)
    
    return post


@router.post("", response_model=BlogPostOut)
async def create_post(
    post: BlogPostCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create blog post (admin only)"""
    # TODO: Add admin role check
    
    new_post = BlogPost(
        **post.dict(),
        author=post.author or current_user.username,
        published_at=utcnow() if post.is_published else None,
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    return new_post


@router.put("/{post_id}", response_model=BlogPostOut)
async def update_post(
    post_id: int,
    post_update: BlogPostUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update blog post (admin only)"""
    result = await db.execute(select(BlogPost).where(BlogPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # TODO: Add admin role check
    
    update_data = post_update.dict(exclude_unset=True)
    if "is_published" in update_data and update_data["is_published"] and not post.published_at:
        update_data["published_at"] = utcnow()
    
    for field, value in update_data.items():
        setattr(post, field, value)
    
    post.updated_at = utcnow()
    await db.commit()
    await db.refresh(post)
    return post


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete blog post (admin only)."""
    result = await db.execute(select(BlogPost).where(BlogPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    await db.delete(post)
    await db.commit()
    return {"message": "Post deleted"}
