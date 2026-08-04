"""PostgreSQL persistence for AutoSentinel zones.

Drop-in replacement for supabase_client.py — exposes the same public API:
  upsert_zones(zones, source, batch_size) -> int
  fetch_zones(source, limit)              -> list[dict]
  delete_zone(zone_id)                   -> None

All zone data is stored in the `zones` table managed by models.Zone.
Uses a short-lived SQLAlchemy session per call so this module is safe to
call from background threads (FastAPI BackgroundTasks).
"""

from __future__ import annotations

import math
from typing import Iterable

# ---------------------------------------------------------------------------
# Resolve imports whether the app is run as `uvicorn backend.main:app` or
# `uvicorn main:app` from inside the backend directory.
# ---------------------------------------------------------------------------
try:
    from backend.database import SessionLocal
    from backend.models import Zone
except ImportError:
    from database import SessionLocal
    from models import Zone

# ---------------------------------------------------------------------------
# Column allow-list (kept in sync with models.Zone attributes)
# ---------------------------------------------------------------------------
_ZONE_COLUMNS = {
    "id", "source", "lat", "lon", "area_sqm", "severity", "risk_score",
    "action", "violation_type", "location_name", "area_label", "period_label",
    "microsoft_confirmed", "ml_confidence", "is_likely_real",
    "construction_detected", "objects_found", "yolo_boxes",
    "vision_confidence", "crane_present", "building_present", "container_present",
    "pre_vision_risk_score", "vision_risk_boost",
    "bhuvan_land_type", "bhuvan_confidence", "bhuvan_overlap_percent", "bhuvan_source",
    "osm_flags", "legal_flags", "risk_boost_total",
}

_NUMERIC_COLUMNS = {
    "lat", "lon", "area_sqm", "risk_score",
    "bhuvan_overlap_percent", "risk_boost_total", "vision_confidence",
    "ml_confidence", "pre_vision_risk_score", "vision_risk_boost",
}

_CONFIDENCE_LABELS: dict[str, float | None] = {
    "unknown": None,
    "low": 25.0,
    "medium": 60.0,
    "high": 90.0,
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_float(value) -> float | None:
    """Coerce a value to float, returning None for non-numeric inputs."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if math.isfinite(number) else None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        label_value = _CONFIDENCE_LABELS.get(text.lower())
        if text.lower() in _CONFIDENCE_LABELS:
            return label_value
        if text.endswith("%"):
            text = text[:-1].strip()
        try:
            number = float(text)
        except ValueError:
            return None
        return number if math.isfinite(number) else None
    return None


def _build_zone_kwargs(zone: dict, source: str) -> dict:
    """Return a dict of Zone constructor kwargs derived from a raw zone dict."""
    # Drop unknown columns, set source
    row: dict = {k: v for k, v in zone.items() if k in _ZONE_COLUMNS}
    row["id"] = str(zone.get("id", ""))
    row["source"] = source

    # Coerce numeric columns
    for col in _NUMERIC_COLUMNS:
        if col in row:
            row[col] = _to_float(row[col])

    # Ensure list columns are lists (not None)
    for col in ("objects_found", "yolo_boxes", "osm_flags", "legal_flags"):
        if col in row and not isinstance(row.get(col), list):
            row[col] = []

    # Drop legacy-only fields not on the model
    row.pop("legal_explanation", None)

    return row


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def upsert_zones(zones: Iterable[dict], source: str = "live", batch_size: int = 500) -> int:
    """Insert or update zones in PostgreSQL.

    On primary-key conflict (same `id`) the existing row is fully replaced.
    Returns the number of rows written.
    """
    zone_list = list(zones)
    if not zone_list:
        return 0

    written = 0
    with SessionLocal() as session:
        for i in range(0, len(zone_list), batch_size):
            batch = zone_list[i : i + batch_size]
            for zone_dict in batch:
                kwargs = _build_zone_kwargs(zone_dict, source)
                zone_id = kwargs["id"]
                if not zone_id:
                    continue  # skip rows without a valid id

                existing = session.get(Zone, zone_id)
                if existing is not None:
                    # Update all mutable fields
                    for key, value in kwargs.items():
                        if key != "id":
                            setattr(existing, key, value)
                else:
                    session.add(Zone(**kwargs))

            session.commit()
            written += len(batch)

    return written


def fetch_zones(source: str | None = None, limit: int = 10_000) -> list[dict]:
    """Fetch zones from PostgreSQL and return as plain dicts.

    Args:
        source: If given, filter by source ('flagged' or 'live').
        limit:  Maximum number of rows to return.
    """
    with SessionLocal() as session:
        query = session.query(Zone)
        if source:
            query = query.filter(Zone.source == source)
        query = query.limit(limit)
        return [zone.to_dict() for zone in query.all()]


def delete_zone(zone_id: str) -> None:
    """Delete a single zone by primary key."""
    with SessionLocal() as session:
        zone = session.get(Zone, str(zone_id))
        if zone is not None:
            session.delete(zone)
            session.commit()


def zone_exists(zone_id: str) -> bool:
    """Return True if a zone with the given id exists in the database."""
    with SessionLocal() as session:
        return session.get(Zone, str(zone_id)) is not None
