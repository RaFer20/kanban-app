"""
Defines the SQLAlchemy ORM model for refresh tokens.

This module contains the RefreshToken class, which represents refresh tokens used for
authentication token rotation, including their relationship to users and expiration logic.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RefreshToken(Base):
    """
    SQLAlchemy ORM model for refresh tokens.

    Represents a refresh token issued to a user for authentication token rotation.
    Each token has a unique JTI, is associated with a user, and has an expiration date.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid4()),
        doc="Primary key: UUID string for the refresh token record."
    )
    jti: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        doc="JWT ID (JTI) claim: unique identifier for the refresh token."
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        doc="Foreign key to the user who owns this refresh token."
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Indicates if the refresh token is currently active."
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Timestamp when the refresh token was created."
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(days=7),
        nullable=False,
        doc="Timestamp when the refresh token expires."
    )

    user = relationship(
        "User",
        back_populates="refresh_tokens",
        doc="Relationship to the owning User."
    )

    def __repr__(self) -> str:
        """String representation for debugging purposes."""
        return f"<RefreshToken id={self.id} user_id={self.user_id} is_active={self.is_active}>"
