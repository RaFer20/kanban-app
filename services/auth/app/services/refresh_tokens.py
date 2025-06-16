from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.refresh_token import RefreshToken


async def create_refresh_token(
    db: AsyncSession, jti: str, user_id: int, expires_at: datetime
) -> RefreshToken:
    new_token = RefreshToken(
        jti=jti,
        user_id=user_id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(new_token)
    await db.flush()
    return new_token


async def deactivate_refresh_token(db, jti: str):
    from app.models.refresh_token import RefreshToken
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == jti)
    )
    token = result.scalar_one_or_none()
    if token:
        token.is_active = False
        db.add(token)


async def is_refresh_token_valid(db: AsyncSession, jti: str) -> bool:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.is_active == True,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none() is not None


async def get_all_valid_refresh_tokens_for_user(db, user_id: int):
    from app.models.refresh_token import RefreshToken

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_active == True,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalars().all()


async def get_refresh_token_from_db(db, jti: str, user_id: int):
    from app.models.refresh_token import RefreshToken

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
