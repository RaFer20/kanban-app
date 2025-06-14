from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import EmailStr, Field
import os

class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables or a .env file.
    """
    project_name: str = "Auth Service"
    env: str = "dev"
    debug: bool = True

    # Database URLs
    database_url: str  # Async URL (used by app via SQLAlchemy+asyncpg)
    database_url_sync: str  # Sync URL (used by Alembic)

    # Optional: used in wait-for-postgres or logging
    db_host: str = Field(default="localhost")
    db_port: str = Field(default="5432")

    # JWT config
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_minutes: int = 60 * 24 * 7  # Default: 7 days

    # Guest user credentials
    guest_email: EmailStr = "guest@example.com"
    guest_password: str = "guest123"

    model_config = SettingsConfigDict(
        env_file=".env.docker" if os.getenv("ENV", "local") == "docker" else ".env",
        env_file_encoding="utf-8",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings() # type: ignore
