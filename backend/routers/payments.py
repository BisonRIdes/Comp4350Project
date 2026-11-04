from typing import Annotated, Final

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Payment, Ride, RideRequest, User
from schemas import PaymentOut
from util import stripe_api
from util.auth import CurrentUser

router = APIRouter(tags=["payments"])

# Stripe statuses for a payment the rider has already confirmed in the browser
PAID_IN_BROWSER: Final = ("processing", "succeeded")
# where Stripe sends payment events (set in the Stripe dashboard, pointing straight at Render)
WEBHOOK_PATH: Final = "/payments/webhook"


# the ride for the caller's accepted request; only accepted seats can be paid for
async def get_ride_for_seat(request_id: str, user: User, db: AsyncSession) -> Ride:
    ride_request = await db.get(RideRequest, request_id)
    if ride_request is None:
        raise HTTPException(status_code=404, detail="Ride request doesn't exist")
    if ride_request.rider_id != user.id:
        raise HTTPException(status_code=403, detail="You can only pay for your own seat")
    if ride_request.status != "accepted":
        raise HTTPException(status_code=409, detail="The driver hasn't accepted this request")
    return await db.get(Ride, ride_request.ride_id)


# start (or pick up) paying for an accepted seat; the browser then confirms it with Stripe
@router.post("/requests/{request_id}/payment", response_model=PaymentOut)
async def start_payment(
    request_id: str, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> PaymentOut:
    ride = await get_ride_for_seat(request_id, user, db)
    # read now: a rollback below expires the ride, and async sessions can't reload it lazily
    ride_id, price_cents = ride.id, ride.price_cents
    payment = await db.get(Payment, request_id)
    if payment is not None and payment.status == "paid":
        return PaymentOut(
            request_id=request_id,
            ride_id=ride_id,
            amount_cents=payment.amount_cents,
            status="paid",
        )
    if price_cents is None:
        raise HTTPException(
            status_code=409, detail="This ride has no price, so there's nothing to pay"
        )

    if payment is None:
        intent = await stripe_api.start_payment(request_id, price_cents)
        db.add(
            Payment(request_id=request_id, stripe_payment_id=intent.id, amount_cents=price_cents)
        )
        try:
            await db.commit()
        except IntegrityError:
            # another tab saved it first; Stripe gave both the same payment (same idempotency key)
            await db.rollback()
    else:
        intent = await stripe_api.get_payment(payment.stripe_payment_id)
        # the driver changed the price before the rider paid
        if intent.status not in PAID_IN_BROWSER and payment.amount_cents != price_cents:
            intent = await stripe_api.change_amount(payment.stripe_payment_id, price_cents)
            payment.amount_cents = price_cents
            await db.commit()

    paid_in_browser = intent.status in PAID_IN_BROWSER
    return PaymentOut(
        request_id=request_id,
        ride_id=ride_id,
        amount_cents=intent.amount,
        status="processing" if paid_in_browser else "unpaid",
        client_secret=None if paid_in_browser else intent.client_secret,
    )


# whether a seat is paid, e.g. while waiting for Stripe to confirm a payment
@router.get("/requests/{request_id}/payment", response_model=PaymentOut)
async def read_payment(
    request_id: str, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> PaymentOut:
    ride = await get_ride_for_seat(request_id, user, db)
    payment = await db.get(Payment, request_id)
    return PaymentOut(
        request_id=request_id,
        ride_id=ride.id,
        amount_cents=payment.amount_cents if payment else ride.price_cents,
        status=payment.status if payment else "unpaid",
    )


# Stripe calls this when a payment goes through. It has no API key or login: Stripe signs every
# call instead, so only Stripe can mark a seat paid. Answering 2xx tells Stripe to stop retrying.
@router.post(WEBHOOK_PATH, status_code=204, include_in_schema=False)
async def stripe_webhook(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    event = stripe_api.read_webhook_event(
        await request.body(), request.headers.get("stripe-signature")
    )
    if event is None:
        raise HTTPException(status_code=400, detail="Not a valid Stripe webhook")
    if event.type != "payment_intent.succeeded":
        return

    intent = event.data.object
    payment = await db.scalar(select(Payment).where(Payment.stripe_payment_id == intent.id))
    # Stripe can send the same event more than once, so only the first one counts
    if payment is not None and payment.status == "unpaid":
        payment.status = "paid"
        payment.amount_cents = intent.amount_received
        await db.commit()
