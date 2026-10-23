from sqlalchemy import select

from database import SessionLocal
from models import Ride, RideRegistration
from tests.helpers import auth, client, make_registration, make_request, make_ride, make_user


def request_ride(ride_id: str, rider_id: str) -> str:
    """The rider asks to join the ride; returns the new request's id."""
    return client.post(f"/rides/{ride_id}/requests", headers=auth(rider_id)).json()["id"]


# TEST HELPER METHODS


async def test_get_ride_nonexistent_ride():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    async with SessionLocal() as db:
        ride = await db.get(Ride, ride_id)
        await db.delete(ride)
        await db.commit()
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))

    assert response.status_code == 404


async def test_check_rider_not_rider():
    driver_id = await make_user("alice", False)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))

    assert response.status_code == 400


# CREATE RIDE REQUEST


async def test_create_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    response = client.post(f"/rides/{ride_id}/requests", headers=auth(rider_id))

    assert response.status_code == 201
    body = response.json()
    assert body["ride_id"] == ride_id
    assert body["rider_id"] == rider_id


async def test_create_ride_request_ignores_rider_id_in_body():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)
    other_rider_id = await make_user("charlie", False)

    response = client.post(
        f"/rides/{ride_id}/requests", json={"rider_id": other_rider_id}, headers=auth(rider_id)
    )

    assert response.status_code == 201
    assert response.json()["rider_id"] == rider_id


async def test_create_ride_request_not_logged_in():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)

    response = client.post(f"/rides/{ride_id}/requests")

    assert response.status_code == 401


async def test_create_ride_request_duplicate_request():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_ride(ride_id, rider_id)
    response = client.post(f"/rides/{ride_id}/requests", headers=auth(rider_id))

    assert response.status_code == 409


async def test_create_ride_request_already_registered():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)
    await make_registration(ride_id, rider_id)

    response = client.post(f"/rides/{ride_id}/requests", headers=auth(rider_id))

    assert response.status_code == 409


async def test_create_ride_request_nonexistent_ride():
    driver_id = await make_user("alice", True)
    await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    response = client.post("/rides/999/requests", headers=auth(rider_id))

    assert response.status_code == 404


# ACCEPT RIDE REQUEST


async def test_accept_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))

    assert response.status_code == 200
    body = response.json()
    assert body["ride_id"] == ride_id
    assert body["rider_id"] == rider_id


async def test_accept_ride_request_already_accepted():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))

    assert response.status_code == 409


async def test_accept_ride_request_nonexistent_request():
    driver_id = await make_user("alice", True)
    await make_ride(driver_id)

    response = client.patch("/requests/9999/accept", headers=auth(driver_id))

    assert response.status_code == 404


async def test_accept_ride_request_unauthorized():
    driver_id = await make_user("alice", True)
    other_driver_id = await make_user("candice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(other_driver_id))

    assert response.status_code == 403


async def test_accept_own_request_as_rider_is_not_allowed():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(rider_id))

    assert response.status_code == 403


async def test_accept_ride_request_at_capacity():
    driver_id = await make_user("alice", True)
    existing_rider_id = await make_user("bob", False)
    rider_id = await make_user("charlie", False)

    ride_id = await make_ride(driver_id, seats=1)
    await make_registration(ride_id, existing_rider_id)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))

    assert response.status_code == 400


# DECLINE RIDE REQUEST


async def test_decline_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/decline", headers=auth(driver_id))

    assert response.status_code == 200


async def test_decline_ride_request_already_declined():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    client.patch(f"/requests/{request_id}/decline", headers=auth(driver_id))
    response = client.patch(f"/requests/{request_id}/decline", headers=auth(driver_id))

    assert response.status_code == 409


async def test_decline_ride_request_nonexistent_request():
    driver_id = await make_user("alice", True)
    await make_ride(driver_id)

    response = client.patch("/requests/9999/decline", headers=auth(driver_id))

    assert response.status_code == 404


async def test_decline_ride_request_unauthorized():
    driver_id = await make_user("alice", True)
    other_driver_id = await make_user("candice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.patch(f"/requests/{request_id}/decline", headers=auth(other_driver_id))

    assert response.status_code == 403


# CANCEL RIDE REQUEST


async def test_cancel_ride_request_happy_path():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    response = client.delete(f"/requests/{request_id}/cancel", headers=auth(rider_id))

    assert response.status_code == 204


async def test_cancel_ride_request_already_registered():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)

    request_id = request_ride(ride_id, rider_id)
    client.patch(f"/requests/{request_id}/accept", headers=auth(driver_id))
    response = client.delete(f"/requests/{request_id}/cancel", headers=auth(rider_id))

    assert response.status_code == 204


async def test_cancel_accepted_request_keeps_other_riders():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id, seats=2)
    rider_id = await make_user("bob", False)
    other_rider_id = await make_user("charlie", False)
    await make_registration(ride_id, other_rider_id)
    request_id = await make_request(ride_id, rider_id, "accepted")
    await make_registration(ride_id, rider_id)

    response = client.delete(f"/requests/{request_id}/cancel", headers=auth(rider_id))

    assert response.status_code == 204
    async with SessionLocal() as db:
        riders = (await db.scalars(select(RideRegistration.rider_id))).all()
    assert riders == [other_rider_id]


async def test_cancel_ride_request_nonexistent_request():
    rider_id = await make_user("bob", False)

    response = client.delete("/requests/9999/cancel", headers=auth(rider_id))

    assert response.status_code == 404


async def test_cancel_ride_request_unauthorized():
    driver_id = await make_user("alice", True)
    ride_id = await make_ride(driver_id)
    rider_id = await make_user("bob", False)
    other_rider_id = await make_user("charlie", False)

    request_id = request_ride(ride_id, other_rider_id)
    response = client.delete(f"/requests/{request_id}/cancel", headers=auth(rider_id))

    assert response.status_code == 403
