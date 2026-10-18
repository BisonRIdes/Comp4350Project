from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select 
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Ride

router = APIRouter(prefix="/rides", tags=["rides"])

class GeoJSONPoint(BaseModel):
    type: Literal["Point"]
    coordinates: list[float] = Field(min_length=2, max_length=2)  # [lng, lat]


class RideOut(BaseModel):
    id: str
    driver_id: str
    origin_point: GeoJSONPoint
    departure_time: datetime
    seats: int
    
    
class CreateRideBody(BaseModel):
    driver_id: str  # TODO: take from auth once key-auth lands
    origin_point: GeoJSONPoint
    departure_time: datetime
    seats: int = Field(default=1, ge=1)


class UpdateRideBody(BaseModel):
    origin_point: GeoJSONPoint | None = None
    departure_time: datetime | None = None
    seats: int | None = Field(default=None, ge=0)
    

# return a list of all rides for populating the frontend
@router.get("")
async def list_rides():
    pass


# driver can post a ride
@router.post("", status_code=201)
async def create_ride():
    pass


# driver can edit a ride (partial update)
@router.patch("/{ride_id}", response_model=RideOut)
async def edit_ride(
    ride_id: str, body: UpdateRideBody, db: AsyncSession = Depends(get_db)
):
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
async def delete_ride(ride_id: str):
    pass