"""add_updated_at_to_channel_assignments

Revision ID: abf0f3fe94d9
Revises: 7352e85b6891
Create Date: 2025-10-15 12:21:58.077631

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abf0f3fe94d9'
down_revision: Union[str, None] = '7352e85b6891'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add updated_at column to channel_assignments table
    op.add_column('channel_assignments',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    # Remove updated_at column from channel_assignments table
    op.drop_column('channel_assignments', 'updated_at')
