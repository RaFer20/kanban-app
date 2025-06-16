from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.core.config import get_settings
from uuid import uuid4

# Create a password context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

settings = get_settings()

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token with an embedded expiration claim ("exp").

    Args:
        data (dict): The data to encode in the token.
        expires_delta (timedelta, optional): The time delta until the token expires. 
            Defaults to settings.access_token_expire_minutes if not provided.

    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    expire = datetime.now(tz=timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT refresh token with an embedded expiration claim ("exp").

    Args:
        data (dict): The data to encode in the token.
        expires_delta (timedelta, optional): The time delta until the token expires. 
            Defaults to settings.refresh_token_expire_minutes if not provided.

    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    expire = datetime.now(tz=timezone.utc) + (
        expires_delta or timedelta(minutes=settings.refresh_token_expire_minutes)
    )
    jti = str(uuid4())  # Generate a unique identifier for the token
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def get_password_hash(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare a plain password with its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)

