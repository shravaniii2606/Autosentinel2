"""Subscription helpers for feature gating."""

from __future__ import annotations

from typing import Any

FREE_SCAN_LIMIT = 3


def is_subscribed(user: Any) -> bool:
    """Return True only for currently paid users."""
    return getattr(user, "subscription_status", "free") == "active"


def can_scan(user: Any) -> bool:
    """Return True when a user has paid access or free scans remaining."""
    scans_used = int(getattr(user, "scans_used", 0) or 0)
    return is_subscribed(user) or scans_used < FREE_SCAN_LIMIT


def scans_remaining(user: Any) -> int | None:
    """Return remaining free scans, or None for unlimited paid access."""
    if is_subscribed(user):
        return None

    scans_used = int(getattr(user, "scans_used", 0) or 0)
    return max(0, FREE_SCAN_LIMIT - scans_used)
