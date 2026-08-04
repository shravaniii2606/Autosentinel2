"""Seed PostgreSQL with zone data from the JSON data files.

Run once (or re-run safely — all upserts on primary key):

    cd c:\\Users\\Admin\\Desktop\\Autosentinel2
    python backend/seed_db.py

Env var required:
    DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/autosentinel

This script seeds:
  - data/flagged_zones.json  → source='flagged'  (931 rows)
  - data/live_zones.json     → source='live'     (~1353 rows)
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# ── Ensure project root is on sys.path ──────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# ── Load backend/.env so DATABASE_URL is available ──────────────────────────
try:
    from backend.gee_auth import load_backend_env
except ImportError:
    from gee_auth import load_backend_env
load_backend_env()

# ── Validate DATABASE_URL before importing the DB layer ────────────────────
database_url = os.environ.get("DATABASE_URL", "")
if not database_url or "REPLACE_ME" in database_url:
    sys.exit(
        "[seed_db] ERROR: DATABASE_URL is not configured.\n"
        "Edit backend/.env and set DATABASE_URL to your PostgreSQL connection string,\n"
        "e.g.: DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/autosentinel"
    )

try:
    from backend.db_client import upsert_zones
    from backend.models import Zone
    from backend.database import engine, Base
except ImportError:
    from db_client import upsert_zones
    from models import Zone
    from database import engine, Base

DATA_DIR = ROOT / "data"


def load_json(path: Path) -> list[dict]:
    if not path.exists():
        print(f"  [skip] {path.name} not found")
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        print(f"  [skip] {path.name} is not a JSON array")
        return []
    return data


def main() -> None:
    print("=" * 60)
    print("AutoSentinel — PostgreSQL seed script")
    print("=" * 60)
    print(f"  DATABASE_URL: {database_url.split('@')[-1]}")  # hide credentials

    # Ensure table exists (idempotent — won't drop existing data)
    print("\n[1/3] Ensuring schema exists...")
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print("  ✓ Schema ready")

    # Seed flagged zones
    print("\n[2/3] Seeding flagged_zones.json → source='flagged'...")
    flagged = load_json(DATA_DIR / "flagged_zones.json")
    if flagged:
        written = upsert_zones(flagged, source="flagged")
        print(f"  ✓ {written} flagged zones upserted")

    # Seed live zones
    print("\n[3/3] Seeding live_zones.json → source='live'...")
    live = load_json(DATA_DIR / "live_zones.json")
    if live:
        written = upsert_zones(live, source="live")
        print(f"  ✓ {written} live zones upserted")

    print("\n✅ Seed complete.")


if __name__ == "__main__":
    main()
