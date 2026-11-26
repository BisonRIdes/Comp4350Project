from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from database import SessionLocal
from models import Rating
from tests.helpers import (
    auth,
    client,
    make_rating,
    make_registration,
    make_request,
    make_ride,
    make_user,
)

pytestmark = pytest.mark.regression

NEXT_WEEK = datetime.now(UTC) + timedelta(days=7)


async def ride_that_left() -> tuple[str, str, str]:
    """A ride that already left, with one accepted rider. Returns (driver, rider, ride) ids."""
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id)
    await make_registration(ride_id, rider_id)
    return driver_id, rider_id, ride_id


def rate(ride_id: str, rater_id: str, ratee_id: str, stars: int = 5, **extra):
    """The rater rates someone on the ride through the API."""
    return client.post(
        f"/rides/{ride_id}/ratings",
        headers=auth(rater_id),
        json={"ratee_id": ratee_id, "stars": stars, **extra},
    )


async def count_ratings() -> int:
    async with SessionLocal() as db:
        return await db.scalar(select(func.count()).select_from(Rating))


# create rating


async def test_rider_rates_driver():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, driver_id, stars=4)

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["ride_id"] == ride_id
    assert body["rater_id"] == rider_id
    assert body["ratee_id"] == driver_id
    assert body["ratee_role"] == "driver"
    assert body["stars"] == 4
    assert body["comment"] is None
    assert body["created_at"]


async def test_driver_rates_rider():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, driver_id, rider_id, stars=3)

    assert response.status_code == 201
    assert response.json()["ratee_role"] == "rider"
    assert response.json()["stars"] == 3


async def test_rating_saves_comment_trimmed():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, driver_id, comment="  On time and friendly  ")

    assert response.status_code == 201
    assert response.json()["comment"] == "On time and friendly"


async def test_rating_blank_comment_is_saved_as_none():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, driver_id, comment="   ")

    assert response.status_code == 201
    assert response.json()["comment"] is None


async def test_rating_null_comment_is_saved_as_none():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, driver_id, comment=None)

    assert response.status_code == 201
    assert response.json()["comment"] is None


async def test_rating_ignores_rater_id_in_body():
    driver_id, rider_id, ride_id = await ride_that_left()
    other_id = await make_user("other")

    response = client.post(
        f"/rides/{ride_id}/ratings",
        headers=auth(rider_id),
        json={"ratee_id": driver_id, "stars": 5, "rater_id": other_id},
    )

    assert response.status_code == 201
    assert response.json()["rater_id"] == rider_id


async def test_same_people_can_rate_each_other_on_another_ride():
    driver_id, rider_id, ride_id = await ride_that_left()
    other_ride_id = await make_ride(driver_id)
    await make_registration(other_ride_id, rider_id)

    first = rate(ride_id, rider_id, driver_id)
    second = rate(other_ride_id, rider_id, driver_id)

    assert first.status_code == 201
    assert second.status_code == 201


async def test_cant_rate_before_ride_leaves():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id, departure_time=NEXT_WEEK)
    await make_registration(ride_id, rider_id)

    response = rate(ride_id, rider_id, driver_id)

    assert response.status_code == 400
    assert await count_ratings() == 0


async def test_cant_rate_yourself():
    _, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, rider_id)

    assert response.status_code == 400
    assert await count_ratings() == 0


async def test_cant_rate_when_not_on_ride():
    driver_id, _, ride_id = await ride_that_left()
    outsider_id = await make_user("outsider")

    response = rate(ride_id, outsider_id, driver_id)

    assert response.status_code == 403
    assert await count_ratings() == 0


async def test_declined_rider_cant_rate():
    driver_id, _, ride_id = await ride_that_left()
    declined_id = await make_user("declined")
    await make_request(ride_id, declined_id, status="declined")

    response = rate(ride_id, declined_id, driver_id)

    assert response.status_code == 403


async def test_rider_cant_rate_another_rider():
    _, rider_id, ride_id = await ride_that_left()
    other_rider_id = await make_user("other_rider")
    await make_registration(ride_id, other_rider_id)

    response = rate(ride_id, rider_id, other_rider_id)

    assert response.status_code == 403
    assert await count_ratings() == 0


async def test_driver_cant_rate_someone_not_on_ride():
    driver_id, _, ride_id = await ride_that_left()
    outsider_id = await make_user("outsider")

    response = rate(ride_id, driver_id, outsider_id)

    assert response.status_code == 403
    assert await count_ratings() == 0


async def test_cant_rate_same_person_twice_on_a_ride():
    driver_id, rider_id, ride_id = await ride_that_left()

    rate(ride_id, rider_id, driver_id, stars=5)
    response = rate(ride_id, rider_id, driver_id, stars=1)

    assert response.status_code == 409
    assert await count_ratings() == 1


@pytest.mark.parametrize("stars", [0, 6])
async def test_rating_stars_out_of_range(stars: int):
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, driver_id, stars=stars)

    assert response.status_code == 422


async def test_rating_comment_too_long():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = rate(ride_id, rider_id, driver_id, comment="x" * 501)

    assert response.status_code == 422


async def test_rating_ride_not_found():
    driver_id, rider_id, _ = await ride_that_left()

    response = rate("nope", rider_id, driver_id)

    assert response.status_code == 404


async def test_rating_not_logged_in():
    driver_id, _, ride_id = await ride_that_left()

    response = client.post(f"/rides/{ride_id}/ratings", json={"ratee_id": driver_id, "stars": 5})

    assert response.status_code == 401


# pending ratings


