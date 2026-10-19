import os
from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from database import SessionLocal
from main import app
from models import Ride, RideRegistration, RideRequest, User

client = TestClient(app, headers={"x-key": os.environ["API_KEY"]})

POINT = {"type": "Point", "coordinates": [-97.14, 49.89]}
TIME = "2026-11-01T14:30:00"



def new_id() -> str:
    return str(uuid4())

async def make_user(name: str, is_driver: bool, i: str | None = None) -> str:
    user_id = i or new_id()
    async with SessionLocal() as db:
        user = User(
            id=user_id,
            username=name,
            email=f"{name}@b.com",
            password_hash="hash",
            is_driver=is_driver,
        )
        db.add(user)
        await db.commit()
        return user.id


async def make_ride(driver_id: str, i: str | None = None, seats: int = 2) -> str:
    ride_id = i or new_id()
    async with SessionLocal() as db:
        ride = Ride(
            id=ride_id,
            driver_id=driver_id,
            origin_point=POINT,
            departure_time=datetime(2026, 11, 1, 14, 30),
            seats=seats,
        )
        db.add(ride)
        await db.commit()
        return ride.id

async def make_registration(ride: str, rider: str):
    async with SessionLocal() as db:
        reg = RideRegistration(
            ride_id=ride,
            rider_id=rider
        )
        db.add(reg)
        await db.commit()


# CREATE RIDE REQUEST

async def test_create_ride_request_happy_path():
    ride_id = await make_ride("20")
    rider_id = await make_user("bob", False, i="0")

    response = client.post(f"/rides/{ride_id}/requests")

    assert response.status_code == 201
    body = response.json()
    assert body["ride_id"] == ride_id
    assert body["rider_id"] == rider_id

async def test_create_ride_request_duplicate_request():
    await make_ride("20", "20")
    await make_user("bob", False, "0")

    client.post("/rides/20/requests")
    response = client.post("/rides/20/requests")

    assert response.status_code == 409

async def test_create_ride_request_already_registered():
    ride_id = await make_ride("20", "20")
    rider_id = await make_user("bob", False, "0")
    await make_registration(ride_id, rider_id)

    response = client.post("/rides/20/requests")

    assert response.status_code == 409

async def test_create_ride_request_nonexistent_ride():
    await make_ride("20", "20")
    await make_user("bob", False, "0")

    response = client.post("/rides/999/requests")

    assert response.status_code == 404


# ACCEPT RIDE REQUEST

async def test_accept_ride_request_happy_path():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept")

    assert response.status_code == 200
    body = response.json()
    assert body["ride_id"] == ride_id
    assert body["rider_id"] == rider_id

async def test_accept_ride_request_already_accepted():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    client.patch(f"/requests/{request_id}/accept")
    response = client.patch(f"/requests/{request_id}/accept")

    assert response.status_code == 409

async def test_accept_ride_request_nonexistent_request():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    response = client.patch(f"/requests/9999/accept")

    assert response.status_code == 404

async def test_accept_ride_request_unauthorized():
    driver_id = await make_user("alice", True, "50")
    ride_id = await make_ride("50", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept")

    assert response.status_code == 403

async def test_accept_ride_request_at_capacity():
    driver_id = await make_user("driver", True, "0")
    existing_rider_id = await make_user("existing_rider", False)
    requester_id = await make_user("requester", False)

    ride_id = await make_ride(driver_id, seats=1)
    await make_registration(ride_id, existing_rider_id)

    request = client.post(f"/rides/{ride_id}/requests").json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept")

    assert response.status_code == 400


# DECLINE RIDE REQUEST

async def test_decline_ride_request_happy_path():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/decline")

    assert response.status_code == 200

async def test_decline_ride_request_already_declined():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    client.patch(f"/requests/{request_id}/decline")
    response = client.patch(f"/requests/{request_id}/decline")

    assert response.status_code == 409

async def test_decline_ride_request_nonexistent_request():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    response = client.patch(f"/requests/9999/decline")

    assert response.status_code == 404

async def test_decline_ride_request_unauthorized():
    driver_id = await make_user("alice", True, "50")
    ride_id = await make_ride("50", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/decline")

    assert response.status_code == 403

# CANCEL RIDE REQUEST

async def test_cancel_ride_request_happy_path():
    ride_id = await make_ride("0", "20")
    rider_id = await make_user("bob", True, "0")

    request = client.post("/rides/20/requests").json()
    request_id = request["id"]
    response = client.delete(f"/requests/{request_id}/cancel")

    assert response.status_code == 204

async def test_cancel_ride_request_nonexistent_request():
    response = client.delete(f"/requests/9999/cancel")

    assert response.status_code == 404