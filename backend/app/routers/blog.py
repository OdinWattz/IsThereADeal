from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update
from app.database import get_db
from app.models.models import BlogPost, User
from app.models.schemas import BlogPostOut, BlogPostCreate, BlogPostUpdate
from app.auth import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/blog", tags=["blog"])


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.get("", response_model=list[BlogPostOut])
async def list_posts(
    category: str = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List published blog posts"""
    query = select(BlogPost).where(BlogPost.is_published == True).order_by(desc(BlogPost.published_at))
    
    if category:
        query = query.where(BlogPost.category == category)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/categories", response_model=list[str])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all post categories"""
    result = await db.execute(select(BlogPost.category).distinct())
    return result.scalars().all()


@router.get("/{slug}", response_model=BlogPostOut)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    """Get blog post by slug + increment view count"""
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
