from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Literal
from .enums import UserRole


class UserBase(BaseModel):
    email: EmailStr


class UserCreatePublic(UserBase):
    password: str
    # no role field here


class UserCreateAdmin(UserBase):
    password: str
    role: UserRole


class UserOut(UserBase):
    id: int
    role: UserRole
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


