from fastapi import APIRouter
from .users import router as users_router
from .health import router as health_router

router = APIRouter()

router.include_router(health_router, prefix="", tags=["health"])
router.include_router(users_router, prefix="", tags=["users"])
