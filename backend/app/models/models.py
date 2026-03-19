from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
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

    prices = relationship("GamePrice", back_populates="game", cascade="all, delete-orphan")
    price_history = relationship("PriceHistory", back_populates="game", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="game")
    price_alerts = relationship("PriceAlert", back_populates="game")


class GamePrice(Base):
    """Current prices from all stores"""
    __tablename__ = "game_prices"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    store_name = Column(String(100), nullable=False)
    store_id = Column(String(50))
    regular_price = Column(Float)
    sale_price = Column(Float)
    discount_percent = Column(Integer, default=0)
    currency = Column(String(10), default="USD")
    url = Column(String(1000))
    is_on_sale = Column(Boolean, default=False)
    fetched_at = Column(DateTime, default=utcnow)

    game = relationship("Game", back_populates="prices")

    __table_args__ = (
        UniqueConstraint("game_id", "store_name", name="uq_game_store"),
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
    recorded_at = Column(DateTime, default=utcnow, index=True)

    game = relationship("Game", back_populates="price_history")


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
