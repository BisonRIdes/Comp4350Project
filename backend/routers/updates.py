from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride, RideRequest, User
from schemas import UpdatesOut

router = APIRouter(prefix="/updates", tags=["updates"])


# get any info needed to display on the page for a given user
@router.get("", response_model=UpdatesOut)
async def get_updates(user_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> dict:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # driver view: pending requests on rides this user is driving
    pending = await db.execute(
        select(RideRequest)
        .join(Ride, Ride.id == RideRequest.ride_id)
        .where(Ride.driver_id == user_id, RideRequest.status == "pending")
    )

    # rider view: this user's own requests that got an answer
    answered = await db.execute(
        select(RideRequest).where(
            RideRequest.rider_id == user_id,
            RideRequest.status.in_(["accepted", "declined"]),
        )
    )

    return {
        "pending_requests": pending.scalars().all(),
        "request_updates": answered.scalars().all(),
    }
