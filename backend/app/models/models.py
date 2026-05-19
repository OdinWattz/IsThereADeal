from sqlalchemy import (
    Column, Index, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    price_alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="user", cascade="all, delete-orphan")


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    steam_appid = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False, index=True)
    header_image = Column(String(1000))
    short_description = Column(Text)
    genres = Column(String(500))
    developers = Column(String(500))
    publishers = Column(String(500))
    release_date = Column(String(50))
    steam_url = Column(String(500))
    last_updated = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Historical low tracking
    historic_low_price = Column(Float, nullable=True)
    historic_low_date = Column(DateTime, nullable=True)

    # Review scores and player data
    metacritic_score = Column(Integer, nullable=True)  # 0-100
    steam_review_score = Column(Integer, nullable=True)  # Positive review percentage
    steam_review_count = Column(Integer, nullable=True)
    player_count_current = Column(Integer, nullable=True)  # Current concurrent players
    player_count_peak = Column(Integer, nullable=True)  # 24h peak

    prices = relationship("GamePrice", back_populates="game", cascade="all, delete-orphan")
    price_history = relationship("PriceHistory", back_populates="game", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="game")
    price_alerts = relationship("PriceAlert", back_populates="game")


class GamePrice(Base):
    """Current prices from all stores"""
    __tablename__ = "game_prices"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    store_name = Column(String(100), nullable=False)
    regular_price = Column(Float)
    sale_price = Column(Float)
    discount_percent = Column(Integer, default=0)
    currency = Column(String(10), default="USD")
    url = Column(String(1000))
    is_on_sale = Column(Boolean, default=False)
    is_key_reseller = Column(Boolean, default=False)
    fetched_at = Column(DateTime, default=utcnow)
    lowest_ever_price = Column(Float, nullable=True)  # All-time low from price history
    lowest_ever_currency = Column(String(10), nullable=True)
    is_all_time_low = Column(Boolean, default=False)  # Current price = all-time low

    game = relationship("Game", back_populates="prices")
    store = relationship("Store")

    __table_args__ = (
        UniqueConstraint("game_id", "store_name", name="uq_game_store"),
        Index("ix_game_price_game_sale", "game_id", "is_on_sale"),
        Index("ix_game_price_discount", "discount_percent"),
        Index("ix_game_price_fetched_at", "fetched_at"),
    )


class PriceHistory(Base):
    """Historical price data for charts"""
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    store_name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    regular_price = Column(Float)
    discount_percent = Column(Integer, default=0)
    currency = Column(String(10), default="USD")
    region = Column(String(10), default="NL")  # For regional pricing tracking
    recorded_at = Column(DateTime, default=utcnow, index=True)

    game = relationship("Game", back_populates="price_history")

    __table_args__ = (
        Index("ix_price_history_game_date", "game_id", "recorded_at"),
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    added_at = Column(DateTime, default=utcnow)
    target_price = Column(Float, nullable=True)  # user's desired price

    user = relationship("User", back_populates="wishlist_items")
    game = relationship("Game", back_populates="wishlist_items")

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="uq_user_game_wishlist"),
    )


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    target_price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    triggered_at = Column(DateTime, nullable=True)
    notify_email = Column(Boolean, default=True)

    user = relationship("User", back_populates="price_alerts")
    game = relationship("Game", back_populates="price_alerts")


class Collection(Base):
    """User-created game collections (e.g., 'Must Play', 'Backlog', 'Favorites')"""
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="collections")
    items = relationship("CollectionItem", back_populates="collection", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_collection_name"),
    )


class CollectionItem(Base):
    """Games within a collection"""
    __tablename__ = "collection_items"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    added_at = Column(DateTime, default=utcnow)
    notes = Column(Text, nullable=True)  # User notes about the game

    collection = relationship("Collection", back_populates="items")
    game = relationship("Game")

    __table_args__ = (
        UniqueConstraint("collection_id", "game_id", name="uq_collection_game"),
    )


class Store(Base):
    """Game stores/resellers"""
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    url = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_official = Column(Boolean, default=True)  # Official store vs key reseller
    is_key_reseller = Column(Boolean, default=False)
    avg_rating = Column(Float, default=0.0)  # 0-5.0
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    reviews = relationship("StoreReview", back_populates="store", cascade="all, delete-orphan")


class StoreReview(Base):
    """User reviews for stores"""
    __tablename__ = "store_reviews"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    store = relationship("Store", back_populates="reviews")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("store_id", "user_id", name="uq_store_user_review"),
    )


class BlogPost(Base):
    """Blog posts and gaming guides"""
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    excerpt = Column(Text, nullable=True)
    content = Column(Text, nullable=False)  # Markdown
    category = Column(String(50), nullable=False)  # 'guide', 'news', 'tutorial'
    author = Column(String(100), default="GameDeals Team")
    featured_image = Column(String(500), nullable=True)
    is_published = Column(Boolean, default=True)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    published_at = Column(DateTime, nullable=True)


class Freebie(Base):
    """Tracks games that are temporarily free (Epic Games Store, Prime Gaming, etc.)"""
    __tablename__ = "freebies"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=True)  # Nullable if game not in DB
    title = Column(String(500), nullable=False)
    source = Column(String(50), nullable=False)  # 'epic', 'prime', 'steam', etc.
    external_id = Column(String(200), nullable=True)  # Epic ID, Prime ID, etc.
    thumbnail_url = Column(String(500), nullable=True)
    original_price = Column(Float, nullable=True)  # Price when not free
    free_url = Column(String(500), nullable=True)
    available_until = Column(DateTime, nullable=True)
    claimed_users_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    game = relationship("Game", foreign_keys=[game_id])

    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_freebie_source_id"),
    )
