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
    metacritic_score: Optional[int] = None
    steam_review_score: Optional[int] = None
    steam_review_count: Optional[int] = None
    player_count_current: Optional[int] = None
    player_count_peak: Optional[int] = None

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


# ── Collections ───────────────────────────────────────────────────────────────

class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_public: bool = False


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_public: Optional[bool] = None


class CollectionItemAdd(BaseModel):
    game_id: Optional[int] = None
    steam_appid: Optional[str] = None
    notes: Optional[str] = None


class CollectionItemOut(BaseModel):
    id: int
    game_id: int
    added_at: datetime
    notes: Optional[str] = None
    game: GameOut

    class Config:
        from_attributes = True


class CollectionOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    items: List[CollectionItemOut] = []

    class Config:
        from_attributes = True


# ── Followed Games ────────────────────────────────────────────────────────────

class FollowedGameCreate(BaseModel):
    game_id: Optional[int] = None
    steam_appid: Optional[str] = None
    notify_on_sale: bool = True
    notify_on_release: bool = False


class FollowedGameOut(BaseModel):
    id: int
    game_id: int
    followed_at: datetime
    notify_on_sale: bool
    notify_on_release: bool
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
