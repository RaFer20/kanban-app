"""
Main entrypoint for the Auth Service FastAPI application.

- Sets up the FastAPI app with CORS middleware and API routes.
- Seeds a guest user on startup if needed.
- Configures logging and application lifespan events.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import routes
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.seeds import create_guest_user_if_not_exists
import time
import logging

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[{time.strftime('%X')}] Starting up the app and seeding guest user if needed...")
    async with AsyncSessionLocal() as db:
        await create_guest_user_if_not_exists(db)
    yield
    print(f"[{time.strftime('%X')}] Shutting down the app...")

app = FastAPI(title=settings.project_name, lifespan=lifespan)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
)

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