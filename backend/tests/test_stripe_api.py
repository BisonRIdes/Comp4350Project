import hashlib
import hmac
import json
import logging
import time
from unittest.mock import MagicMock

import pytest
import stripe
from fastapi import HTTPException

from util import stripe_api

WEBHOOK_SECRET = "whsec_test"


@pytest.fixture
def client(monkeypatch):
    """The StripeClient our helpers create, with every Stripe call replaced."""
    fake = MagicMock()
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.setattr(stripe, "StripeClient", lambda api_key: fake)
    return fake


def signed(payload: str, secret: str = WEBHOOK_SECRET) -> str:
    """A Stripe-Signature header for this payload, made the way Stripe makes it."""
    timestamp = int(time.time())
    signature = hmac.new(
        secret.encode(), f"{timestamp}.{payload}".encode(), hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


async def test_start_payment(client):
    await stripe_api.start_payment("req-1", 500)

    client.v1.payment_intents.create.assert_called_once_with(
        params={"amount": 500, "currency": "cad", "metadata": {"request_id": "req-1"}},
        options={"idempotency_key": "pay-req-1-500"},
    )


async def test_get_change_and_cancel_a_payment(client):
    await stripe_api.get_payment("pi_1")
    await stripe_api.change_amount("pi_1", 650)
    await stripe_api.cancel_payment("pi_1")

    client.v1.payment_intents.retrieve.assert_called_once_with("pi_1")
    client.v1.payment_intents.update.assert_called_once_with("pi_1", params={"amount": 650})
    client.v1.payment_intents.cancel.assert_called_once_with("pi_1")


async def test_refund_payment_can_only_happen_once(client):
    await stripe_api.refund_payment("pi_1")

    client.v1.refunds.create.assert_called_once_with(
        params={"payment_intent": "pi_1"}, options={"idempotency_key": "refund-pi_1"}
    )


async def test_without_a_secret_key_payments_are_unavailable():
    with pytest.raises(HTTPException) as error:
        await stripe_api.start_payment("req-1", 500)

    assert error.value.status_code == 503


async def test_a_stripe_error_is_logged_and_becomes_a_502(client, caplog):
    client.v1.payment_intents.create.side_effect = stripe.APIConnectionError("no network")

    with caplog.at_level(logging.ERROR), pytest.raises(HTTPException) as error:
        await stripe_api.start_payment("req-1", 500)

    assert error.value.status_code == 502
    assert "no network" in caplog.text


def test_read_webhook_event(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    payload = json.dumps(
        {"id": "evt_1", "object": "event", "type": "payment_intent.succeeded", "data": {}}
    )

    event = stripe_api.read_webhook_event(payload.encode(), signed(payload))

    assert event.type == "payment_intent.succeeded"


def test_webhook_signed_with_another_secret_is_rejected(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    payload = json.dumps({"id": "evt_1", "object": "event", "type": "payment_intent.succeeded"})

    assert stripe_api.read_webhook_event(payload.encode(), signed(payload, "whsec_other")) is None
    assert stripe_api.read_webhook_event(payload.encode(), None) is None


def test_webhook_that_isnt_json_is_rejected(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)

    assert stripe_api.read_webhook_event(b"not json", signed("not json")) is None


def test_webhook_without_a_secret_is_unavailable():
    with pytest.raises(HTTPException) as error:
        stripe_api.read_webhook_event(b"{}", "t=1,v1=abc")

    assert error.value.status_code == 503
