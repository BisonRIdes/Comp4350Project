"""Sends emails (account verification, payment receipts) through Resend's HTTP API.

Without RESEND_API_KEY (local development and tests) the email is only logged, so you can copy the
link from the server output instead of needing a real inbox.
"""

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from typing import Final

from util.constants import VERIFY_TOKEN_HOURS

RESEND_URL: Final = "https://api.resend.com/emails"
EMAIL_TIMEOUT_SECONDS: Final = 10
# Resend's firewall (Cloudflare) blocks urllib's default "Python-urllib" User-Agent with a 403
# (error code 1010) before the request reaches Resend, so we name ourselves instead.
USER_AGENT: Final = "bisonrides-api/1.0"

logger = logging.getLogger(__name__)


def _post_to_resend(api_key: str, message: dict) -> None:
    request = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(message).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=EMAIL_TIMEOUT_SECONDS):
        pass


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173")


async def _send(to: str, subject: str, text: str) -> None:
    """Email `to` a plain-text message.

    Never raises: a failed email shouldn't undo what the student just did (signing up, paying).
    """
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY is not set. Email to %s: %s", to, text)
        return

    message = {
        "from": os.getenv("EMAIL_FROM", "BisonRides <onboarding@resend.dev>"),
        "to": [to],
        "subject": subject,
        "text": text,
    }
    try:
        await asyncio.to_thread(_post_to_resend, api_key, message)
    except urllib.error.HTTPError as error:
        # Resend says what's wrong in the body (e.g. an unverified sender), so log that too.
        detail = error.read()[:300].decode(errors="replace")
        logger.error("Could not send %r to %s: %s %s", subject, to, error, detail)
    except OSError as error:
        # URLError, HTTP errors, timeouts and dropped connections are all OSErrors.
        logger.error("Could not send %r to %s: %s", subject, to, error)


async def send_verification_email(to: str, token: str) -> None:
    """Email `to` the link that verifies their account. The student can ask for a new link."""
    link = f"{_frontend_url()}/verify?token={token}"
    await _send(
        to,
        "Verify your BisonRides account",
        "Welcome to BisonRides!\n\n"
        f"Open this link to verify your student email: {link}\n\n"
        f"The link works for {VERIFY_TOKEN_HOURS} hours.",
    )


async def send_payment_receipt(to: str, request_id: str, amount_cents: int) -> None:
    """Tell a rider their payment went through and their seat is confirmed."""
    link = f"{_frontend_url()}/requests/{request_id}/pay"
    await _send(
        to,
        "Your BisonRides seat is paid",
        f"Your payment of ${amount_cents / 100:.2f} CAD went through, so your seat is confirmed.\n\n"
        f"Ride details: {link}\n\n"
        "If you cancel your seat, you get the full amount back.",
    )
