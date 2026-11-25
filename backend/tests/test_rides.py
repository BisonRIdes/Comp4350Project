import logging
from datetime import UTC, datetime
from unittest.mock import AsyncMock, call

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from database import SessionLocal
from models import Payment, Ride, RideDetour, RideRegistration, RideRequest
from routers import rides
from schemas import Detour
from tests.helpers import (
    DETOUR_POINTS,
    POINT,
    auth,
    client,
    make_detour,
    make_payment,
    make_registration,
    make_request,
    make_ride,
    make_user,
)
from util import stripe_api

pytestmark = pytest.mark.regression

TIME = "2026-11-01T14:30:00Z"

# list rides


async def test_list_rides_empty():
    user_id = await make_user("rider")

    response = client.get("/rides", headers=auth(user_id))

    assert response.status_code == 200
    assert response.json() == []


async def test_list_rides_returns_rides_soonest_first():
    driver_id = await make_user("driver", True)
    async with SessionLocal() as db:
        db.add(
            Ride(
                driver_id=driver_id,
                origin_point=POINT,
                departure_time=datetime(2026, 12, 1, 9, 0, tzinfo=UTC),
            )
        )
        db.add(
            Ride(
                driver_id=driver_id,
                origin_point=POINT,
                departure_time=datetime(2026, 11, 1, 9, 0, tzinfo=UTC),
            )
        )
        await db.commit()

    response = client.get("/rides", headers=auth(driver_id))

    assert response.status_code == 200
    times = [ride["departure_time"] for ride in response.json()]
    assert times == ["2026-11-01T09:00:00Z", "2026-12-01T09:00:00Z"]


async def test_list_rides_shows_seats_left():
    driver_id = await make_user("driver", True)
    taken_ride = await make_ride(driver_id, seats=2)
    await make_registration(taken_ride, await make_user("rider"))
    empty_ride = await make_ride(driver_id, seats=3)

    response = client.get("/rides", headers=auth(driver_id))

    seats_left = {ride["id"]: ride["seats_left"] for ride in response.json()}
    assert seats_left == {taken_ride: 1, empty_ride: 3}


async def test_list_rides_shows_driver_name():
    driver_id = await make_user("driver", True)
    other_driver_id = await make_user("other", True)
    ride_id = await make_ride(driver_id)
    other_ride_id = await make_ride(other_driver_id)

    response = client.get("/rides", headers=auth(driver_id))

    names = {ride["id"]: ride["driver_username"] for ride in response.json()}
    assert names == {ride_id: "driver", other_ride_id: "other"}


async def test_list_rides_not_logged_in():
    response = client.get("/rides")

    assert response.status_code == 401


# get ride


async def test_get_ride():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=3)
    rider_id = await make_user("rider")

    response = client.get(f"/rides/{ride_id}", headers=auth(rider_id))

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == ride_id
    assert body["driver_id"] == driver_id
    assert body["driver_username"] == "driver"
    assert body["origin_point"] == POINT
    assert body["departure_time"] == TIME
    assert body["seats"] == 3


async def test_get_ride_shows_seats_left():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=1)
    rider_id = await make_user("rider")
    await make_registration(ride_id, rider_id)

    response = client.get(f"/rides/{ride_id}", headers=auth(rider_id))

    assert response.json()["seats_left"] == 0


async def test_get_ride_not_found():
    user_id = await make_user("rider")

    response = client.get("/rides/nope", headers=auth(user_id))

    assert response.status_code == 404


# create ride


async def test_create_ride():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME, "seats": 3},
        headers=auth(driver_id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["driver_id"] == driver_id
    assert body["origin_point"] == POINT
    assert body["seats"] == 3
    # nobody has been accepted onto a new ride yet
    assert body["seats_left"] == 3
    assert body["driver_username"] == "driver"
    async with SessionLocal() as db:
        assert len((await db.scalars(select(Ride))).all()) == 1


async def test_create_ride_defaults_to_one_seat():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME},
        headers=auth(driver_id),
    )

    assert response.status_code == 201
    assert response.json()["seats"] == 1


async def test_create_ride_saves_the_price_per_seat():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME, "price_cents": 500},
        headers=auth(driver_id),
    )

    assert response.status_code == 201
    assert response.json()["price_cents"] == 500


async def test_create_ride_without_a_price():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME},
        headers=auth(driver_id),
    )

    assert response.status_code == 201
    assert response.json()["price_cents"] is None


async def test_create_ride_price_below_stripes_minimum():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME, "price_cents": 49},
        headers=auth(driver_id),
    )

    assert response.status_code == 422


async def test_create_ride_ignores_driver_id_in_body():
    driver_id = await make_user("driver", True)
    other_driver_id = await make_user("other", True)

    response = client.post(
        "/rides",
        json={"driver_id": other_driver_id, "origin_point": POINT, "departure_time": TIME},
        headers=auth(driver_id),
    )

    assert response.status_code == 201
    assert response.json()["driver_id"] == driver_id


async def test_create_ride_not_a_driver():
    rider_id = await make_user("rider", False)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME},
        headers=auth(rider_id),
    )

    assert response.status_code == 403


async def test_create_ride_not_logged_in():
    response = client.post("/rides", json={"origin_point": POINT, "departure_time": TIME})

    assert response.status_code == 401


async def test_create_ride_invalid_body():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"origin_point": POINT, "departure_time": TIME, "seats": 0},
        headers=auth(driver_id),
    )

    assert response.status_code == 422


# edit ride


async def test_edit_ride_seats_left_counts_accepted_riders():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=2)
    await make_registration(ride_id, await make_user("rider"))

    response = client.patch(f"/rides/{ride_id}", json={"seats": 4}, headers=auth(driver_id))

    assert response.json()["seats_left"] == 3
    assert response.json()["driver_username"] == "driver"


async def test_edit_ride_changes_only_sent_fields():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=2)

    response = client.patch(f"/rides/{ride_id}", json={"seats": 4}, headers=auth(driver_id))

    assert response.status_code == 200
    body = response.json()
    assert body["seats"] == 4
    assert body["origin_point"] == POINT
    assert body["departure_time"] == "2026-11-01T14:30:00Z"


async def test_edit_ride_changes_point_and_time():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)
    new_point = {"type": "Point", "coordinates": [-97.0, 50.0]}

    response = client.patch(
        f"/rides/{ride_id}",
        json={"origin_point": new_point, "departure_time": "2026-11-02T08:00:00Z"},
        headers=auth(driver_id),
    )

    assert response.status_code == 200
    assert response.json()["origin_point"] == new_point
    assert response.json()["departure_time"] == "2026-11-02T08:00:00Z"


async def test_edit_ride_price():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, price_cents=500)

    response = client.patch(f"/rides/{ride_id}", json={"price_cents": 650}, headers=auth(driver_id))

    assert response.status_code == 200
    assert response.json()["price_cents"] == 650


@pytest.fixture
def change_emails(monkeypatch):
    """Replaces the "ride changed" email, to check who would have got one."""
    sent = AsyncMock()
    monkeypatch.setattr(rides, "send_ride_changed", sent)
    return sent


async def test_edit_ride_time_emails_accepted_riders(change_emails, caplog):
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=3)
    accepted_id = await make_user("accepted")
    await make_registration(ride_id, accepted_id)
    await make_request(ride_id, await make_user("pending"), "pending")

    with caplog.at_level(logging.INFO, logger="routers.rides"):
        response = client.patch(
            f"/rides/{ride_id}",
            json={"departure_time": "2026-12-01T08:00:00Z", "origin_point": POINT},
            headers=auth(driver_id),
        )

    assert response.status_code == 200
    # the starting point was sent but didn't change, and only accepted riders are told
    change_emails.assert_awaited_once_with("accepted@myumanitoba.ca", "driver", "departure time")
    assert f"Ride {ride_id} edited by its driver {driver_id}: departure_time, origin_point" in (
        caplog.text
    )


async def test_edit_ride_seats_or_price_sends_no_email(change_emails):
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=3)
    await make_registration(ride_id, await make_user("accepted"))

    response = client.patch(
        f"/rides/{ride_id}", json={"seats": 4, "price_cents": 600}, headers=auth(driver_id)
    )

    assert response.status_code == 200
    change_emails.assert_not_awaited()


async def test_edit_ride_not_found():
    driver_id = await make_user("driver", True)

    response = client.patch("/rides/nope", json={"seats": 2}, headers=auth(driver_id))

    assert response.status_code == 404


