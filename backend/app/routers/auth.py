from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import User
from app.models.schemas import UserCreate, UserLogin, UserOut, Token, UserUpdate, PasswordChange
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Check duplicates
        existing = await db.execute(
            select(User).where((User.username == payload.username) | (User.email == payload.email))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username or email already taken")

        user = User(
            username=payload.username,
            email=payload.email,
            hashed_password=hash_password(payload.password),
        )
        db.add(user)
        await db.flush()
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(User).where(User.username == payload.username))
        user = result.scalar_one_or_none()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id)})
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
            result = await db.execute(select(User).where(User.username == update.username))
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = update.username

        # Check if email is being updated and if it's unique
        if update.email and update.email != current_user.email:
            result = await db.execute(select(User).where(User.email == update.email))
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already taken")
            current_user.email = update.email

        await db.flush()
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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
    await db.flush()

    return {"message": "Password changed successfully"}


@router.delete("/me")
async def delete_account(
    current_password: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete user account (requires password confirmation). Cascade deletes wishlist and alerts."""
    # Verify password before deletion
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect",
        )

    # Delete user (cascade will handle related records)
    await db.delete(current_user)
    await db.flush()

    return {"message": "Account deleted successfully"}
