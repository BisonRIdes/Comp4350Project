from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import select

from database import SessionLocal
from main import app
from models import Ride, RideRegistration, RideRequest, User

client = TestClient(app)

POINT = {"type": "Point", "coordinates": [-97.14, 49.89]}
TIME = "2026-11-01T14:30:00"


async def make_user(name: str, is_driver: bool) -> str:
    async with SessionLocal() as db:
        user = User(
            username=name,
            email=f"{name}@b.com",
            password_hash="hash",
            is_driver=is_driver,
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


# list rides


async def test_list_rides_empty():
    response = client.get("/rides")

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

    response = client.get("/rides")

    assert response.status_code == 200
    times = [ride["departure_time"] for ride in response.json()]
    assert times == ["2026-11-01T09:00:00", "2026-12-01T09:00:00"]


# create ride


async def test_create_ride():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"driver_id": driver_id, "origin_point": POINT, "departure_time": TIME, "seats": 3},
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
        json={"driver_id": driver_id, "origin_point": POINT, "departure_time": TIME},
    )

    assert response.status_code == 201
    assert response.json()["seats"] == 1


async def test_create_ride_not_a_driver():
    rider_id = await make_user("rider", False)

    response = client.post(
        "/rides",
        json={"driver_id": rider_id, "origin_point": POINT, "departure_time": TIME},
    )

    assert response.status_code == 403


async def test_create_ride_unknown_user():
    response = client.post(
        "/rides",
        json={"driver_id": "nope", "origin_point": POINT, "departure_time": TIME},
    )

    assert response.status_code == 403


async def test_create_ride_invalid_body():
    driver_id = await make_user("driver", True)

    response = client.post(
        "/rides",
        json={"driver_id": driver_id, "origin_point": POINT, "departure_time": TIME, "seats": 0},
    )

    assert response.status_code == 422


# edit ride


async def test_edit_ride_changes_only_sent_fields():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, seats=2)

    response = client.patch(f"/rides/{ride_id}", json={"seats": 4})

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
    )

    assert response.status_code == 200
    assert response.json()["origin_point"] == new_point
    assert response.json()["departure_time"] == "2026-11-02T08:00:00"


async def test_edit_ride_not_found():
    response = client.patch("/rides/nope", json={"seats": 2})

    assert response.status_code == 404


async def test_edit_ride_empty_body():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.patch(f"/rides/{ride_id}", json={})

    assert response.status_code == 422


async def test_edit_ride_negative_seats():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.patch(f"/rides/{ride_id}", json={"seats": -1})

    assert response.status_code == 422


# delete ride


async def test_delete_ride():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)

    response = client.delete(f"/rides/{ride_id}")

    assert response.status_code == 204
    async with SessionLocal() as db:
        assert (await db.scalars(select(Ride))).all() == []


async def test_delete_ride_not_found():
    response = client.delete("/rides/nope")

    assert response.status_code == 404


async def test_delete_ride_with_accepted_rider_is_blocked():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider", False)
    ride_id = await make_ride(driver_id)
    async with SessionLocal() as db:
        db.add(RideRegistration(ride_id=ride_id, rider_id=rider_id))
        await db.commit()

    response = client.delete(f"/rides/{ride_id}")

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

    response = client.delete(f"/rides/{ride_id}")

    assert response.status_code == 204
    async with SessionLocal() as db:
        assert (await db.scalars(select(RideRequest))).all() == []
        assert (await db.scalars(select(Ride))).all() == []