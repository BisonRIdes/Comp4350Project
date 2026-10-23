from datetime import datetime

from sqlalchemy import select

from database import SessionLocal
from models import Ride, RideRegistration, RideRequest
from tests.helpers import POINT, auth, client, make_ride, make_user

TIME = "2026-11-01T14:30:00"

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
                driver_id=driver_id, origin_point=POINT, departure_time=datetime(2026, 12, 1, 9, 0)
            )
        )
        db.add(
            Ride(
                driver_id=driver_id, origin_point=POINT, departure_time=datetime(2026, 11, 1, 9, 0)
            )
        )
        await db.commit()

    response = client.get("/rides", headers=auth(driver_id))

    assert response.status_code == 200
    times = [ride["departure_time"] for ride in response.json()]
    assert times == ["2026-11-01T09:00:00", "2026-12-01T09:00:00"]


async def test_list_rides_not_logged_in():
    response = client.get("/rides")

    assert response.status_code == 401


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


async def test_edit_ride_changes_only_sent_fields():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=2)

    response = client.patch(f"/rides/{ride_id}", json={"seats": 4}, headers=auth(driver_id))

    assert response.status_code == 200
    body = response.json()
    assert body["seats"] == 4
    assert body["origin_point"] == POINT
    assert body["departure_time"] == "2026-11-01T14:30:00"


async def test_edit_ride_changes_point_and_time():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)
    new_point = {"type": "Point", "coordinates": [-97.0, 50.0]}

    response = client.patch(
        f"/rides/{ride_id}",
        json={"origin_point": new_point, "departure_time": "2026-11-02T08:00:00"},
        headers=auth(driver_id),
    )

    assert response.status_code == 200
    assert response.json()["origin_point"] == new_point
    assert response.json()["departure_time"] == "2026-11-02T08:00:00"


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


async def test_delete_ride_with_accepted_rider_is_blocked():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider", False)
    ride_id = await make_ride(driver_id)
    async with SessionLocal() as db:
        db.add(RideRegistration(ride_id=ride_id, rider_id=rider_id))
        await db.commit()

    response = client.delete(f"/rides/{ride_id}", headers=auth(driver_id))

    assert response.status_code == 409
    async with SessionLocal() as db:
        assert len((await db.scalars(select(Ride))).all()) == 1


async def test_delete_ride_removes_pending_requests():
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
