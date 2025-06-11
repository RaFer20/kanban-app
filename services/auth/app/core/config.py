from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables or a .env file.
    """
    project_name: str = "Auth Service"
    env: str = "dev"
    debug: bool = True

    database_url: str  # Async URL (used by app via SQLAlchemy+asyncpg)
    database_url_sync: str  # Sync URL (used by Alembic)

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_minutes: int = 60 * 24 * 7  # Default: 7 days

    class Config:
        env_file = (
            ".env.docker"
            if os.getenv("ENV", "local") == "docker"
            else ".env"
        )
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore
