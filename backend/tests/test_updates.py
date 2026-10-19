from fastapi.testclient import TestClient

from main import app
from tests.helpers import client, make_request, make_ride, make_user


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
