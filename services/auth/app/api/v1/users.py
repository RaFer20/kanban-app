# Standard lib
from datetime import datetime, timezone, timedelta
from uuid import uuid4

# Third-party
from fastapi import APIRouter, Depends, HTTPException, status, Body, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

# Local
from app.core.config import get_settings
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
)


settings = get_settings()
router = APIRouter()


@router.post("/users/", response_model=UserOut, tags=["auth"])
async def register_user(user_create: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user with an email and password.

    - Returns the created user object.
    - Fails if the email is already registered.
    """
    existing_user = await get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await create_user(db, user_create)
    return user


@router.post("/token", response_model=Token, tags=["auth"])
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Authenticate a user and return JWT access and refresh tokens.

    - Expects OAuth2 form fields: `username` (email) and `password`.
    - Returns access token, refresh token, and token type.
    """
    user: User | None = await get_user_by_email(db, form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now = datetime.now(timezone.utc)
    access_exp_delta = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_exp_delta = timedelta(minutes=settings.refresh_token_expire_minutes)
    jti = str(uuid4())

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_exp_delta
    )
    refresh_token = create_refresh_token(
        data={
            "sub": str(user.id),
            "iat": int(now.timestamp()),
            "jti": jti,
        },
        expires_delta=refresh_exp_delta
    )

    user.last_refresh_jti = jti
    db.add(user)
    await db.commit()

    refresh_exp = now + refresh_exp_delta
    await save_refresh_token(db, jti, user.id, refresh_exp)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserOut, tags=["auth"])
async def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Get the current authenticated user's data.

    - Requires a valid access token.
    - Returns the user object.
    """
    return current_user


@router.post("/refresh", response_model=Token, tags=["auth"])
async def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Refresh expired access token using a valid refresh token.

    - Requires valid refresh token in the body.
    - Implements reuse protection and rotation via `jti`.
    - Returns new access and refresh tokens.
    """
    try:
        payload = jwt.decode(
            refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        sub = payload.get("sub")
        jti = payload.get("jti")

        if not isinstance(sub, str) or not sub.isdigit():
            raise HTTPException(status_code=401, detail="Invalid token payload")

        if not isinstance(jti, str):
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        user_id = int(sub)
        user = await db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User no longer exists")

        if user.last_refresh_jti != jti:
            await auth_service.revoke_refresh_token(db, user)
            raise HTTPException(status_code=401, detail="Refresh token invalid or reused")

        valid_in_db = await is_refresh_token_valid(db, jti)
        if not valid_in_db:
            await auth_service.revoke_refresh_token(db, user)
            raise HTTPException(status_code=401, detail="Refresh token invalid or reused")

        now = datetime.now(timezone.utc)
        new_jti = str(uuid4())

        access_token = create_access_token(
            data={"sub": str(user_id)},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )
        new_refresh_token = create_refresh_token(
            data={
                "sub": str(user_id),
                "iat": int(now.timestamp()),
                "jti": new_jti,
            },
            expires_delta=timedelta(minutes=settings.refresh_token_expire_minutes)
        )

        await deactivate_refresh_token(db, jti)
        new_refresh_exp = now + timedelta(minutes=settings.refresh_token_expire_minutes)
        await save_refresh_token(db, new_jti, user.id, new_refresh_exp)

        user.last_refresh_jti = new_jti
        db.add(user)
        await db.commit()

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def logout_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Log the user out by revoking their current refresh token.

    - Requires valid access token.
    - Prevents reuse of the current refresh token.
    """
    await auth_service.revoke_refresh_token(db, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin-only", tags=["admin"])
async def admin_dashboard(user: User = Depends(require_role("admin"))):
    """
    Admin-only protected endpoint.

    - Requires role-based access: `admin`.
    - Returns a greeting with the admin's email.
    """
    return {"message": f"Welcome, admin {user.email}"}