async def test_pending_rider_sees_driver():
    driver_id, rider_id, ride_id = await ride_that_left()

    response = client.get("/ratings/pending", headers=auth(rider_id))

    assert response.status_code == 200
    assert response.json() == [
        {
            "ride_id": ride_id,
            "departure_time": "2026-11-01T14:30:00Z",
            "user_id": driver_id,
            "username": "driver",
            "role": "driver",
        }
    ]


async def test_pending_driver_sees_each_rider_by_name():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)
    for name in ("zoe", "amy"):
        await make_registration(ride_id, await make_user(name))

    response = client.get("/ratings/pending", headers=auth(driver_id))

    assert [(p["username"], p["role"]) for p in response.json()] == [
        ("amy", "rider"),
        ("zoe", "rider"),
    ]


async def test_pending_newest_ride_first():
    driver_id, rider_id, newer_ride_id = await ride_that_left()
    older_ride_id = await make_ride(driver_id, departure_time=datetime(2026, 10, 1, tzinfo=UTC))
    await make_registration(older_ride_id, rider_id)

    response = client.get("/ratings/pending", headers=auth(rider_id))

    assert [p["ride_id"] for p in response.json()] == [newer_ride_id, older_ride_id]


async def test_pending_disappears_once_rated():
    driver_id, rider_id, ride_id = await ride_that_left()

    rate(ride_id, rider_id, driver_id)
    response = client.get("/ratings/pending", headers=auth(rider_id))

    assert response.json() == []


async def test_pending_keeps_other_rides_with_the_same_person():
    driver_id, rider_id, ride_id = await ride_that_left()
    other_ride_id = await make_ride(driver_id, departure_time=datetime(2026, 10, 1, tzinfo=UTC))
    await make_registration(other_ride_id, rider_id)

    rate(ride_id, rider_id, driver_id)
    response = client.get("/ratings/pending", headers=auth(rider_id))

    assert [p["ride_id"] for p in response.json()] == [other_ride_id]


async def test_pending_skips_rides_that_havent_left():
    driver_id = await make_user("driver", True)
    rider_id = await make_user("rider")
    ride_id = await make_ride(driver_id, departure_time=NEXT_WEEK)
    await make_registration(ride_id, rider_id)

    as_rider = client.get("/ratings/pending", headers=auth(rider_id))
    as_driver = client.get("/ratings/pending", headers=auth(driver_id))

    assert as_rider.json() == []
    assert as_driver.json() == []


async def test_pending_empty_when_not_on_any_ride():
    await ride_that_left()
    outsider_id = await make_user("outsider")

    response = client.get("/ratings/pending", headers=auth(outsider_id))

    assert response.status_code == 200
    assert response.json() == []


async def test_pending_not_logged_in():
    response = client.get("/ratings/pending")

    assert response.status_code == 401


# user rating summary


async def test_user_rating_with_no_ratings():
    user_id = await make_user("new")

    response = client.get(f"/users/{user_id}/rating", headers=auth(user_id))

    assert response.status_code == 200
    assert response.json() == {
        "user_id": user_id,
        "as_driver": {"average": None, "count": 0},
        "as_rider": {"average": None, "count": 0},
        "recent_comments": [],
    }


async def test_user_rating_averages_driving_and_riding_apart():
    driver_id, rider_id, ride_id = await ride_that_left()
    second_rider_id = await make_user("second")
    await make_registration(ride_id, second_rider_id)
    await make_rating(ride_id, rider_id, driver_id, "driver", 4)
    await make_rating(ride_id, second_rider_id, driver_id, "driver", 5)
    # the driver also rode in someone else's car once
    other_driver_id = await make_user("other_driver", True)
    other_ride_id = await make_ride(other_driver_id)
    await make_rating(other_ride_id, other_driver_id, driver_id, "rider", 2)

    response = client.get(f"/users/{driver_id}/rating", headers=auth(rider_id))

    body = response.json()
    assert body["as_driver"] == {"average": 4.5, "count": 2}
    assert body["as_rider"] == {"average": 2.0, "count": 1}


async def test_user_rating_rounds_to_one_decimal():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)
    for i, stars in enumerate((5, 4, 4)):
        await make_rating(ride_id, await make_user(f"rider{i}"), driver_id, "driver", stars)

    response = client.get(f"/users/{driver_id}/rating", headers=auth(driver_id))

    # 13 / 3 = 4.333...
    assert response.json()["as_driver"] == {"average": 4.3, "count": 3}


async def test_user_rating_shows_newest_comments_without_who_wrote_them():
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id)
    start = datetime(2026, 11, 2, tzinfo=UTC)
    for i in range(6):
        await make_rating(
            ride_id,
            await make_user(f"rider{i}"),
            driver_id,
            "driver",
            4,
            comment=f"comment {i}",
            created_at=start + timedelta(hours=i),
        )
    # stars without a comment don't take up one of the spots
    await make_rating(
        ride_id,
        await make_user("quiet"),
        driver_id,
        "driver",
        5,
        created_at=start + timedelta(days=1),
    )

    response = client.get(f"/users/{driver_id}/rating", headers=auth(driver_id))

    comments = response.json()["recent_comments"]
    assert [c["comment"] for c in comments] == [f"comment {i}" for i in (5, 4, 3, 2, 1)]
    assert set(comments[0]) == {"stars", "comment", "role", "created_at"}
    assert comments[0]["role"] == "driver"
    assert comments[0]["stars"] == 4


async def test_user_rating_user_not_found():
    user_id = await make_user("someone")

    response = client.get("/users/nope/rating", headers=auth(user_id))

    assert response.status_code == 404


async def test_user_rating_not_logged_in():
    user_id = await make_user("someone")

    response = client.get(f"/users/{user_id}/rating")

    assert response.status_code == 401
