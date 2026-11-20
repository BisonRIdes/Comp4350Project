from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride, RideRequest
from schemas import UpdatesOut
from util.auth import CurrentUser
from util.request_details import request_details_query

router = APIRouter(prefix="/updates", tags=["updates"])


# get any info needed to display on the page for the logged-in user
@router.get("", response_model=UpdatesOut)
async def get_updates(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> UpdatesOut:
    # driver view: pending requests on rides this user is driving
    pending = await db.execute(
        request_details_query().where(Ride.driver_id == user.id, RideRequest.status == "pending")
    )

    # rider view: this user's own requests that got an answer
    answered = await db.execute(
        request_details_query().where(
            RideRequest.rider_id == user.id,
            RideRequest.status.in_(["accepted", "declined"]),
        )
    )

    # each row has the request plus names and ride details, read by attribute like a model
    return UpdatesOut(
        pending_requests=pending.all(),
        request_updates=answered.all(),
    )
