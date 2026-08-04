"""FastAPI router for authentication endpoints and protection dependencies."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

try:
    from backend.auth_utils import (
        create_access_token,
        create_refresh_token,
        decode_jwt_token,
        hash_password,
        verify_google_token,
        verify_password,
    )
    from backend.database import get_db
    from backend.models import RefreshToken, User
except ImportError:
    from auth_utils import (
        create_access_token,
        create_refresh_token,
        decode_jwt_token,
        hash_password,
        verify_google_token,
        verify_password,
    )
    from database import get_db
    from models import RefreshToken, User

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)


# ── Request / Response Schemas ────────────────────────────────────────────────
class GoogleAuthRequest(BaseModel):
    token: str


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class PasswordLoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


# ── Dependency Helpers ────────────────────────────────────────────────────────
def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security),
    authorization: str | None = Header(None),
    access_token_cookie: str | None = Cookie(None, alias="access_token"),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT access token from Bearer header or cookie and return User."""
    raw_token = None
    if auth and auth.credentials:
        raw_token = auth.credentials
    elif authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization.split(" ", 1)[1]
    elif access_token_cookie:
        raw_token = access_token_cookie

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_jwt_token(raw_token, expected_type="access")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.get(User, str(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
        )
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Enforce that current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this resource",
        )
    return current_user


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/google", response_model=AuthTokenResponse)
def auth_google(
    payload: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Sign in or register user using Google OAuth ID token."""
    try:
        profile = verify_google_token(payload.token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {exc}",
        ) from exc

    email = profile["email"]
    google_sub = profile["sub"]

    # Check for existing user by email or ID
    user = db.query(User).filter((User.email == email) | (User.id == google_sub)).first()

    if not user:
        # Create new user automatically on first Google sign in
        user = User(
            id=google_sub or f"usr_{uuid.uuid4().hex[:12]}",
            email=email,
            name=profile.get("name"),
            picture=profile.get("picture"),
            role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user profile info if changed
        if profile.get("name") and user.name != profile.get("name"):
            user.name = profile.get("name")
        if profile.get("picture") and user.picture != profile.get("picture"):
            user.picture = profile.get("picture")
        db.commit()

    # Issue JWT access & refresh tokens
    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    raw_refresh_token, expires_at = create_refresh_token(user.id)

    # Persist refresh token in DB
    ref_record = RefreshToken(
        id=f"ref_{uuid.uuid4().hex[:16]}",
        user_id=user.id,
        token=raw_refresh_token,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(ref_record)
    db.commit()

    # Set secure HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
    )
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }


@router.post("/refresh")
def auth_refresh(
    payload: RefreshRequest | None = None,
    refresh_token_cookie: str | None = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db),
):
    """Issue a new access token using a valid refresh token."""
    raw_refresh_token = (payload and payload.refresh_token) or refresh_token_cookie
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    try:
        token_payload = decode_jwt_token(raw_refresh_token, expected_type="refresh")
        user_id = token_payload.get("sub")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired refresh token: {exc}",
        ) from exc

    # Verify refresh token in DB
    ref_record = db.query(RefreshToken).filter(
        RefreshToken.token == raw_refresh_token,
        RefreshToken.revoked.is_(False),
    ).first()

    if not ref_record or ref_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid, expired, or revoked",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Issue new access token
    new_access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def auth_logout(
    payload: LogoutRequest | None = None,
    response: Response = None,
    refresh_token_cookie: str | None = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db),
):
    """Invalidate refresh token and clear auth cookies."""
    raw_refresh_token = (payload and payload.refresh_token) or refresh_token_cookie
    if raw_refresh_token:
        ref_record = db.query(RefreshToken).filter(RefreshToken.token == raw_refresh_token).first()
        if ref_record:
            ref_record.revoked = True
            db.commit()

    if response:
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

    return {"message": "Successfully logged out"}


@router.get("/me")
def auth_me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user profile."""
    return {"user": current_user.to_dict()}


@router.post("/login", response_model=AuthTokenResponse)
def auth_login(
    payload: PasswordLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Optional local email/password sign-in for administrative or non-Google accounts."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    raw_refresh_token, expires_at = create_refresh_token(user.id)

    ref_record = RefreshToken(
        id=f"ref_{uuid.uuid4().hex[:16]}",
        user_id=user.id,
        token=raw_refresh_token,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(ref_record)
    db.commit()

    if response:
        response.set_cookie("access_token", access_token, httponly=True, samesite="lax")
        response.set_cookie("refresh_token", raw_refresh_token, httponly=True, samesite="lax")

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }


@router.post("/register", response_model=AuthTokenResponse)
def auth_register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Create a new user account with email and password."""
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    user = User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        email=email_clean,
        name=payload.name or email_clean.split("@")[0].capitalize(),
        role="user",
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    raw_refresh_token, expires_at = create_refresh_token(user.id)

    ref_record = RefreshToken(
        id=f"ref_{uuid.uuid4().hex[:16]}",
        user_id=user.id,
        token=raw_refresh_token,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(ref_record)
    db.commit()

    if response:
        response.set_cookie("access_token", access_token, httponly=True, samesite="lax")
        response.set_cookie("refresh_token", raw_refresh_token, httponly=True, samesite="lax")

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }

