"""Add contact_person column to channels table

Revision ID: 7d7b1e8e2a0c
Revises: 7352e85b6891
Create Date: 2025-10-20 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "7d7b1e8e2a0c"
down_revision: Union[str, None] = "211261ca3f2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    column_names = {col["name"] for col in inspector.get_columns("channels")}

    if "contact_person" not in column_names:
        op.add_column(
            "channels",
            sa.Column("contact_person", sa.String(length=100), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    column_names = {col["name"] for col in inspector.get_columns("channels")}

    if "contact_person" in column_names:
        op.drop_column("channels", "contact_person")
