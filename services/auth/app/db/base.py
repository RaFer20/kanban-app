"""
Defines the SQLAlchemy declarative base for all ORM models.

Note:
    Careful if importing models here, as it can lead to circular imports.
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()

