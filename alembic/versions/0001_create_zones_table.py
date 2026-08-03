"""Create zones table

Revision ID: 0001
Revises: 
Create Date: 2026-08-03

Initial schema for AutoSentinel zone persistence.
Replaces both the Supabase 'zones' table and the local JSON data files.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "zones",
        # ── Identity ─────────────────────────────────────────────────────────
        sa.Column("id", sa.String(64), primary_key=True, nullable=False),
        sa.Column("source", sa.String(16), nullable=False, index=True),

        # ── Geospatial ───────────────────────────────────────────────────────
        sa.Column("lat", sa.Double(), nullable=True),
        sa.Column("lon", sa.Double(), nullable=True),
        sa.Column("area_sqm", sa.Double(), nullable=True),

        # ── Labels / classification ──────────────────────────────────────────
        sa.Column("severity", sa.String(16), nullable=True, index=True),
        sa.Column("risk_score", sa.Double(), nullable=True),
        sa.Column("action", sa.Text(), nullable=True),
        sa.Column("violation_type", sa.String(128), nullable=True),
        sa.Column("location_name", sa.Text(), nullable=True),
        sa.Column("area_label", sa.Text(), nullable=True),
        sa.Column("period_label", sa.String(64), nullable=True),

        # ── Microsoft building cross-reference ───────────────────────────────
        sa.Column("microsoft_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),

        # ── ML scoring ───────────────────────────────────────────────────────
        sa.Column("ml_confidence", sa.Double(), nullable=True),
        sa.Column("is_likely_real", sa.Boolean(), nullable=True),

        # ── Vision / YOLO ────────────────────────────────────────────────────
        sa.Column("construction_detected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("objects_found", JSONB(), nullable=True),
        sa.Column("yolo_boxes", JSONB(), nullable=True),
        sa.Column("vision_confidence", sa.Double(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("crane_present", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("building_present", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("container_present", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("pre_vision_risk_score", sa.Double(), nullable=True),
        sa.Column("vision_risk_boost", sa.Double(), nullable=True),

        # ── Bhuvan land-use ──────────────────────────────────────────────────
        sa.Column("bhuvan_land_type", sa.Text(), nullable=True),
        sa.Column("bhuvan_confidence", sa.String(32), nullable=True),
        sa.Column("bhuvan_overlap_percent", sa.Double(), nullable=True),
        sa.Column("bhuvan_source", sa.Text(), nullable=True),

        # ── OSM / legal flags ────────────────────────────────────────────────
        sa.Column("osm_flags", JSONB(), nullable=True),
        sa.Column("legal_flags", JSONB(), nullable=True),
        sa.Column("risk_boost_total", sa.Double(), nullable=False, server_default=sa.text("0.0")),

        # ── Audit ─────────────────────────────────────────────────────────────
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # Useful composite indexes for common query patterns
    op.create_index("ix_zones_source_severity", "zones", ["source", "severity"])
    op.create_index("ix_zones_risk_score", "zones", ["risk_score"])


def downgrade() -> None:
    op.drop_index("ix_zones_risk_score", table_name="zones")
    op.drop_index("ix_zones_source_severity", table_name="zones")
    op.drop_table("zones")
