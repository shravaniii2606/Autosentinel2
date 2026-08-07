"""Seed specified user credentials into PostgreSQL database."""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    from backend.gee_auth import load_backend_env
except ImportError:
    from gee_auth import load_backend_env

load_backend_env()

try:
    from backend.auth_utils import hash_password
    from backend.database import Base, SessionLocal, engine
    from backend.models import User
except ImportError:
    from auth_utils import hash_password
    from database import Base, SessionLocal, engine
    from models import User


def seed_target_user():
    Base.metadata.create_all(bind=engine, checkfirst=True)
    db = SessionLocal()
    try:
        email = "shravaniii2619@gmail.com"
        password = "Shravani"
        user = db.query(User).filter(User.email == email).first()
        hashed = hash_password(password)

        if not user:
            user = User(
                id=f"usr_{uuid.uuid4().hex[:12]}",
                email=email,
                name="Shravani",
                role="admin",
                hashed_password=hashed,
            )
            db.add(user)
            print(f"[SUCCESS] User '{email}' created successfully.")
        else:
            user.hashed_password = hashed
            user.role = "admin"
            print(f"[SUCCESS] User '{email}' updated with new password.")
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Error seeding user: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_target_user()
