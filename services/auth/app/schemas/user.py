"""
Pydantic schemas for user-related data.

Defines schemas for user creation, login, output, and authentication tokens.
These are used for request validation and response serialization in the Auth Service API.
"""

from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Literal
from .enums import UserRole
from datetime import datetime


class UserBase(BaseModel):
    """
    Base schema for user objects, containing shared fields.
    """
    email: EmailStr


class UserCreatePublic(UserBase):
    """
    Schema for public user registration (no role assignment).
    """
    password: str


class UserCreateAdmin(UserBase):
    """
    Schema for admin user creation, allowing role assignment.
    """
    password: str
    role: UserRole


class UserOut(UserBase):
    """
    Schema for user data returned from the API.
    """
    id: int
    role: UserRole
    created_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """
    Schema for user login requests.
    """
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


