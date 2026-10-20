import os

from fastapi.testclient import TestClient
from helpers import make_registration, make_ride, make_user

from database import SessionLocal
from main import app
from models import Ride

client = TestClient(app, headers={"x-key": os.environ["API_KEY"]})

# TEST HELPER METHODS


async def test_get_ride_nonexistent_ride():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    async with SessionLocal() as db:
        ride = await db.get(Ride, ride_id)
        await db.delete(ride)
        await db.commit()
    response = client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})

    assert response.status_code == 404


async def test_check_rider_not_rider():
    driver_id = await make_user("alice", False)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})

    assert response.status_code == 400


# CREATE RIDE REQUEST


async def test_create_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    response = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id})

    assert response.status_code == 201
    body = response.json()
    assert body["ride_id"] == ride_id
    assert body["rider_id"] == rider_id


async def test_create_ride_request_duplicate_request():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id})
    response = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id})

    assert response.status_code == 409


async def test_create_ride_request_already_registered():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)
    await make_registration(ride_id, rider_id)

    response = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id})

    assert response.status_code == 409


async def test_create_ride_request_nonexistent_ride():
    driver_id = await make_user("alice", True)
    await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    response = client.post("/rides/999/requests", json={"rider_id": rider_id})

    assert response.status_code == 404


# ACCEPT RIDE REQUEST


async def test_accept_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})

    assert response.status_code == 200
    body = response.json()
    assert body["ride_id"] == ride_id
    assert body["rider_id"] == rider_id


async def test_accept_ride_request_already_accepted():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})
    response = client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})

    assert response.status_code == 409


async def test_accept_ride_request_nonexistent_request():
    driver_id = await make_user("alice", True)
    await make_ride(driver_id)

    response = client.patch("/requests/9999/accept", json={"driver_id": driver_id})

    assert response.status_code == 404


async def test_accept_ride_request_unauthorized():
    driver_id = await make_user("alice", True)
    other_driver_id = await make_user("candice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept", json={"driver_id": other_driver_id})

    assert response.status_code == 403


async def test_accept_ride_request_at_capacity():
    driver_id = await make_user("alice", True)
    existing_rider_id = await make_user("bob", False)
    rider_id = await make_user("charlie", False)

    ride_id = await make_ride(driver_id, seats=1)
    await make_registration(ride_id, existing_rider_id)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})

    assert response.status_code == 400


# DECLINE RIDE REQUEST


async def test_decline_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/decline", json={"driver_id": driver_id})

    assert response.status_code == 200


async def test_decline_ride_request_already_declined():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    client.patch(f"/requests/{request_id}/decline", json={"driver_id": driver_id})
    response = client.patch(f"/requests/{request_id}/decline", json={"driver_id": driver_id})

    assert response.status_code == 409


async def test_decline_ride_request_nonexistent_request():
    driver_id = await make_user("alice", True)
    await make_ride(driver_id)

    response = client.patch("/requests/9999/decline", json={"driver_id": driver_id})

    assert response.status_code == 404


async def test_decline_ride_request_unauthorized():
    driver_id = await make_user("alice", True)
    other_driver_id = await make_user("candice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.patch(f"/requests/{request_id}/decline", json={"driver_id": other_driver_id})

    assert response.status_code == 403


# CANCEL RIDE REQUEST


async def test_cancel_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user(
        "bob", False, "0"
    )  # TODO: remove forced id=0 once we have authentication

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    response = client.delete(f"/requests/{request_id}/cancel")

    assert response.status_code == 204


async def test_cancel_ride_request_already_registered():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False, "0")

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": rider_id}).json()
    request_id = request["id"]
    client.patch(f"/requests/{request_id}/accept", json={"driver_id": driver_id})
    response = client.delete(f"/requests/{request_id}/cancel")

    assert response.status_code == 204


async def test_cancel_ride_request_nonexistent_request():
    response = client.delete("/requests/9999/cancel")

    assert response.status_code == 404


async def test_cancel_ride_request_unauthorized():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    await make_user("bob", False, "0")  # TODO: remove forced id=0 once we have authentication
    other_rider_id = await make_user("charlie", False, "1")

    request = client.post(f"/rides/{ride_id}/requests", json={"rider_id": other_rider_id}).json()
    request_id = request["id"]
    response = client.delete(f"/requests/{request_id}/cancel")

    assert response.status_code == 403
