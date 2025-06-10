from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.refresh_token import RefreshToken
from app.models.user import User


async def create_refresh_token(
    db: AsyncSession, token: str, user_id: int, expires_at: datetime
) -> RefreshToken:
    new_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(new_token)
    await db.commit()
    await db.refresh(new_token)
    return new_token


async def deactivate_refresh_token(db: AsyncSession, token: str) -> None:
    result = await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token == token)
        .values(is_active=False)
    )
    await db.commit()


async def is_refresh_token_valid(db: AsyncSession, token: str) -> bool:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == token,
            RefreshToken.is_active == True,
            RefreshToken.expires_at > datetime.now(timezone.utc)
        )
    )
    return result.scalar_one_or_none() is not None
