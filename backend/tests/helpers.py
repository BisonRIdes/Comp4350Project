"""Shared setup for API tests: a client with the API key and helpers to seed the DB."""

import os
from datetime import datetime

from fastapi.testclient import TestClient

from database import SessionLocal
from main import app
from models import Ride, RideRequest, User

client = TestClient(app, headers={"x-key": os.environ["API_KEY"]})

POINT = {"type": "Point", "coordinates": [-97.14, 49.89]}


async def make_user(name: str, is_driver: bool = False) -> str:
    async with SessionLocal() as db:
        user = User(username=name, email=f"{name}@b.com", password_hash="hash", is_driver=is_driver)
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
