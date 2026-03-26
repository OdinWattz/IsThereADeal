from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class UserUpdate(BaseModel):
    """Schema for updating user profile (username and/or email)."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """Schema for changing password."""
    current_password: str
    new_password: str = Field(..., min_length=6)


class DeleteAccount(BaseModel):
    """Schema for deleting account."""
    current_password: str


# ── Game ──────────────────────────────────────────────────────────────────────

class GamePriceOut(BaseModel):
    store_name: str
    store_id: Optional[str] = None
    regular_price: Optional[float] = None
    sale_price: Optional[float] = None
    discount_percent: int = 0
    currency: str = "USD"
    url: Optional[str] = None
    is_on_sale: bool = False
    fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GameOut(BaseModel):
    id: int
    steam_appid: str
    name: str
    header_image: Optional[str] = None
    short_description: Optional[str] = None
    genres: Optional[str] = None
    developers: Optional[str] = None
    publishers: Optional[str] = None
    release_date: Optional[str] = None
    steam_url: Optional[str] = None
    prices: List[GamePriceOut] = []
    best_price: Optional[float] = None
    best_store: Optional[str] = None
    historic_low_price: Optional[float] = None
    historic_low_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class PriceHistoryPoint(BaseModel):
    store_name: str
    price: float
    regular_price: Optional[float] = None
    discount_percent: int = 0
    currency: str = "USD"
    recorded_at: datetime

    class Config:
        from_attributes = True


# ── Wishlist ──────────────────────────────────────────────────────────────────

class WishlistItemCreate(BaseModel):
    game_id: Optional[int] = None
    steam_appid: Optional[str] = None
    target_price: Optional[float] = None


class WishlistItemOut(BaseModel):
    id: int
    game_id: int
    added_at: datetime
    target_price: Optional[float] = None
    game: GameOut

    class Config:
        from_attributes = True


# ── Price Alerts ──────────────────────────────────────────────────────────────

class PriceAlertCreate(BaseModel):
    game_id: Optional[int] = None
    steam_appid: Optional[str] = None
    target_price: float
    notify_email: bool = True


class PriceAlertOut(BaseModel):
    id: int
    game_id: int
    target_price: float
    is_active: bool
    created_at: datetime
    triggered_at: Optional[datetime] = None
    notify_email: bool
    game: GameOut

    class Config:
        from_attributes = True


# ── Search ────────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    steam_appid: str
    name: str
    header_image: Optional[str] = None
    is_in_db: bool = False
    game_id: Optional[int] = None
