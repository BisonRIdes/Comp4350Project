import pytest
from fastapi.testclient import TestClient

from main import app
from tests.helpers import POINT, auth, client, make_request, make_ride, make_user

pytestmark = pytest.mark.regression


async def test_updates_not_logged_in():
    response = client.get("/updates")

    assert response.status_code == 401


async def test_updates_empty():
    user_id = await make_user("nobody")

    response = client.get("/updates", headers=auth(user_id))

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

    response = client.get("/updates", headers=auth(driver))

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

    response = client.get("/updates", headers=auth(rider))

    body = response.json()
    assert response.status_code == 200
    assert body["pending_requests"] == []
    assert {r["id"] for r in body["request_updates"]} == {accepted_id, declined_id}


async def test_updates_includes_request_details():
    driver = await make_user("driver", True)
    rider = await make_user("rider")
    ride = await make_ride(driver)
    await make_request(ride, rider)
    await make_request(ride, rider, "accepted")
    expected = {
        "rider_username": "rider",
        "driver_username": "driver",
        "departure_time": "2026-11-01T14:30:00",
        "origin_point": POINT,
    }

    pending = client.get("/updates", headers=auth(driver)).json()["pending_requests"][0]
    answered = client.get("/updates", headers=auth(rider)).json()["request_updates"][0]

    # rider and driver come from different joins, so check neither side got swapped
    assert {key: pending[key] for key in expected} == expected
    assert {key: answered[key] for key in expected} == expected


async def test_updates_user_who_drives_and_rides():
    alice = await make_user("alice", True)
    bob = await make_user("bob")
    carol = await make_user("carol", True)
    alice_ride = await make_ride(alice)
    carol_ride = await make_ride(carol)
    bob_request = await make_request(alice_ride, bob)
    alice_request = await make_request(carol_ride, alice, "accepted")

    response = client.get("/updates", headers=auth(alice))

    body = response.json()
    assert response.status_code == 200
    assert [r["id"] for r in body["pending_requests"]] == [bob_request]
    assert body["pending_requests"][0]["rider_username"] == "bob"
    assert [r["id"] for r in body["request_updates"]] == [alice_request]
    assert body["request_updates"][0]["driver_username"] == "carol"


async def test_updates_ignores_user_id_in_query():
    driver = await make_user("driver", True)
    rider = await make_user("rider")
    ride = await make_ride(driver)
    await make_request(ride, rider)

    # asking for the driver's updates while logged in as the rider shows the rider's own
    response = client.get("/updates", params={"user_id": driver}, headers=auth(rider))

    assert response.json()["pending_requests"] == []


async def test_updates_requires_key():
    user_id = await make_user("nobody")

    response = TestClient(app).get("/updates", headers=auth(user_id))

    assert response.status_code == 401
