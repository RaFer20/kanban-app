"""
Database session and engine setup for the Auth Service.

Defines the async SQLAlchemy engine and session factory, and provides a dependency for obtaining a database session.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from collections.abc import AsyncGenerator

from app.core.config import get_settings

settings = get_settings()

# Create the async SQLAlchemy engine
engine = create_async_engine(settings.database_url, echo=settings.debug)

# Create a session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides an async database session.

    Yields:
        AsyncSession: An active SQLAlchemy async session.
    """
    async with AsyncSessionLocal() as session:
        yield session
