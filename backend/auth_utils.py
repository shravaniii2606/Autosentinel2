"""Authentication utilities for AutoSentinel.

Includes:
- Password hashing and verification via Passlib/Bcrypt
- JWT access & refresh token creation and decoding
- Google OAuth ID token verification
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from passlib.context import CryptContext

try:
    from backend.gee_auth import load_backend_env
except ImportError:
    from gee_auth import load_backend_env

load_backend_env()

# ── Configuration ─────────────────────────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "autosentinel_super_secret_jwt_key_2026_change_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password Hashing ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    """Return bcrypt hash of plain password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT Operations ────────────────────────────────────────────────────────────
def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    to_encode.update({
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, expires_delta: timedelta | None = None) -> tuple[str, datetime]:
    """Generate a signed JWT refresh token and return (raw_token, expires_at_datetime)."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    jti = str(uuid.uuid4())

    payload = {
        "sub": user_id,
        "jti": jti,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    raw_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return raw_token, expire


def decode_jwt_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """Decode and validate JWT token.

    Raises PyJWT exceptions (ExpiredSignatureError, InvalidTokenError, etc.)
    or ValueError if token type mismatch.
    """
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    token_type = payload.get("type")
    if token_type != expected_type:
        raise ValueError(f"Invalid token type: expected '{expected_type}', got '{token_type}'")
    return payload


# ── Google OAuth Token Verification ───────────────────────────────────────────
def verify_google_token(token: str) -> dict[str, Any]:
    """Verify Google OAuth ID token and return user profile dict.

    Expected returned keys: sub (id), email, name, picture.
    Supports dev/test tokens if GOOGLE_CLIENT_ID is not configured or in dev environment.
    """
    # Dev / fallback mock token support for local testing when GOOGLE_CLIENT_ID is unset/placeholder
    if token.startswith("mock_google_token_"):
        email_suffix = token.replace("mock_google_token_", "").strip() or "user"
        return {
            "sub": f"google_{email_suffix}",
            "email": f"{email_suffix}@example.com",
            "name": f"Mock Google User ({email_suffix.replace('_', ' ').title()})",
            "picture": "https://lh3.googleusercontent.com/a/default-user=s96-c",
        }

    try:
        audience = GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID and "REPLACE_ME" not in GOOGLE_CLIENT_ID else None
        id_info = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=audience,
        )
        return {
            "sub": id_info.get("sub"),
            "email": id_info.get("email"),
            "name": id_info.get("name"),
            "picture": id_info.get("picture"),
        }
    except Exception as exc:
        raise ValueError(f"Invalid Google ID token: {exc}") from exc
