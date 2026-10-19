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


async def make_ride(driver_id: str) -> str:
    async with SessionLocal() as db:
        ride = Ride(driver_id=driver_id, origin_point=POINT, departure_time=datetime(2026, 11, 1))
        db.add(ride)
        await db.commit()
        return ride.id


async def make_request(ride_id: str, rider_id: str, status: str = "pending") -> str:
    async with SessionLocal() as db:
        req = RideRequest(ride_id=ride_id, rider_id=rider_id, status=status)
        db.add(req)
        await db.commit()
        return req.id


async def test_updates_user_not_found():
    response = client.get("/updates", params={"user_id": "missing"})

    assert response.status_code == 404


async def test_updates_missing_user_id():
    response = client.get("/updates")

    assert response.status_code == 422


async def test_updates_empty():
    user_id = await make_user("nobody")

    response = client.get("/updates", params={"user_id": user_id})

    assert response.status_code == 200
    assert response.json() == {"pending_requests": [], "request_updates": []}


async def test_updates_driver_sees_only_pending_on_own_rides():
    driver = await make_user("driver", True)
    other_driver = await make_user("other", True)
    rider = await make_user("rider")
    ride = await make_ride(driver)
    other_ride = await make_ride(other_driver)
    pending_id = await make_request(ride, rider)
    await make_request(ride, rider, "accepted")
    await make_request(other_ride, rider)

    response = client.get("/updates", params={"user_id": driver})

    body = response.json()
    assert response.status_code == 200
    assert [r["id"] for r in body["pending_requests"]] == [pending_id]
    assert body["pending_requests"][0]["status"] == "pending"
    assert body["request_updates"] == []


async def test_updates_rider_sees_accepted_and_declined():
    driver = await make_user("driver", True)
    rider = await make_user("rider")
    ride = await make_ride(driver)
    await make_request(ride, rider)
    accepted_id = await make_request(ride, rider, "accepted")
    declined_id = await make_request(ride, rider, "declined")

    response = client.get("/updates", params={"user_id": rider})

    body = response.json()
    assert response.status_code == 200
    assert body["pending_requests"] == []
    assert {r["id"] for r in body["request_updates"]} == {accepted_id, declined_id}


async def test_updates_requires_key():
    response = TestClient(app).get("/updates", params={"user_id": "x"})

    assert response.status_code == 401