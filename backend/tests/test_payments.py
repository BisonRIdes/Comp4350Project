from sqlalchemy import select

from database import SessionLocal
from models import Payment, Ride
from tests.helpers import auth, client, make_request, make_ride, make_user
from util import stripe_api


async def accepted_seat(price_cents: int | None = 500) -> tuple[str, str, str]:
    """A rider whose request the driver accepted. Returns (driver id, rider id, request id)."""
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, price_cents=price_cents)
    rider_id = await make_user("rider")
    request_id = await make_request(ride_id, rider_id, "accepted")
    return driver_id, rider_id, request_id


async def save_payment(request_id: str, status: str = "unpaid", amount_cents: int = 500):
    async with SessionLocal() as db:
        db.add(
            Payment(
                request_id=request_id,
                stripe_payment_id=f"pi_{request_id}",
                amount_cents=amount_cents,
                status=status,
            )
        )
        await db.commit()


# start a payment


async def test_start_payment(fake_stripe):
    _, rider_id, request_id = await accepted_seat(price_cents=500)

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "unpaid"
    assert body["amount_cents"] == 500
    assert body["client_secret"] == f"pi_{request_id}_secret"
    assert fake_stripe.calls == [("start", request_id, 500)]
    async with SessionLocal() as db:
        payment = await db.get(Payment, request_id)
    assert payment.stripe_payment_id == f"pi_{request_id}"
    assert payment.status == "unpaid"


async def test_start_payment_again_reuses_the_same_payment(fake_stripe):
    _, rider_id, request_id = await accepted_seat()

    client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))
    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.status_code == 200
    assert response.json()["client_secret"] == f"pi_{request_id}_secret"
    assert [call[0] for call in fake_stripe.calls] == ["start", "get"]


async def test_start_payment_from_two_tabs_at_once(fake_stripe, monkeypatch):
    _, rider_id, request_id = await accepted_seat()

    async def other_tab_saves_first(request_id, amount_cents):
        intent = await fake_stripe.start_payment(request_id, amount_cents)
        await save_payment(request_id)
        return intent

    monkeypatch.setattr(stripe_api, "start_payment", other_tab_saves_first)

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.status_code == 200
    assert response.json()["client_secret"] == f"pi_{request_id}_secret"


async def test_start_payment_after_the_driver_changed_the_price(fake_stripe):
    driver_id, rider_id, request_id = await accepted_seat(price_cents=500)
    client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))
    async with SessionLocal() as db:
        ride = (await db.scalars(select(Ride))).one()
    client.patch(f"/rides/{ride.id}", json={"price_cents": 650}, headers=auth(driver_id))

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.json()["amount_cents"] == 650
    assert ("change", f"pi_{request_id}", 650) in fake_stripe.calls
    async with SessionLocal() as db:
        assert (await db.get(Payment, request_id)).amount_cents == 650


async def test_start_payment_already_paid_in_the_browser(fake_stripe):
    _, rider_id, request_id = await accepted_seat()
    client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))
    # the rider paid, but Stripe's webhook hasn't reached us yet
    fake_stripe.status = "succeeded"

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.json()["status"] == "processing"
    assert response.json()["client_secret"] is None
    assert not any(call[0] == "change" for call in fake_stripe.calls)


async def test_start_payment_when_already_paid(fake_stripe):
    _, rider_id, request_id = await accepted_seat()
    await save_payment(request_id, "paid", 500)

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.json() == {
        "request_id": request_id,
        "ride_id": response.json()["ride_id"],
        "amount_cents": 500,
        "status": "paid",
        "client_secret": None,
    }
    assert fake_stripe.calls == []


async def test_start_payment_for_a_ride_without_a_price(fake_stripe):
    _, rider_id, request_id = await accepted_seat(price_cents=None)

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.status_code == 409
    assert fake_stripe.calls == []


async def test_start_payment_before_the_driver_accepts(fake_stripe):
    driver_id = await make_user("driver", True)
    ride_id = await make_ride(driver_id, price_cents=500)
    rider_id = await make_user("rider")
    request_id = await make_request(ride_id, rider_id, "pending")

    response = client.post(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.status_code == 409


async def test_start_payment_for_someone_elses_seat(fake_stripe):
    _, _, request_id = await accepted_seat()
    other_id = await make_user("other")

    response = client.post(f"/requests/{request_id}/payment", headers=auth(other_id))

    assert response.status_code == 403
    assert fake_stripe.calls == []


async def test_start_payment_for_a_missing_request(fake_stripe):
    rider_id = await make_user("rider")

    response = client.post("/requests/nope/payment", headers=auth(rider_id))

    assert response.status_code == 404


async def test_start_payment_not_logged_in():
    response = client.post("/requests/nope/payment")

    assert response.status_code == 401


# read a payment


async def test_read_payment_before_paying():
    _, rider_id, request_id = await accepted_seat(price_cents=500)

    response = client.get(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.status_code == 200
    assert response.json()["status"] == "unpaid"
    assert response.json()["amount_cents"] == 500
    assert response.json()["client_secret"] is None


async def test_read_payment_once_paid():
    _, rider_id, request_id = await accepted_seat(price_cents=650)
    await save_payment(request_id, "paid", 500)

    response = client.get(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.json()["status"] == "paid"
    # what the rider actually paid, even though the driver changed the price since
    assert response.json()["amount_cents"] == 500


async def test_read_payment_for_a_ride_without_a_price():
    _, rider_id, request_id = await accepted_seat(price_cents=None)

    response = client.get(f"/requests/{request_id}/payment", headers=auth(rider_id))

    assert response.json()["amount_cents"] is None
