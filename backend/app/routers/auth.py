from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import User
from app.models.schemas import UserCreate, UserLogin, UserOut, Token, UserUpdate, PasswordChange, DeleteAccount
from app.auth import hash_password, verify_password, create_access_token, get_current_user, get_admin_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    from app.services.cache import check_rate_limit
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    if check_rate_limit(f"register:{ip}", limit=5, window=600):  # 5 registrations per 10 min per IP
        raise HTTPException(status_code=429, detail="Te veel registratiepogingen, probeer het later opnieuw")

    try:
        # Check duplicates
        existing = await db.execute(
            select(User).where(
                (func.lower(User.username) == payload.username.lower())
                | (func.lower(User.email) == payload.email.lower())
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Could not create account")

        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=hash_password(payload.password),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    from app.services.cache import check_rate_limit
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    if check_rate_limit(f"login:{ip}", limit=10, window=60):  # 10 attempts per minute per IP
        raise HTTPException(status_code=429, detail="Te veel inlogpogingen, probeer het later opnieuw")

    try:
        result = await db.execute(select(User).where(User.username == payload.username))
        user = result.scalar_one_or_none()
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id), "fp": user.hashed_password[:12]})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile (username and/or email)."""
    try:
        # Check if username is being updated and if it's unique
        if update.username and update.username != current_user.username:
            result = await db.execute(
                select(User).where(func.lower(User.username) == update.username.lower())
            )
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = update.username

        # Check if email is being updated and if it's unique
        if update.email and update.email != current_user.email:
            result = await db.execute(
                select(User).where(func.lower(User.email) == update.email.lower())
            )
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already taken")
            current_user.email = update.email

        await db.commit()
        await db.refresh(current_user)
        return current_user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/change-password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password (requires current password verification)."""
    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Hash and update new password
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()

    return {"message": "Password changed successfully. Please log in again."}


@router.delete("/me")
async def delete_account(
    data: DeleteAccount,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete user account (requires password confirmation). Cascade deletes wishlist and alerts."""
    # Verify password before deletion
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect",
        )

    # Delete user (cascade will handle related records)
    await db.delete(current_user)
    await db.commit()

    return {"message": "Account deleted successfully"}


@router.get("/admin/users")
async def list_users_admin(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(limit))
    users = result.scalars().all()
    return {
        "count": len(users),
        "items": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
            for user in users
        ],
    }


@router.patch("/admin/users/{user_id}/active")
async def set_user_active_admin(
    user_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    desired_state = bool(payload.get("is_active", True))
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = desired_state
    await db.commit()
    return {
        "id": user.id,
        "username": user.username,
        "is_active": user.is_active,
    }
