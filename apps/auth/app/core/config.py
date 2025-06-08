from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    project_name: str = "Auth Service"
    env: str = "dev"
    debug: bool = True

    database_url: str  # Async URL (used by app via SQLAlchemy+asyncpg)
    database_url_sync: str  # Sync URL (used by Alembic)

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings() # type: ignore
