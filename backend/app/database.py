from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from urllib.parse import urlparse, urlunparse
import asyncpg
from app.config import settings


def _strip_query(url: str) -> str:
    """Convert postgres:// → postgresql+asyncpg:// and strip all libpq query params."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    parsed = urlparse(url)
    return urlunparse(parsed._replace(query=""))


class Base(DeclarativeBase):
    pass


# Lazy engine – aangemaakt bij eerste gebruik, niet bij module-import.
_engine = None
_session_factory = None
_tables_created = False


def _get_engine():
    global _engine, _session_factory
    if _engine is None:
        raw_url = settings.DATABASE_URL
        _is_sqlite = "sqlite" in raw_url
        if _is_sqlite:
            _engine = create_async_engine(
                raw_url,
                echo=settings.APP_ENV == "development",
                connect_args={"check_same_thread": False},
            )
        else:
            url = _strip_query(raw_url)
            p = urlparse(url)
            _host = p.hostname
            # Force port 5432 for direct connection (bypass pgbouncer on 6543)
            # Supabase: 6543 = pgbouncer (incompatible with prepared statements)
            #           5432 = direct connection (supports prepared statements)
            _port = 5432
            _user = p.username
            _password = p.password
            _database = p.path.lstrip("/")

            # ssl="require" (string) = encrypt but skip cert verification,
            # matching libpq sslmode=require. Supabase PgBouncer uses a
            # self-signed CA that Vercel's Python runtime doesn't trust.
            ssl_mode = "require"

            async def _creator():
                return await asyncpg.connect(
                    host=_host,
                    port=_port,
                    user=_user,
                    password=_password,
                    database=_database,
                    ssl=ssl_mode,
                    server_settings={
                        'application_name': 'IsThereADeal'
                    }
                )

            _engine = create_async_engine(
                "postgresql+asyncpg://",
                async_creator=_creator,
                # Serverless-safe: keep DB connections extremely low to avoid
                # Supabase/pgbouncer "max clients reached" under burst traffic.
                pool_size=1,
                max_overflow=0,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=settings.APP_ENV == "development",
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
