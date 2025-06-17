"""Replace token with jti in refresh_tokens

Revision ID: 58737c44b10b
Revises: 56e9b5c736da
Create Date: 2025-06-14 10:43:35.280191

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58737c44b10b'
down_revision: Union[str, None] = '56e9b5c736da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index("ix_refresh_tokens_token", table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "token")
    op.add_column("refresh_tokens", sa.Column("jti", sa.String(length=64), nullable=False, unique=True))
    op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_refresh_tokens_jti", table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "jti")
    op.add_column("refresh_tokens", sa.Column("token", sa.String(), nullable=False))
    op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"], unique=True)