# Standard lib
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import logging

# Third-party
from fastapi import APIRouter, Depends, HTTPException, status, Body, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from sqlalchemy.future import select
from sqlalchemy import delete

# Local
from app.core.config import get_settings
from app.core.metrics import user_login_counter, user_registration_counter, refresh_token_usage_counter, admin_action_counter
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserCreatePublic as UserCreate, UserOut, Token
from app.services import auth as auth_service
from app.services.auth import create_user, get_user_by_email
from app.services.refresh_tokens import (
    create_refresh_token as save_refresh_token,
    deactivate_refresh_token,
    is_refresh_token_valid,
    get_all_valid_refresh_tokens_for_user,
    get_refresh_token_from_db,
)
from app.limiter import limiter
from app.schemas.enums import UserRole

settings = get_settings()
router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/users/", response_model=UserOut, tags=["auth"])
@limiter.limit("40/minute")  # 40 registrations per minute per IP
async def register_user(
    request: Request,
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.

    Args:
        user_create (UserCreate): The user registration data.
        db (AsyncSession): The database session.

    Returns:
        UserOut: The created user.
    """
    logger.debug(f"Registering user with email: {user_create.email}")
    existing_user = await get_user_by_email(db, user_create.email)
    if existing_user:
        logger.warning(f"Registration failed - email already registered: {user_create.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await create_user(db, user_create)
    user_registration_counter.labels(method="password").inc()
    logger.info(f"User registered successfully: {user.email} (ID: {user.id})")
    return user


@router.post("/token", response_model=Token, tags=["auth"])
@limiter.limit("40/minute")  # 40 login attempts per minute per IP
async def login_user(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Authenticate a user and return access and refresh tokens.

    Args:
        form_data (OAuth2PasswordRequestForm): The login form data.
        db (AsyncSession): The database session.

    Returns:
        Token: The access and refresh tokens.
    """
    logger.debug(f"Login attempt for email: {form_data.username}")
    user: User | None = await get_user_by_email(db, form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Successful login
    user_login_counter.labels(method="password").inc()

    now = datetime.now(timezone.utc)
    access_exp_delta = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_exp_delta = timedelta(minutes=settings.refresh_token_expire_minutes)
    jti = str(uuid4())

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_exp_delta,
    )
    refresh_token = create_refresh_token(
        data={
            "sub": str(user.id),
            "iat": int(now.timestamp()),
            "jti": jti,
        },
        expires_delta=refresh_exp_delta,
    )

    await db.refresh(user)
    user.last_refresh_jti = jti
    db.add(user)
    await db.commit()

    refresh_exp = now + refresh_exp_delta
    await save_refresh_token(db, jti, user.id, refresh_exp)
    await db.commit()

    logger.info(f"User logged in successfully: {user.email} (ID: {user.id}), JTI: {jti}")

    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.env == "production",
        samesite="lax",
        max_age=int(settings.access_token_expire_minutes * 60),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.env == "production",
        samesite="lax",
        max_age=int(settings.refresh_token_expire_minutes * 60),
        path="/api/auth/api/v1/refresh",  # restrict path if you want
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserOut, tags=["auth"])
async def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's information.

    Args:
        current_user (User): The authenticated user.

    Returns:
        UserOut: The current user's data.
    """
    logger.debug(f"Fetching current user data for user id: {current_user.id}")
    return current_user


@router.post("/refresh", response_model=Token, tags=["auth"])
@limiter.limit("100/minute")  # 100 refreshes per minute per IP
async def refresh_access_token(
    request: Request,
    response: Response,
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Rotate and return new access and refresh tokens using a valid refresh token.

    Args:
        refresh_token (str): The refresh token to use for rotation.
        db (AsyncSession): The database session.

    Returns:
        Token: The new access and refresh tokens.

    Raises:
        HTTPException: If the refresh token is invalid, expired, or reused.
    """
    logger.debug("Refresh token endpoint called")
    try:
        payload = jwt.decode(
            refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        sub = payload.get("sub")
        jti = payload.get("jti")

        logger.debug(f"Decoded refresh token payload: sub={sub}, jti={jti}")

        if not isinstance(sub, str) or not sub.isdigit():
            logger.error("Invalid 'sub' claim in refresh token")
            raise HTTPException(status_code=401, detail="Invalid token payload")

        if not isinstance(jti, str):
            logger.error("Invalid 'jti' claim in refresh token")
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        user_id = int(sub)
        user = await db.get(User, user_id)
        if user is None:
            logger.error(f"User ID {user_id} from token no longer exists")
            raise HTTPException(status_code=401, detail="User no longer exists")

        await db.refresh(user)

        if user.last_refresh_jti != jti:
            logger.warning(f"Refresh token reuse detected for user ID {user_id}: token JTI {jti} does not match last_refresh_jti {user.last_refresh_jti}")
            await auth_service.revoke_refresh_token(db, user, jti=jti, clear_jti=False)
            raise HTTPException(status_code=401, detail="Refresh token invalid or reused")

        valid_in_db = await is_refresh_token_valid(db, jti)
        if not valid_in_db:
            logger.warning(f"Refresh token JTI {jti} is not valid or expired in DB for user ID {user_id}")
            await auth_service.revoke_refresh_token(db, user, jti=jti, clear_jti=False)
            raise HTTPException(status_code=401, detail="Refresh token invalid or reused")

        now = datetime.now(timezone.utc)
        new_jti = str(uuid4())

        access_token = create_access_token(
            data={"sub": str(user_id), "role": user.role},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        new_refresh_token = create_refresh_token(
            data={
                "sub": str(user_id),
                "iat": int(now.timestamp()),
                "jti": new_jti,
            },
            expires_delta=timedelta(minutes=settings.refresh_token_expire_minutes),
        )

        await deactivate_refresh_token(db, jti)
        await db.commit()

        new_refresh_exp = now + timedelta(minutes=settings.refresh_token_expire_minutes)
        logger.debug(f"Saving new refresh token JTI: {new_jti} for user ID {user_id}")

        user.last_refresh_jti = new_jti
        db.add(user)
        await save_refresh_token(db, new_jti, user.id, new_refresh_exp)
        await db.flush()

        tokens_mid = await get_all_valid_refresh_tokens_for_user(db, user.id)
        logger.debug(f"[MID] Valid refresh tokens for user {user.id}: {[t.jti for t in tokens_mid]}")

        await db.commit()
        await db.refresh(user)
        logger.debug(f"DB refresh complete for user ID {user_id}")

        tokens_after = await get_all_valid_refresh_tokens_for_user(db, user.id)
        logger.debug(f"[POST] Valid refresh tokens for user {user.id}: {[t.jti for t in tokens_after]}")

        logger.info(f"Refresh token rotated successfully for user ID {user_id}, new JTI: {new_jti}")
        refresh_token_usage_counter.labels(method="refresh").inc()

        # Set cookies for new tokens
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=int(settings.access_token_expire_minutes * 60),
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=int(settings.refresh_token_expire_minutes * 60),
            path="/api/auth/api/v1/refresh",
        )

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
        )
    except ExpiredSignatureError:
        logger.warning("Refresh token expired")
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except JWTError:
        logger.error("Invalid refresh token encountered during decode")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def logout_user(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Log out the current user by revoking all active refresh tokens.

    Args:
        current_user (User): The authenticated user.
        db (AsyncSession): The database session.

    Returns:
        Response: 204 No Content on success.
    """
    logger.info(f"Logging out user ID {current_user.id}, email {current_user.email}")
    await auth_service.revoke_refresh_token(db, current_user)
    logger.info(f"User ID {current_user.id} logged out successfully")

    # Clear cookies
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/api/v1/refresh")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/admin-only", tags=["admin"])
async def admin_dashboard(user: User = Depends(require_role("admin"))):
    """
    Test admin-only endpoint.

    Args:
        user (User): The authenticated admin user.

    Returns:
        dict: A welcome message for the admin.
    """
    admin_action_counter.labels(action="dashboard_access").inc()
    logger.debug(f"Admin access by user ID {user.id}, email {user.email}")
    return {"message": f"Welcome, admin {user.email}"}


@router.get("/admin/users", response_model=list[UserOut], tags=["admin"])
async def list_all_users(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users (admin only).

    Args:
        user (User): The authenticated admin user.
        db (AsyncSession): The database session.

    Returns:
        List[UserOut]: All users in the system.
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [UserOut.model_validate(u) for u in users]


@router.delete("/admin/delete-boardtest-users", tags=["admin"])
async def delete_boardtest_users(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all users with emails ending in '@boardtests.com' (admin only).
    """
    stmt = delete(User).where(User.email.like('%@boardtests.com'))
    await db.execute(stmt)
    await db.commit()
    logger.info("Admin deleted all @boardtests.com users")
    return {"message": "All @boardtests.com users deleted"}


@router.patch("/admin/users/{user_id}/role", response_model=UserOut, tags=["admin"])
async def update_user_role(
    user_id: int,
    role: str = Body(..., embed=True),
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's role (admin only).

    Args:
        user_id (int): The ID of the user whose role is to be updated.
        role (str): The new role for the user.
        admin_user (User): The authenticated admin user.
        db (AsyncSession): The database session.

    Returns:
        UserOut: The updated user data.

    Raises:
        HTTPException: If the user is not found or if there is an error during the update.
    """
    logger.debug(f"Admin {admin_user.email} updating role for user ID {user_id} to {role}")
    user = await db.get(User, user_id)
    if not user:
        logger.warning(f"User ID {user_id} not found for role update")
        raise HTTPException(status_code=404, detail="User not found")

    # Validate and convert role to UserRole enum
    try:
        if role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"User ID {user_id} role updated to {role} by admin {admin_user.email}")
    return UserOut.model_validate(user)
