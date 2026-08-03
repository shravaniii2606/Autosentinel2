"""SQLAlchemy engine and session configuration for AutoSentinel.

Reads DATABASE_URL from the environment (populated by load_backend_env()
which is called at the top of main.py before this module is imported).

Usage
-----
from backend.database import SessionLocal, engine, Base

# As a context manager:
with SessionLocal() as session:
    session.add(...)
    session.commit()
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/autosentinel",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # detect stale connections before using them
    pool_size=5,
    max_overflow=10,
    echo=False,               # set True temporarily for SQL debug logging
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,   # rows remain usable after session.commit()
)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
