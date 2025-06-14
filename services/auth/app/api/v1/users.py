from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from app.schemas.user import UserCreatePublic as UserCreate, UserOut, Token
from app.services.auth import create_user, get_user_by_email
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.dependencies.auth import get_current_user, require_role
from app.core.config import get_settings
from app.services import auth as auth_service
from app.services.refresh_tokens import (
    create_refresh_token as save_refresh_token,
    deactivate_refresh_token,
    is_refresh_token_valid,
)

settings = get_settings()
router = APIRouter()


@router.post("/users/", response_model=UserOut, tags=["auth"])
async def register_user(user_create: UserCreate, db: AsyncSession = Depends(get_db)):
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
    user: User | None = await get_user_by_email(db, form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now = datetime.now(timezone.utc)
    access_exp = now + timedelta(minutes=settings.access_token_expire_minutes)
    refresh_exp = now + timedelta(minutes=settings.refresh_token_expire_minutes)
    jti = str(uuid4())

    access_token = create_access_token(
        data={"sub": str(user.id), "exp": int(access_exp.timestamp())}
    )
    refresh_token = create_refresh_token(
        data={
            "sub": str(user.id),
            "iat": int(now.timestamp()),
            "exp": int(refresh_exp.timestamp()),
            "jti": jti,
        }
    )

    user.last_refresh_jti = jti
    db.add(user)
    await db.commit()

    await save_refresh_token(db, jti, user.id, refresh_exp)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserOut, tags=["auth"])
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=Token, tags=["auth"])
async def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
) -> Token:
    try:
        payload = jwt.decode(
            refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        user_id = payload.get("sub")
        jti = payload.get("jti")

        if not isinstance(user_id, str) or not user_id.isdigit():
            raise HTTPException(status_code=401, detail="Invalid token payload")
        if not jti:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        user = await db.get(User, int(user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="User no longer exists")

        # Chain reuse protection: Only the last jti should be valid
        if user.last_refresh_jti != jti:
            await auth_service.revoke_refresh_token(db, user)
            raise HTTPException(status_code=401, detail="Refresh token invalid or reused")

        # Check it's still valid in DB
        valid_in_db = await is_refresh_token_valid(db, jti)
        if not valid_in_db:
            await auth_service.revoke_refresh_token(db, user)
            raise HTTPException(status_code=401, detail="Refresh token invalid or reused")

        # Issue new tokens
        now = datetime.now(timezone.utc)
        access_exp = now + timedelta(minutes=settings.access_token_expire_minutes)
        new_refresh_exp = now + timedelta(minutes=settings.refresh_token_expire_minutes)
        new_jti = str(uuid4())

        access_token = create_access_token(
            data={"sub": user_id, "exp": int(access_exp.timestamp())}
        )
        new_refresh_token = create_refresh_token(
            data={
                "sub": user_id,
                "iat": int(now.timestamp()),
                "exp": int(new_refresh_exp.timestamp()),
                "jti": new_jti,
            }
        )

        await deactivate_refresh_token(db, jti)
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


@router.post("/logout", status_code=204, tags=["auth"])
async def logout_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.revoke_refresh_token(db, current_user)
    return


@router.get("/admin-only", tags=["admin"])
async def admin_dashboard(
    user = Depends(require_role("admin"))
):
    return {"message": f"Welcome, admin {user.email}"}
