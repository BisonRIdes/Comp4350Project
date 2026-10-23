"""Sends the account verification email through Resend's HTTP API.

Without RESEND_API_KEY (local development and tests) the link is only logged, so you can copy it
from the server output instead of needing a real inbox.
"""

import asyncio
import json
import logging
import os
import urllib.request
from typing import Final

from util.constants import VERIFY_TOKEN_HOURS

RESEND_URL: Final = "https://api.resend.com/emails"
EMAIL_TIMEOUT_SECONDS: Final = 10

logger = logging.getLogger(__name__)


def _post_to_resend(api_key: str, message: dict) -> None:
    request = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(message).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=EMAIL_TIMEOUT_SECONDS):
        pass


async def send_verification_email(to: str, token: str) -> None:
    """Email `to` the link that verifies their account.

    Never raises: a failed email shouldn't undo a sign-up, and the student can ask for a new link.
    """
    link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/verify?token={token}"
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY is not set. Verification link for %s: %s", to, link)
        return

    message = {
        "from": os.getenv("EMAIL_FROM", "BisonRides <onboarding@resend.dev>"),
        "to": [to],
        "subject": "Verify your BisonRides account",
        "text": (
            "Welcome to BisonRides!\n\n"
            f"Open this link to verify your student email: {link}\n\n"
            f"The link works for {VERIFY_TOKEN_HOURS} hours."
        ),
    }
    try:
        await asyncio.to_thread(_post_to_resend, api_key, message)
    except OSError as error:
        # URLError, HTTP errors, timeouts and dropped connections are all OSErrors.
        logger.error("Could not send verification email to %s: %s", to, error)
