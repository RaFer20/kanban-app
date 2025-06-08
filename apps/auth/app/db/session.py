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


# Dependency that provides a database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
