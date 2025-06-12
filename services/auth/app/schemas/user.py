from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Literal


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: Optional[Literal["user", "admin", "guest"]] = "user"


class UserOut(UserBase):
    id: int
    role: str
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