async def test_edit_someone_elses_ride():
    driver_id = await make_user("driver", True)
    other_driver_id = await make_user("other", True)
    ride_id = await make_ride(driver_id, seats=2)

    response = client.patch(f"/rides/{ride_id}", json={"seats": 4}, headers=auth(other_driver_id))

    assert response.status_code == 403
    async with SessionLocal() as db:
        assert (await db.get(Ride, ride_id)).seats == 2


async def test_edit_ride_empty_body():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.patch(f"/rides/{ride_id}", json={}, headers=auth(driver_id))

    assert response.status_code == 422


async def test_edit_ride_negative_seats():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.patch(f"/rides/{ride_id}", json={"seats": -1}, headers=auth(driver_id))

    assert response.status_code == 422


async def test_edit_ride_seats_below_accepted_riders_is_blocked():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=3)
    async with SessionLocal() as db:
        for name in ("rider1", "rider2"):
            rider_id = await make_user(name)
            db.add(RideRegistration(ride_id=ride_id, rider_id=rider_id))
        await db.commit()

    response = client.patch(f"/rides/{ride_id}", json={"seats": 1}, headers=auth(driver_id))

    assert response.status_code == 409
    async with SessionLocal() as db:
        assert (await db.get(Ride, ride_id)).seats == 3


async def test_edit_ride_seats_equal_to_accepted_riders():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id, seats=3)
    async with SessionLocal() as db:
        db.add(RideRegistration(ride_id=ride_id, rider_id=rider_id))
        await db.commit()

    response = client.patch(f"/rides/{ride_id}", json={"seats": 1}, headers=auth(driver_id))

    assert response.status_code == 200
    assert response.json()["seats"] == 1


# delete ride


async def test_delete_ride():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.delete(f"/rides/{ride_id}", headers=auth(driver_id))

    assert response.status_code == 204
    async with SessionLocal() as db:
        assert (await db.scalars(select(Ride))).all() == []


async def test_delete_ride_not_found():
    driver_id = await make_user("driver", True)

    response = client.delete("/rides/nope", headers=auth(driver_id))

    assert response.status_code == 404


async def test_delete_someone_elses_ride():
    driver_id = await make_user("driver", True)
    other_driver_id = await make_user("other", True)
    ride_id = await make_ride(driver_id)

    response = client.delete(f"/rides/{ride_id}", headers=auth(other_driver_id))

    assert response.status_code == 403
    async with SessionLocal() as db:
        assert len((await db.scalars(select(Ride))).all()) == 1


@pytest.fixture
def cancel_emails(monkeypatch):
    """Replaces the "ride cancelled" email, to check who would have got one."""
    sent = AsyncMock()
    monkeypatch.setattr(rides, "send_ride_cancelled", sent)
    return sent


async def ride_with_riders() -> tuple[str, str, dict[str, str]]:
    """A ride with a paid rider, an accepted rider who hasn't paid, and a pending request.

    Returns (driver id, ride id, request id by rider name).
    """
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=3, price_cents=500)
    requests = {}
    for name, status in [("paid", "accepted"), ("unpaid", "accepted"), ("pending", "pending")]:
        rider_id = await make_user(name)
        requests[name] = await make_request(ride_id, rider_id, status)
        if status == "accepted":
            await make_registration(ride_id, rider_id)
            await make_detour(ride_id, rider_id, DETOUR_POINTS[0])
    await make_payment(requests["paid"], "paid", 500)
    await make_payment(requests["unpaid"], "unpaid", 500)
    return driver_id, ride_id, requests


async def test_delete_ride_with_riders_refunds_and_emails_them(fake_stripe, cancel_emails):
    driver_id, ride_id, requests = await ride_with_riders()

    response = client.delete(f"/rides/{ride_id}", headers=auth(driver_id))

    assert response.status_code == 204
    assert ("refund", f"pi_{requests['paid']}") in fake_stripe.calls
    assert ("cancel", f"pi_{requests['unpaid']}") in fake_stripe.calls
    async with SessionLocal() as db:
        for table in (Ride, RideRequest, RideRegistration, RideDetour, Payment):
            assert (await db.scalars(select(table))).all() == []
    assert sorted(cancel_emails.await_args_list) == [
        call("paid@myumanitoba.ca", "driver", 500),
        call("pending@myumanitoba.ca", "driver", None),
        call("unpaid@myumanitoba.ca", "driver", None),
    ]


