from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase
from urllib.parse import urlparse, urlunparse
import asyncpg
import logging
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
                await _ensure_compat_columns(conn)
            _tables_created = True
        except Exception as e:
            logging.getLogger(__name__).warning("DB init/compat failed in get_db: %s", e)
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
        await _ensure_compat_columns(conn)


async def _ensure_compat_columns(conn):
    """Best-effort compatibility for legacy databases missing newer columns."""
    try:
        dialect = conn.dialect.name

        game_columns = {
            "historic_low_price": "FLOAT",
            "historic_low_date": "DATETIME",
            "metacritic_score": "INTEGER",
            "steam_review_score": "INTEGER",
            "steam_review_count": "INTEGER",
            "player_count_current": "INTEGER",
            "player_count_peak": "INTEGER",
        }

        game_columns_pg = {
            "historic_low_price": "DOUBLE PRECISION",
            "historic_low_date": "TIMESTAMP WITHOUT TIME ZONE",
            "metacritic_score": "INTEGER",
            "steam_review_score": "INTEGER",
            "steam_review_count": "INTEGER",
            "player_count_current": "INTEGER",
            "player_count_peak": "INTEGER",
        }

        game_price_columns = {
            "is_key_reseller": "BOOLEAN DEFAULT 0",
            "lowest_ever_price": "FLOAT",
            "lowest_ever_currency": "VARCHAR(10)",
            "is_all_time_low": "BOOLEAN DEFAULT 0",
        }

        game_price_columns_pg = {
            "is_key_reseller": "BOOLEAN DEFAULT FALSE",
            "lowest_ever_price": "DOUBLE PRECISION",
            "lowest_ever_currency": "VARCHAR(10)",
            "is_all_time_low": "BOOLEAN DEFAULT FALSE",
        }

        price_history_columns = {
            "region": "VARCHAR(10) DEFAULT 'NL'",
        }

        if dialect == "sqlite":
            game_rows = await conn.execute(text("PRAGMA table_info('games')"))
            game_existing = {row[1] for row in game_rows.fetchall()}

            for name, sql_type in game_columns.items():
                if name not in game_existing:
                    await conn.execute(text(f"ALTER TABLE games ADD COLUMN {name} {sql_type}"))

            gp_rows = await conn.execute(text("PRAGMA table_info('game_prices')"))
            gp_existing = {row[1] for row in gp_rows.fetchall()}

            for name, sql_type in game_price_columns.items():
                if name not in gp_existing:
                    await conn.execute(text(f"ALTER TABLE game_prices ADD COLUMN {name} {sql_type}"))

            ph_rows = await conn.execute(text("PRAGMA table_info('price_history')"))
            ph_existing = {row[1] for row in ph_rows.fetchall()}

            for name, sql_type in price_history_columns.items():
                if name not in ph_existing:
                    await conn.execute(text(f"ALTER TABLE price_history ADD COLUMN {name} {sql_type}"))
            return

        if dialect in {"postgresql", "postgres"}:
            for name, sql_type in game_columns_pg.items():
                await conn.execute(text(f"ALTER TABLE games ADD COLUMN IF NOT EXISTS {name} {sql_type}"))

            for name, sql_type in game_price_columns_pg.items():
                await conn.execute(text(f"ALTER TABLE game_prices ADD COLUMN IF NOT EXISTS {name} {sql_type}"))

            for name, sql_type in price_history_columns.items():
                await conn.execute(text(f"ALTER TABLE price_history ADD COLUMN IF NOT EXISTS {name} {sql_type}"))
    except Exception as e:
        logging.getLogger(__name__).warning("Compat migration skipped/failed: %s", e)
        # Never block startup for compatibility patching.
        pass


def AsyncSessionLocal():
    """Backward-compatible session factory used by older services."""
    _, factory = _get_engine()
    return factory()
