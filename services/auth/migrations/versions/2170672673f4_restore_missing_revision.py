"""Restore missing revision

Revision ID: 2170672673f4
Revises: 661c3727369b
Create Date: 2025-06-10 14:52:14.396113

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2170672673f4'
down_revision: Union[str, None] = '661c3727369b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
