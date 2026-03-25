from pydantic_settings import BaseSettings
from typing import List
import os


def _default_database_url() -> str:
    """Choose a safe database default per environment."""
    explicit_url = os.environ.get("DATABASE_URL")
    if explicit_url:
        return explicit_url

    # Supabase Vercel integration sets POSTGRES_URL with the correct pooler URL
    # (including the right port 6543 and SSL). Use this before building from parts.
    vercel_postgres_url = os.environ.get("POSTGRES_URL")
    if vercel_postgres_url:
        return vercel_postgres_url

    # Fallback: build from individual POSTGRES_* vars (also set by Supabase).
    pg_host = os.environ.get("POSTGRES_HOST")
    pg_user = os.environ.get("POSTGRES_USER")
    pg_password = os.environ.get("POSTGRES_PASSWORD")
    pg_database = os.environ.get("POSTGRES_DATABASE", "postgres")
    pg_port = os.environ.get("POSTGRES_PORT", "5432")
    if pg_host and pg_user and pg_password:
        return f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"

    # Vercel filesystem is read-only except /tmp; keep local default unchanged.
    if os.environ.get("VERCEL") == "1":
        return "sqlite+aiosqlite:////tmp/gamedeals.db"

    return "sqlite+aiosqlite:///./gamedeals.db"


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Vercel Postgres zet POSTGRES_URL automatisch in de omgeving.
    # DATABASE_URL heeft voorrang; anders valt hij terug op POSTGRES_URL,
    # en daarna op lokale SQLite.
    DATABASE_URL: str = _default_database_url()

    STEAM_API_KEY: str = ""
    ITAD_API_KEY: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    # Secret used to authenticate the /api/alerts/run-check cron endpoint.
    # Vercel sets this automatically for cron jobs via Authorization: Bearer header.
    CRON_SECRET: str = ""

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

        # Automatically include the Vercel deployment URL so CORS works
        # without having to manually configure CORS_ORIGINS in the dashboard.
        for env_var in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_BRANCH_URL"):
            vercel_url = os.environ.get(env_var)
            if vercel_url:
                # Vercel sets these without the scheme
                origin = vercel_url if vercel_url.startswith("http") else f"https://{vercel_url}"
                if origin not in origins:
                    origins.append(origin)

        if "*" in origins:
            return ["*"]
        return origins

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
