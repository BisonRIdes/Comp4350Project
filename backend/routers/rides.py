from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride, RideRegistration, RideRequest, User
from schemas import CreateRideBody, RideOut, UpdateRideBody

router = APIRouter(prefix="/rides", tags=["rides"])


# return a list of all rides for populating the frontend
@router.get("", response_model=list[RideOut])
async def list_rides(db: Annotated[AsyncSession, Depends(get_db)]) -> Sequence[Ride]:
    result = await db.execute(select(Ride).order_by(Ride.departure_time))
    return result.scalars().all()


# driver can post a ride
@router.post("", status_code=201, response_model=RideOut)
async def create_ride(body: CreateRideBody, db: Annotated[AsyncSession, Depends(get_db)]) -> Ride:
    driver = await db.get(User, body.driver_id)
    if driver is None or not driver.is_driver:
        raise HTTPException(status_code=403, detail="User is not a driver")

    ride = Ride(
        driver_id=body.driver_id,
        origin_point=body.origin_point.model_dump(),
        departure_time=body.departure_time,
        seats=body.seats,
    )
    db.add(ride)
    await db.commit()
    await db.refresh(ride)
    return ride


# driver can edit a ride (partial update)
@router.patch("/{ride_id}", response_model=RideOut)
async def edit_ride(
    ride_id: str, body: UpdateRideBody, db: Annotated[AsyncSession, Depends(get_db)]
) -> Ride:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")

    # only the fields the client actually sent
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="No fields to update")

    for field, value in changes.items():
        setattr(ride, field, value)

    await db.commit()
    await db.refresh(ride)
    return ride


# driver can delete a ride
@router.delete("/{ride_id}", status_code=204)
async def delete_ride(ride_id: str, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")

    accepted = await db.scalar(
        select(func.count())
        .select_from(RideRegistration)
        .where(RideRegistration.ride_id == ride_id)
    )
    if accepted:
        raise HTTPException(status_code=409, detail="Ride has accepted riders")

    await db.execute(delete(RideRequest).where(RideRequest.ride_id == ride_id))
    await db.delete(ride)
    await db.commit()
