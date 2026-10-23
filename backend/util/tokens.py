"""Signed tokens (JWTs) for logging in and for email verification links."""

import os
from datetime import UTC, datetime, timedelta
from typing import Final, Literal

import jwt

JWT_SECRET = os.environ["JWT_SECRET"]
ALGORITHM: Final = "HS256"

# Each token says what it is for, so a verification link can't be used as a login token.
Purpose = Literal["access", "verify"]


def create_token(user_id: str, purpose: Purpose, hours: int) -> str:
    """Create a signed token for this user that expires after `hours`."""
    now = datetime.now(UTC)
    payload = {"sub": user_id, "purpose": purpose, "iat": now, "exp": now + timedelta(hours=hours)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def read_token(token: str, purpose: Purpose) -> str | None:
    """Return the user id inside a valid, unexpired token with this purpose, otherwise None."""
    try:
        payload = jwt.decode(
            token, JWT_SECRET, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
        )
    except jwt.InvalidTokenError:
        return None
    if payload.get("purpose") != purpose:
        return None
    return payload["sub"]
