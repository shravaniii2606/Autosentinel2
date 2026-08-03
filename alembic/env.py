"""Alembic environment configuration for AutoSentinel.

Reads DATABASE_URL from the environment so it works across local dev,
CI, and production without editing alembic.ini.

The backend/.env file is loaded automatically (same mechanism as main.py)
so running `alembic upgrade head` from the project root works out of the box
as long as backend/.env is present.
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Make `backend` importable regardless of CWD ─────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# ── Load backend/.env so DATABASE_URL is available ─────────────────────────
try:
    from backend.gee_auth import load_backend_env
except ImportError:
    from gee_auth import load_backend_env
load_backend_env()

# ── Import models so Alembic can detect schema changes ──────────────────────
try:
    from backend.database import Base
    import backend.models  # noqa: F401 — registers Zone on Base.metadata
except ImportError:
    from database import Base
    import models  # noqa: F401

# ── Alembic config object ───────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# ── Inject DATABASE_URL from environment ────────────────────────────────────
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Add it to backend/.env (e.g. postgresql+psycopg2://user:pw@localhost:5432/autosentinel)."
    )
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))


def run_migrations_offline() -> None:
    """Emit DDL SQL to stdout without a live DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Apply migrations against a live database connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
