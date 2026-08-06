"""Add user subscription fields

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-06
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("subscription_status", sa.String(16), nullable=False, server_default="free"),
    )
    op.add_column("users", sa.Column("subscription_plan", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("subscribed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("scans_used", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.create_check_constraint(
        "ck_users_subscription_status",
        "users",
        "subscription_status IN ('free', 'active', 'cancelled')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_subscription_status", "users", type_="check")
    op.drop_column("users", "scans_used")
    op.drop_column("users", "subscribed_at")
    op.drop_column("users", "subscription_plan")
    op.drop_column("users", "subscription_status")
