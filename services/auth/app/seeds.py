from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash
from app.schemas.enums import UserRole
import os

async def create_guest_user_if_not_exists(db: AsyncSession):
    """
    Seed a guest/demo user if one doesn't already exist.
    Uses email and password from environment variables or defaults.
    """
    guest_email = os.getenv("GUEST_EMAIL", "guest@example.com")
    guest_password = os.getenv("GUEST_PASSWORD", "guest123")  # Should be in .env
    guest_role = UserRole.guest

    # Check if guest user already exists
    result = await db.execute(select(User).where(User.email == guest_email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Hash the guest password before storing
        hashed_password = get_password_hash(guest_password)
        new_user = User(
            email=guest_email,
            hashed_password=hashed_password,
            role=guest_role
        )
        db.add(new_user)
        await db.commit()
        print("Guest user seeded.")
    else:
        print("Guest user already exists.")