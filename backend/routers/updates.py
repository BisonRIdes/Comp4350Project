from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride, RideRequest
from schemas import UpdatesOut
from util.auth import CurrentUser

router = APIRouter(prefix="/updates", tags=["updates"])


# get any info needed to display on the page for the logged-in user
@router.get("", response_model=UpdatesOut)
async def get_updates(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> UpdatesOut:
    # driver view: pending requests on rides this user is driving
    pending = await db.execute(
        select(RideRequest)
        .join(Ride, Ride.id == RideRequest.ride_id)
        .where(Ride.driver_id == user.id, RideRequest.status == "pending")
        .order_by(Ride.departure_time)
    )

    # rider view: this user's own requests that got an answer
    answered = await db.execute(
        select(RideRequest)
        .join(Ride, Ride.id == RideRequest.ride_id)
        .where(
            RideRequest.rider_id == user.id,
            RideRequest.status.in_(["accepted", "declined"]),
        )
        .order_by(Ride.departure_time)
    )

    return UpdatesOut(
        pending_requests=pending.scalars().all(),
        request_updates=answered.scalars().all(),
    )
