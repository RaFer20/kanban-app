"""Add role field to user

Revision ID: 5de54a12606d
Revises: e95a4517c72b
Create Date: 2025-06-12 09:17:51.139839

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5de54a12606d'
down_revision: Union[str, None] = 'e95a4517c72b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('role', sa.String(length=50), nullable=False, server_default='user'))
    op.alter_column('users', 'role', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'role')