async def test_delete_ride_keeps_everything_if_a_refund_fails(
    fake_stripe, cancel_emails, monkeypatch
):
    driver_id, ride_id, _ = await ride_with_riders()

    async def stripe_is_down(intent_id):
        raise HTTPException(status_code=502, detail="Couldn't reach our payment provider")

    monkeypatch.setattr(stripe_api, "refund_payment", stripe_is_down)

    response = client.delete(f"/rides/{ride_id}", headers=auth(driver_id))

    assert response.status_code == 502
    async with SessionLocal() as db:
        assert len((await db.scalars(select(Ride))).all()) == 1
        assert len((await db.scalars(select(RideRegistration))).all()) == 2
        assert len((await db.scalars(select(Payment))).all()) == 2
    cancel_emails.assert_not_awaited()


async def test_delete_ride_is_logged(fake_stripe, cancel_emails, caplog):
    driver_id, ride_id, _ = await ride_with_riders()

    with caplog.at_level(logging.INFO, logger="routers.rides"):
        client.delete(f"/rides/{ride_id}", headers=auth(driver_id))

    assert f"Ride {ride_id} cancelled by its driver {driver_id} (3 requests)" in caplog.text


async def test_delete_ride_removes_pending_requests(cancel_emails):
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider", False)
    ride_id = await make_ride(driver_id)
    async with SessionLocal() as db:
        db.add(RideRequest(ride_id=ride_id, rider_id=rider_id))
        await db.commit()

    response = client.delete(f"/rides/{ride_id}", headers=auth(driver_id))

    assert response.status_code == 204
    async with SessionLocal() as db:
        assert (await db.scalars(select(RideRequest))).all() == []
        assert (await db.scalars(select(Ride))).all() == []


# get detours


async def test_get_detours():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider", False)
    ride_id = await make_ride(driver_id)
    await make_detour(ride_id, rider_id, DETOUR_POINTS[0])

    response = client.get(f"/rides/{ride_id}/detours", headers=auth(driver_id))

    assert response.status_code == 200
    body = response.json()
    assert body["ride_id"] == ride_id
    assert len(body["detours"]) == 1
    assert body["detours"][0]["owner_id"] == rider_id
    assert body["detours"][0]["detour_point"] == DETOUR_POINTS[0]


async def test_get_detours_multiple_detours_sorted():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider", False)
    rider2_id = await make_user("rider2", False)
    ride_id = await make_ride(driver_id)
    await make_detour(ride_id, rider_id, DETOUR_POINTS[0])
    await make_detour(ride_id, rider2_id, DETOUR_POINTS[1])

    response = client.get(f"/rides/{ride_id}/detours", headers=auth(driver_id))

    assert response.status_code == 200
    body = response.json()
    assert body["ride_id"] == ride_id
    assert len(body["detours"]) == 2
    detourFar = Detour.model_validate(body["detours"][0])
    detourClose = Detour.model_validate(body["detours"][1])
    assert detourFar.detour_point.coordinates[0] == DETOUR_POINTS[1]["coordinates"][0]
    assert detourFar.detour_point.coordinates[1] == DETOUR_POINTS[1]["coordinates"][1]
    assert detourClose.detour_point.coordinates[0] == DETOUR_POINTS[0]["coordinates"][0]
    assert detourClose.detour_point.coordinates[1] == DETOUR_POINTS[0]["coordinates"][1]


async def test_get_detours_no_detours():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.get(f"/rides/{ride_id}/detours", headers=auth(driver_id))

    assert response.status_code == 200
    body = response.json()
    assert body["ride_id"] == ride_id
    assert len(body["detours"]) == 0


async def test_get_detours_unauthorized():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("riderA", False)
    other_rider_id = await make_user("riderB", False)
    ride_id = await make_ride(driver_id)
    await make_detour(ride_id, rider_id, DETOUR_POINTS[0])

    response = client.get(f"/rides/{ride_id}/detours", headers=auth(other_rider_id))

    assert response.status_code == 403


async def test_get_detours_nonexistent_ride():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider", False)
    ride_id = await make_ride(driver_id)
    await make_detour(ride_id, rider_id, DETOUR_POINTS[0])

    response = client.get("/rides/999/detours", headers=auth(driver_id))

    assert response.status_code == 404
