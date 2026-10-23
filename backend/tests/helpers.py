"""Shared setup for API tests: a client with the API key and helpers to seed the DB."""

import os
from datetime import datetime
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


async def make_ride(driver_id: str, seats: int = 2) -> str:
    async with SessionLocal() as db:
        ride = Ride(
            driver_id=driver_id,
            origin_point=POINT,
            departure_time=datetime(2026, 11, 1, 14, 30),
            seats=seats,
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
