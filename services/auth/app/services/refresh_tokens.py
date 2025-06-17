"""
Service functions for managing refresh tokens.

This module provides asynchronous helpers for creating, deactivating, validating,
and retrieving refresh tokens in the authentication system.
"""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.refresh_token import RefreshToken


async def create_refresh_token(
    db: AsyncSession, jti: str, user_id: int, expires_at: datetime
) -> RefreshToken:
    """
    Create and persist a new refresh token for a user.

    Args:
        db (AsyncSession): The database session.
        jti (str): The unique JWT ID for the refresh token.
        user_id (int): The ID of the user to associate the token with.
        expires_at (datetime): The expiration datetime for the token.

    Returns:
        RefreshToken: The newly created refresh token instance.
    """
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
    """
    Deactivate a refresh token by its JTI.

    Args:
        db (AsyncSession): The database session.
        jti (str): The JWT ID of the refresh token to deactivate.
    """
    from app.models.refresh_token import RefreshToken
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == jti)
    )
    token = result.scalar_one_or_none()
    if token:
        token.is_active = False
        db.add(token)


async def is_refresh_token_valid(db: AsyncSession, jti: str) -> bool:
    """
    Check if a refresh token is valid (active and not expired).

    Args:
        db (AsyncSession): The database session.
        jti (str): The JWT ID of the refresh token.

    Returns:
        bool: True if the token is valid, False otherwise.
    """
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.is_active == True,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    return result.scalar_one_or_none() is not None


async def get_all_valid_refresh_tokens_for_user(db, user_id: int):
    """
    Retrieve all valid (active and unexpired) refresh tokens for a user.

    Args:
        db (AsyncSession): The database session.
        user_id (int): The ID of the user.

    Returns:
        list[RefreshToken]: List of valid refresh tokens for the user.
    """
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
    """
    Retrieve a refresh token by its JTI and user ID.

    Args:
        db (AsyncSession): The database session.
        jti (str): The JWT ID of the refresh token.
        user_id (int): The ID of the user.

    Returns:
        RefreshToken | None: The refresh token instance if found, else None.
    """
    from app.models.refresh_token import RefreshToken

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
