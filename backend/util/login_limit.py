"""Slows down password guessing by counting failed logins per email.

The frontend reaches the backend through a proxy, so every request has the same IP address.
That's why this counts by email instead of by IP. The counts live in memory, so they reset
when the server restarts.
"""

import time
from collections import deque

from util.constants import FAILED_LOGIN_WINDOW_SECONDS, MAX_FAILED_LOGINS

# email -> when each recent failed login happened
_failed: dict[str, deque[float]] = {}


def now() -> float:
    return time.monotonic()


def _recent(email: str) -> deque[float]:
    """Failed logins for this email inside the window, dropping older ones."""
    attempts = _failed.get(email, deque())
    cutoff = now() - FAILED_LOGIN_WINDOW_SECONDS
    while attempts and attempts[0] <= cutoff:
        attempts.popleft()
    if not attempts:
        _failed.pop(email, None)
    return attempts


def too_many_failed_logins(email: str) -> bool:
    return len(_recent(email)) >= MAX_FAILED_LOGINS


def record_failed_login(email: str) -> None:
    attempts = _recent(email)
    attempts.append(now())
    _failed[email] = attempts


def clear_failed_logins(email: str) -> None:
    """Called after a correct password, so a few typos earlier don't count against the student."""
    _failed.pop(email, None)


def reset() -> None:
    """Forget every count. Tests use this so one test's failed logins don't affect the next."""
    _failed.clear()
