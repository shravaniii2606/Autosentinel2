"""SQLAlchemy ORM model for AutoSentinel zones.

This model mirrors the column set previously tracked in supabase_client.py
(_ZONE_COLUMNS) plus additional fields found in the JSON data files.

The `id` column is VARCHAR(64) because:
  - flagged zones carry integer IDs (stored as "82", "200", …)
  - live zones carry string IDs ("live_df3b1f9a_0", "scan_abc_1", …)
  - sample bbox zones carry string IDs ("area_gairatpur_bas", …)

JSONB columns (objects_found, yolo_boxes, osm_flags, legal_flags) store
Python lists/dicts natively via SQLAlchemy's JSON type.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Double,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from backend.database import Base
except ImportError:
    from database import Base


class Zone(Base):
    """Persistent zone record (flagged or live scan result)."""

    __tablename__ = "zones"

    # ── Identity ────────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    # ── Geospatial ──────────────────────────────────────────────────────────────
    lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    lon: Mapped[float | None] = mapped_column(Double, nullable=True)
    area_sqm: Mapped[float | None] = mapped_column(Double, nullable=True)

    # ── Labels / classification ──────────────────────────────────────────────────
    severity: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    risk_score: Mapped[float | None] = mapped_column(Double, nullable=True)
    action: Mapped[str | None] = mapped_column(Text, nullable=True)
    violation_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    location_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    area_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    period_label: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── Microsoft building cross-reference ───────────────────────────────────────
    microsoft_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── ML scoring ───────────────────────────────────────────────────────────────
    ml_confidence: Mapped[float | None] = mapped_column(Double, nullable=True)
    is_likely_real: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # ── Vision / YOLO ────────────────────────────────────────────────────────────
    construction_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    objects_found: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    yolo_boxes: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    vision_confidence: Mapped[float] = mapped_column(Double, default=0.0)
    crane_present: Mapped[bool] = mapped_column(Boolean, default=False)
    building_present: Mapped[bool] = mapped_column(Boolean, default=False)
    container_present: Mapped[bool] = mapped_column(Boolean, default=False)
    pre_vision_risk_score: Mapped[float | None] = mapped_column(Double, nullable=True)
    vision_risk_boost: Mapped[float | None] = mapped_column(Double, nullable=True)

    # ── Bhuvan land-use ──────────────────────────────────────────────────────────
    bhuvan_land_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    bhuvan_confidence: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bhuvan_overlap_percent: Mapped[float | None] = mapped_column(Double, nullable=True)
    bhuvan_source: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── OSM / legal flags ────────────────────────────────────────────────────────
    osm_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    legal_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    risk_boost_total: Mapped[float] = mapped_column(Double, default=0.0)

    # ── Audit ─────────────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Helpers ──────────────────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        """Return a plain dict suitable for JSON serialisation."""
        return {
            "id": self.id,
            "source": self.source,
            "lat": self.lat,
            "lon": self.lon,
            "area_sqm": self.area_sqm,
            "severity": self.severity,
            "risk_score": self.risk_score,
            "action": self.action,
            "violation_type": self.violation_type,
            "location_name": self.location_name,
            "area_label": self.area_label,
            "period_label": self.period_label,
            "microsoft_confirmed": self.microsoft_confirmed,
            "ml_confidence": self.ml_confidence,
            "is_likely_real": self.is_likely_real,
            "construction_detected": self.construction_detected,
            "objects_found": self.objects_found or [],
            "yolo_boxes": self.yolo_boxes or [],
            "vision_confidence": self.vision_confidence,
            "crane_present": self.crane_present,
            "building_present": self.building_present,
            "container_present": self.container_present,
            "pre_vision_risk_score": self.pre_vision_risk_score,
            "vision_risk_boost": self.vision_risk_boost,
            "bhuvan_land_type": self.bhuvan_land_type,
            "bhuvan_confidence": self.bhuvan_confidence,
            "bhuvan_overlap_percent": self.bhuvan_overlap_percent,
            "bhuvan_source": self.bhuvan_source,
            "osm_flags": self.osm_flags or [],
            "legal_flags": self.legal_flags or [],
            "risk_boost_total": self.risk_boost_total,
        }

    def __repr__(self) -> str:
        return f"<Zone id={self.id!r} source={self.source!r} severity={self.severity!r}>"


class User(Base):
    """User account model for AutoSentinel authentication."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    picture: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="user", server_default="user", nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "picture": self.picture,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r} role={self.role!r}>"


class RefreshToken(Base):
    """Session refresh token model."""

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, server_default=func.text("false"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id!r} user_id={self.user_id!r} revoked={self.revoked!r}>"
