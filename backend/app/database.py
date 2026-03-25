from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


def _build_url(url: str) -> str:
    """
    Vercel Postgres geeft een postgres:// of postgresql:// URL.
    SQLAlchemy async heeft postgresql+asyncpg:// nodig.
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Base(DeclarativeBase):
    pass


# Lazy engine – aangemaakt bij eerste gebruik, niet bij module-import.
# Zo crasht Vercel niet als env vars nog niet geladen zijn.
_engine = None
_session_factory = None


def _get_engine():
    global _engine, _session_factory
    if _engine is None:
        url = _build_url(settings.DATABASE_URL)
        _is_sqlite = "sqlite" in url
        # Supabase uses PgBouncer pooler – statement cache must be disabled.
        _connect_args = {"check_same_thread": False} if _is_sqlite else {"statement_cache_size": 0}
        _engine = create_async_engine(
            url,
            echo=settings.APP_ENV == "development",
            connect_args=_connect_args,
        )
        _session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _engine, _session_factory


async def get_db():
    _, factory = _get_engine()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    engine, _ = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
