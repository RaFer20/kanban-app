import os
from dotenv import load_dotenv
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from sqlalchemy.pool import NullPool
from app.db.base import Base
from app.main import app
from app.db.session import get_db
from httpx import AsyncClient, ASGITransport
import os
# Load environment before engine is created

env = os.getenv("ENV", "local")
if env == "docker":
    load_dotenv(".env.test.docker")
else:
    load_dotenv(".env.test")

DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("TEST_DATABASE_URL environment variable is not set")

engine_test = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    poolclass=NullPool,
)
TestingSessionLocal = async_sessionmaker(bind=engine_test, expire_on_commit=False)

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

@pytest_asyncio.fixture
async def db_session(setup_db):
    async with TestingSessionLocal() as session:
        # Clear tables before each test
        await session.execute(text("SET session_replication_role = 'replica';"))
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE;'))
        await session.execute(text("SET session_replication_role = 'origin';"))
        await session.commit()
        yield session

@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
