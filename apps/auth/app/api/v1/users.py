from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from datetime import datetime, timezone, timedelta
from app.schemas.user import UserCreate, UserOut, Token
from app.services.auth import create_user, get_user_by_email
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.core.config import get_settings

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
):
    user: User | None = await get_user_by_email(db, form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate iat timestamp
    iat = datetime.now(timezone.utc)

    # Calculate expirations
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    refresh_token_expires = timedelta(minutes=settings.refresh_token_expire_minutes)
    access_exp = iat + access_token_expires
    refresh_exp = iat + refresh_token_expires

    # Create tokens with explicit sub and exp
    access_token = create_access_token(
        data={"sub": str(user.id), "exp": int(access_exp.timestamp())}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "exp": int(refresh_exp.timestamp()), "iat": int(iat.timestamp())}
    )

    # Save refresh_token_iat to DB
    user.refresh_token_iat = iat
    db.add(user)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserOut, tags=["auth"])
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/refresh", response_model=Token, tags=["auth"])
async def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(
            refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        user_id = payload.get("sub")
        token_iat = payload.get("iat")

        if not isinstance(user_id, str) or not user_id.isdigit():
            raise HTTPException(status_code=401, detail="Invalid token payload")
        if not isinstance(token_iat, int):
            raise HTTPException(status_code=401, detail="Invalid token: missing iat")

        user = await db.get(User, int(user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="User no longer exists")

        stored_iat = user.refresh_token_iat
        if stored_iat is None or int(stored_iat.timestamp()) != token_iat:
            raise HTTPException(status_code=401, detail="Refresh token revoked/reused")

        # Generate new iat and tokens
        new_iat = datetime.now(timezone.utc)
        user.refresh_token_iat = new_iat
        db.add(user)
        await db.commit()

        access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id, "iat": int(new_iat.timestamp())})

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
