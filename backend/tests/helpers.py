"""Shared setup for API tests: a client with the API key and helpers to seed the DB."""

import os
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from database import SessionLocal
from main import app
from models import Ride, RideRegistration, RideRequest, User
from util.security import hash_password
from util.tokens import create_token

client = TestClient(app, headers={"x-key": os.environ["API_KEY"]})

POINT = {"type": "Point", "coordinates": [-97.14, 49.89]}


def new_id() -> str:
    return str(uuid4())


def auth(user_id: str) -> dict[str, str]:
    """Headers that log a request in as this user."""
    return {"Authorization": f"Bearer {create_token(user_id, 'access', 1)}"}


async def make_user(
    name: str,
    is_driver: bool = False,
    i: str | None = None,
    verified: bool = False,
    password: str | None = None,
) -> str:
    user_id = i or new_id()
    async with SessionLocal() as db:
        user = User(
            id=user_id,
            username=name,
            email=f"{name}@myumanitoba.ca",
            # hashing is slow on purpose, so only do it for tests that log in
            password_hash=await hash_password(password) if password else "hash",
            is_driver=is_driver,
            is_verified=verified,
        )
        db.add(user)
        await db.commit()
        return user.id


async def make_ride(driver_id: str, seats: int = 2, price_cents: int | None = None) -> str:
    async with SessionLocal() as db:
        ride = Ride(
            driver_id=driver_id,
            origin_point=POINT,
            departure_time=datetime(2026, 11, 1, 14, 30),
            seats=seats,
            price_cents=price_cents,
        )
        db.add(ride)
        await db.commit()
        return ride.id


async def make_request(ride_id: str, rider_id: str, status: str = "pending") -> str:
    async with SessionLocal() as db:
        req = RideRequest(ride_id=ride_id, rider_id=rider_id, status=status)
        db.add(req)
        await db.commit()
        return req.id


async def make_registration(ride: str, rider: str):
    async with SessionLocal() as db:
        reg = RideRegistration(ride_id=ride, rider_id=rider)
        db.add(reg)
        await db.commit()


class FakeStripe:
    """Stands in for util/stripe_api.py in route tests and remembers what was asked of Stripe.

    `status` is what Stripe says about the payment, e.g. set it to "succeeded" once the rider paid.
    """

    def __init__(self):
        self.status = "requires_payment_method"
        self.amount = 0
        self.calls: list[tuple] = []

    def intent(self, intent_id: str) -> SimpleNamespace:
        return SimpleNamespace(
            id=intent_id,
            client_secret=f"{intent_id}_secret",
            status=self.status,
            amount=self.amount,
        )

    async def start_payment(self, request_id: str, amount_cents: int) -> SimpleNamespace:
        self.calls.append(("start", request_id, amount_cents))
        self.amount = amount_cents
        return self.intent(f"pi_{request_id}")

    async def get_payment(self, intent_id: str) -> SimpleNamespace:
        self.calls.append(("get", intent_id))
        return self.intent(intent_id)

    async def change_amount(self, intent_id: str, amount_cents: int) -> SimpleNamespace:
        self.calls.append(("change", intent_id, amount_cents))
        self.amount = amount_cents
        return self.intent(intent_id)

    async def cancel_payment(self, intent_id: str) -> None:
        self.calls.append(("cancel", intent_id))

    async def refund_payment(self, intent_id: str) -> None:
        self.calls.append(("refund", intent_id))
