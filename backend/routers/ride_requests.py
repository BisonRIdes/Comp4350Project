from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride, RideRegistration, RideRequest, User

router = APIRouter(tags=["ride requests"])


class RideRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ride_id: str
    rider_id: str
    status: str


class RideRegistrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ride_id: str
    rider_id: str


# make a request to join a ride
@router.post("/rides/{ride_id}/requests", status_code=201, response_model=RideRequestOut)
async def create_ride_request(
    ride_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> RideRequest:
    auth_rider_id = "0"  # !!TODO: get this from authenticated user

    # check if ride exists
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride doesn't exist")

    # check if they've already created a ride request/registration for this ride
    duplicate_requests = await db.scalar(
        select(RideRequest).where(
            RideRequest.ride_id == ride_id, RideRequest.rider_id == auth_rider_id
        )
    )
    if duplicate_requests is not None:
        raise HTTPException(
            status_code=409, detail="Rider has already made a request for this ride"
        )
    duplicate_registers = await db.scalar(
        select(RideRegistration).where(
            RideRegistration.ride_id == ride_id, RideRegistration.rider_id == auth_rider_id
        )
    )
    if duplicate_registers is not None:
        raise HTTPException(status_code=409, detail="Rider has already registered for this ride")

    ride_request = RideRequest(
        ride_id=ride_id,
        rider_id=auth_rider_id,
    )
    db.add(ride_request)
    await db.commit()
    await db.refresh(ride_request)
    return ride_request


# driver accepts a ride request from a user
@router.patch("/requests/{request_id}/accept", status_code=200, response_model=RideRegistrationOut)
async def accept_ride_request(
    request_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> RideRegistration:
    auth_driver_id = "0"  # !!TODO: get this from authenticated user

    # get ride request
    ride_request = await db.get(RideRequest, request_id)
    if ride_request is None:
        raise HTTPException(status_code=404, detail="Ride request doesn't exist")
    elif ride_request.status != "pending":
        raise HTTPException(status_code=409, detail="This request is no longer pending")

    # get ride
    ride = await db.get(Ride, ride_request.ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride doesn't exist")

    # lookup driver that is tied to request id
    driver = await db.get(User, ride.driver_id)
    if driver is None or not driver.is_driver:
        raise HTTPException(status_code=400, detail="Ride does not have valid driver")
    elif driver.id != auth_driver_id:
        raise HTTPException(status_code=403, detail="User is not authorized to accept this request")

    # check if there is any seat availability
    registrations = await db.execute(
        select(RideRegistration).where(RideRegistration.ride_id == ride_request.ride_id)
    )
    if len(registrations.scalars().all()) >= ride.seats:
        raise HTTPException(status_code=400, detail="Cannot accept. Ride is at capacity")

    # change status of ride_request entry
    ride_request.status = "accepted"

    # create ride_registration so system knows rider is part of ride
    ride_registration = RideRegistration(
        ride_id=ride_request.ride_id, rider_id=ride_request.rider_id
    )
    db.add(ride_registration)
    await db.commit()
    await db.refresh(ride_registration)

    return ride_registration


# driver declines a ride request from a user
@router.patch("/requests/{request_id}/decline", status_code=200)
async def decline_ride_request(
    request_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    auth_driver_id = "0"  # !!TODO: get this from authenticated user

    # get ride request
    ride_request = await db.get(RideRequest, request_id)
    if ride_request is None:
        raise HTTPException(status_code=404, detail="Ride request doesn't exist")
    elif ride_request.status != "pending":
        raise HTTPException(status_code=409, detail="This request is no longer pending")

    # get ride
    ride = await db.get(Ride, ride_request.ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride doesn't exist")

    # lookup driver that is tied to request id
    driver = await db.get(User, ride.driver_id)
    if driver is None or not driver.is_driver:
        raise HTTPException(status_code=400, detail="Ride does not have valid driver")
    elif driver.id != auth_driver_id:
        raise HTTPException(
            status_code=403, detail="User is not authorized to decline this request"
        )

    # change status of ride_request entry
    ride_request.status = "declined"
    await db.commit()
    await db.refresh(ride_request)


# rider cancels their own request to join a ride
@router.delete("/requests/{request_id}/cancel", status_code=204)
async def cancel_ride_request(
    request_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    auth_rider_id = "0"  # !!TODO: get this from authenticated user

    # get ride request
    ride_request = await db.get(RideRequest, request_id)
    if ride_request is None:
        raise HTTPException(status_code=404, detail="Ride request doesn't exist")

    if ride_request.rider_id != auth_rider_id:
        raise HTTPException(status_code=403, detail="User is not authorized to cancel this request")

    if ride_request.status == "accepted":
        await db.execute(
            delete(RideRegistration).where(
                RideRegistration.ride_id == ride_request.ride_id
                and RideRegistration.rider_id == ride_request.rider_id
            )
        )

    await db.delete(ride_request)
    await db.commit()
