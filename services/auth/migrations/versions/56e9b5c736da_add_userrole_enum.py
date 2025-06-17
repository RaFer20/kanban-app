"""Add UserRole enum

Revision ID: 56e9b5c736da
Revises: 5de54a12606d
Create Date: 2025-06-12 17:04:45.375363

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as psql


# revision identifiers, used by Alembic.
revision: str = '56e9b5c736da'
down_revision: Union[str, None] = '5de54a12606d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define the enum separately
user_role_enum = psql.ENUM('user', 'admin', 'guest', name='userrole', create_type=False)


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create enum type
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # 2. Alter the column type
    op.alter_column(
        'users',
        'role',
        type_=user_role_enum,
        existing_type=sa.String(length=50),
        postgresql_using='role::userrole',
        existing_nullable=False
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Revert column to string
    op.alter_column(
        'users',
        'role',
        type_=sa.String(length=50),
        existing_type=user_role_enum,
        postgresql_using='role::text',
        existing_nullable=False
    )

    # 2. Drop the enum type
    user_role_enum.drop(op.get_bind(), checkfirst=True)
    # ### end Alembic commands ###
