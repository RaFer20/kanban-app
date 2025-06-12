from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import routes
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.seeds import create_guest_user_if_not_exists

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up the app and seeding guest user if needed...")
    async with AsyncSessionLocal() as db:
        await create_guest_user_if_not_exists(db)
    yield
    print("Shutting down the app...")

app = FastAPI(title=settings.project_name, lifespan=lifespan)

# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for testing only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api/v1")

print("Running with settings:", settings.project_name)