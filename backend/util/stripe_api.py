import asyncio
import logging
import os
from collections.abc import Callable
from typing import Final

import stripe
from fastapi import HTTPException

CURRENCY: Final = "cad"

logger = logging.getLogger(__name__)


def _client() -> stripe.StripeClient:
    api_key = os.getenv("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Payments aren't set up on this server yet")
    return stripe.StripeClient(api_key)


async def _call[T](request: Callable[[], T]) -> T:
    # The Stripe library blocks while it waits, so run it in a thread like the email sender does.
    try:
        return await asyncio.to_thread(request)
    except stripe.StripeError as error:
        logger.error("Stripe request failed: %s", error)
        raise HTTPException(
            status_code=502, detail="Couldn't reach our payment provider. Try again in a minute."
        ) from error


async def start_payment(request_id: str, amount_cents: int) -> stripe.PaymentIntent:
    """Create the payment a rider confirms in the browser for this ride request."""
    client = _client()
    return await _call(
        lambda: client.v1.payment_intents.create(
            params={
                "amount": amount_cents,
                "currency": CURRENCY,
                "metadata": {"request_id": request_id},
            },
            # a double click or a second tab gets the same payment instead of a new one
            options={"idempotency_key": f"pay-{request_id}-{amount_cents}"},
        )
    )


async def get_payment(intent_id: str) -> stripe.PaymentIntent:
    client = _client()
    return await _call(lambda: client.v1.payment_intents.retrieve(intent_id))


async def change_amount(intent_id: str, amount_cents: int) -> stripe.PaymentIntent:
    """Change what an unpaid payment charges, e.g. after the driver changed the price."""
    client = _client()
    return await _call(
        lambda: client.v1.payment_intents.update(intent_id, params={"amount": amount_cents})
    )


async def cancel_payment(intent_id: str) -> None:
    """Stop an unpaid payment from going through later."""
    client = _client()
    await _call(lambda: client.v1.payment_intents.cancel(intent_id))


async def refund_payment(intent_id: str) -> None:
    """Give the rider back everything they paid."""
    client = _client()
    await _call(
        lambda: client.v1.refunds.create(
            params={"payment_intent": intent_id},
            # refunding twice by accident is impossible: Stripe answers a repeat with the first refund
            options={"idempotency_key": f"refund-{intent_id}"},
        )
    )


def read_webhook_event(payload: bytes, signature: str | None) -> stripe.Event | None:
    """Return the event in a webhook call, or None if Stripe didn't send it.

    Stripe signs every webhook with our webhook secret, so a forged or changed call fails the check.
    """
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="Payments aren't set up on this server yet")
    try:
        return stripe.Webhook.construct_event(payload, signature, secret)
    except (ValueError, stripe.SignatureVerificationError):
        return None
