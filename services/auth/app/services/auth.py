from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserCreatePublic
from app.core.security import get_password_hash


async def create_user(db: AsyncSession, user_create: UserCreatePublic) -> User:
    hashed_password = get_password_hash(user_create.password)
    db_user = User(
        email=user_create.email,
        hashed_password=hashed_password,
        role="user"  # default role for public user creation
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalar_one_or_none()


async def revoke_refresh_token(db: AsyncSession, user: User) -> None:
    # Deactivate all active refresh tokens for the user
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.is_active == True)
        .values(is_active=False)
    )

    # Clear last valid refresh token ID
    user.last_refresh_jti = None
    db.add(user)

    await db.commit()
    await db.refresh(user)