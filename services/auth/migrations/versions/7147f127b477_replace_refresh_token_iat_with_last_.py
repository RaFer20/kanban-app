"""Replace refresh_token_iat with last_refresh_jti on users

Revision ID: 7147f127b477
Revises: 58737c44b10b
Create Date: 2025-06-14 17:48:30.491724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7147f127b477'
down_revision = "58737c44b10b"
branch_labels = None
depends_on = None

def upgrade():
    op.drop_column("users", "refresh_token_iat")
    op.add_column(
        "users",
        sa.Column("last_refresh_jti", sa.String(length=64), nullable=True)
    )

def downgrade():
    op.drop_column("users", "last_refresh_jti")
    op.add_column(
        "users",
        sa.Column("refresh_token_iat", sa.DateTime(timezone=True), nullable=True)
    )