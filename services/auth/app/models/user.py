"""
Defines the SQLAlchemy ORM model for application users.

This module contains the User class, which represents users in the authentication system,
including authentication, authorization, and relationships to refresh tokens.
"""

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.schemas.enums import UserRole


class User(Base):
    """
    SQLAlchemy ORM model for the User table.

    Represents an application user, including authentication and authorization fields.

    Attributes:
        id (int): Primary key.
        email (str): Unique user email address.
        hashed_password (str): Hashed user password.
        is_active (bool): Whether the user account is active.
        is_superuser (bool): Whether the user has superuser privileges.
        last_refresh_jti (str | None): JTI of the latest valid refresh token for this user.
        refresh_tokens (list[RefreshToken]): Relationship to the user's refresh tokens.
        created_at (datetime): Timestamp when the user was created.
        updated_at (datetime): Timestamp when the user was last updated.
        role (UserRole): The user's role (e.g., user, admin).
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True,
        doc="Unique user email address."
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False,
        doc="Hashed user password."
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True,
        doc="Whether the user account is active."
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, default=False,
        doc="Whether the user has superuser privileges."
    )

    last_refresh_jti: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        doc="The jti of the latest valid refresh token for this user."
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        doc="Relationship to the user's refresh tokens."
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Timestamp when the user was created."
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Timestamp when the user was last updated."
    )

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="userrole"),
        default=UserRole.user,
        nullable=False,
        doc="The user's role (e.g., user, admin)."
    )

    def __repr__(self) -> str:
        """String representation of the User instance."""
        return (
            f"<User id={self.id} email={self.email} "
            f"is_active={self.is_active} is_superuser={self.is_superuser}>"
        )
