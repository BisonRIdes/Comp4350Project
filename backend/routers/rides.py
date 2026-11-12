from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride, RideRegistration, RideRequest, User
from schemas import CreateRideBody, RideOut, UpdateRideBody
from util.auth import CurrentUser, get_current_user
from util.seats import count_accepted

# every rides route needs a logged-in student
router = APIRouter(prefix="/rides", tags=["rides"], dependencies=[Depends(get_current_user)])


def check_owner(ride: Ride, user: User) -> None:
    if ride.driver_id != user.id:
        raise HTTPException(status_code=403, detail="You can only change your own rides")


# a ride for the API, with how many seats accepted riders haven't taken yet
def to_ride_out(ride: Ride, accepted: int) -> RideOut:
    return RideOut(
        id=ride.id,
        driver_id=ride.driver_id,
        origin_point=ride.origin_point,
        departure_time=ride.departure_time,
        seats=ride.seats,
        price_cents=ride.price_cents,
        seats_left=max(ride.seats - accepted, 0),
    )


# return a list of all rides for populating the frontend
@router.get("", response_model=list[RideOut])
async def list_rides(db: Annotated[AsyncSession, Depends(get_db)]) -> list[RideOut]:
    # accepted riders per ride, counted in the same query instead of once per ride
    accepted = (
        select(RideRegistration.ride_id, func.count().label("accepted"))
        .group_by(RideRegistration.ride_id)
        .subquery()
    )
    result = await db.execute(
        select(Ride, func.coalesce(accepted.c.accepted, 0))
        .outerjoin(accepted, accepted.c.ride_id == Ride.id)
        .order_by(Ride.departure_time)
    )
    return [to_ride_out(ride, count) for ride, count in result.all()]


# get one ride, e.g. for the ride details page
@router.get("/{ride_id}", response_model=RideOut)
async def get_ride(ride_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> RideOut:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")
    return to_ride_out(ride, await count_accepted(ride_id, db))


# driver can post a ride
@router.post("", status_code=201, response_model=RideOut)
async def create_ride(
    body: CreateRideBody, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> RideOut:
    if not user.is_driver:
        raise HTTPException(status_code=403, detail="User is not a driver")

    ride = Ride(
        driver_id=user.id,
        origin_point=body.origin_point.model_dump(),
        departure_time=body.departure_time,
        seats=body.seats,
        price_cents=body.price_cents,
    )
    db.add(ride)
    await db.commit()
    await db.refresh(ride)
    # a new ride has no accepted riders yet
    return to_ride_out(ride, 0)


# driver can edit a ride (partial update)
@router.patch("/{ride_id}", response_model=RideOut)
async def edit_ride(
    ride_id: str,
    body: UpdateRideBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RideOut:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")
    check_owner(ride, user)

    # only the fields the client actually sent
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="No fields to update")

    # can't drop below the riders already accepted, or someone would lose their seat
    if "seats" in changes and changes["seats"] < await count_accepted(ride_id, db):
        raise HTTPException(status_code=409, detail="Seats can't be fewer than accepted riders")

    for field, value in changes.items():
        setattr(ride, field, value)

    await db.commit()
    await db.refresh(ride)
    return to_ride_out(ride, await count_accepted(ride_id, db))


# driver can delete a ride
@router.delete("/{ride_id}", status_code=204)
async def delete_ride(
    ride_id: str, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")
    check_owner(ride, user)

    if await count_accepted(ride_id, db):
        raise HTTPException(status_code=409, detail="Ride has accepted riders")

    await db.execute(delete(RideRequest).where(RideRequest.ride_id == ride_id))
    await db.delete(ride)
    await db.commit()
