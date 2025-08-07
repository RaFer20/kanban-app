"""
Authentication and authorization dependencies for FastAPI routes.

Provides:
- get_current_user: Dependency to extract and validate the current user from a JWT access token.
- require_role: Dependency factory for role-based access control on endpoints.
"""

from fastapi import Request, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.services.auth import get_user_by_email
from app.core.config import get_settings

settings = get_settings()

async def get_current_user(
    request: Request,
    db=Depends(get_db),
) -> User:
    """
    Dependency to retrieve the currently authenticated user from a JWT access token.

    Args:
        request (Request): The HTTP request, used to extract the JWT access token from cookies.
        db (AsyncSession): The database session.

    Returns:
        User: The authenticated user object.

    Raises:
        HTTPException: If the token is invalid, expired, or the user does not exist.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token: missing subject")
        user_id = int(sub)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_role(*allowed_roles: str):
    """
    Dependency factory to enforce role-based access control on endpoints.

    Args:
        *allowed_roles (str): One or more roles allowed to access the endpoint.

    Returns:
        Callable: A dependency that checks the current user's role.

    Raises:
        HTTPException: If the user's role is not in the allowed roles.
    """
    from typing import Annotated
    async def role_checker(
        user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        """
        Checks if the current user's role is allowed.

        Args:
            user (User): The authenticated user.

        Returns:
            User: The authenticated user if role is permitted.

        Raises:
            HTTPException: If the user's role is not permitted.
        """
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{user.role}'."
            )
        return user
    return role_checker
