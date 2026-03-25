from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase
from urllib.parse import urlparse, urlunparse
from app.config import settings


def _build_url(url: str) -> str:
    """
    Vercel Postgres geeft een postgres:// of postgresql:// URL.
    SQLAlchemy async heeft postgresql+asyncpg:// nodig.
    asyncpg begrijpt geen libpq query params (sslmode, supa, etc.) –
    strip de volledige query string; SSL gaat via connect_args.
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Strip all libpq-style query params; asyncpg rejects them.
    parsed = urlparse(url)
    url = urlunparse(parsed._replace(query=""))

    return url


class Base(DeclarativeBase):
    pass


# Lazy engine – aangemaakt bij eerste gebruik, niet bij module-import.
_engine = None
_session_factory = None
_tables_created = False


def _get_engine():
    global _engine, _session_factory
    if _engine is None:
        url = _build_url(settings.DATABASE_URL)
        _is_sqlite = "sqlite" in url
        if _is_sqlite:
            _connect_args = {"check_same_thread": False}
            _engine = create_async_engine(
                url,
                echo=settings.APP_ENV == "development",
                connect_args=_connect_args,
            )
        else:
            # NullPool: no connection pooling – required for serverless (Vercel) +
            # PgBouncer (Supabase transaction pooler). Each request gets a fresh
            # connection, so DuplicatePreparedStatementError can never occur.
            # statement_cache_size=0 disables asyncpg's prepared-statement cache.
            _engine = create_async_engine(
                url,
                echo=settings.APP_ENV == "development",
                poolclass=NullPool,
                connect_args={"ssl": "require", "statement_cache_size": 0},
            )
        _session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _engine, _session_factory


async def get_db():
    global _tables_created
    engine, factory = _get_engine()
    # Ensure tables exist on first use – works even when lifespan didn't fire (Vercel).
    if not _tables_created:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            _tables_created = True
        except Exception:
            pass  # non-fatal; queries will fail naturally if DB is truly unreachable
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
