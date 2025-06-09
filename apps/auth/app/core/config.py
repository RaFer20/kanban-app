from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables or a .env file.

    Attributes:
        project_name (str): Name of the project.
        env (str): Environment name (e.g., 'dev', 'prod').
        debug (bool): Debug mode flag.
        database_url (str): Async database URL for SQLAlchemy+asyncpg.
        database_url_sync (str): Sync database URL for Alembic migrations.
        secret_key (str): Secret key for cryptographic operations.
        algorithm (str): Algorithm used for token encoding.
        access_token_expire_minutes (int): Access token expiration time in minutes.
        refresh_token_expire_minutes (int): Refresh token expiration time in minutes (default: 7 days).
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
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings() # type: ignore
