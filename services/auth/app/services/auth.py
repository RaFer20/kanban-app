"""
Service functions for user management and refresh token handling.

This module provides asynchronous functions for creating users, retrieving users by email,
and revoking refresh tokens (either a specific token or all tokens for a user).
"""

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserCreatePublic
from app.core.security import get_password_hash


async def create_user(db: AsyncSession, user_create: UserCreatePublic) -> User:
    """
    Create a new user with a hashed password and default role.

    Args:
        db (AsyncSession): The database session.
        user_create (UserCreatePublic): The user creation data.

    Returns:
        User: The created user instance.
    """
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
    """
    Retrieve a user by their email address.

    Args:
        db (AsyncSession): The database session.
        email (str): The user's email address.

    Returns:
        User | None: The user instance if found, otherwise None.
    """
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalar_one_or_none()


async def revoke_refresh_token(
    db: AsyncSession,
    user: User,
    jti: str | None = None,
    clear_jti: bool = True
) -> None:
    """
    Revoke refresh tokens for a user.

    If a JTI is provided, only the specified token is deactivated (used for token misuse/reuse).
    If no JTI is provided, all active tokens for the user are deactivated (used for logout).

    Args:
        db (AsyncSession): The database session.
        user (User): The user whose tokens are to be revoked.
        jti (str | None): The JTI of the token to revoke, or None to revoke all.
        clear_jti (bool): Whether to clear the user's last_refresh_jti field.
    """
    from app.models.refresh_token import RefreshToken
    if jti:
        # Only deactivate the offending token
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.jti == jti)
            .values(is_active=False)
        )
    else:
        # Deactivate all tokens (e.g., on logout)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.is_active == True)
            .values(is_active=False)
        )
    if clear_jti:
        user.last_refresh_jti = None
        db.add(user)
    await db.commit()
    await db.refresh(user)