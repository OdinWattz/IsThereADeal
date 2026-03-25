from pydantic_settings import BaseSettings
from typing import List
import os


def _default_database_url() -> str:
    """Choose a safe database default per environment."""
    explicit_url = os.environ.get("DATABASE_URL")
    if explicit_url:
        return explicit_url

    vercel_postgres_url = os.environ.get("POSTGRES_URL")
    if vercel_postgres_url:
        return vercel_postgres_url

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

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
