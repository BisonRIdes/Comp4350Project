"""Request and response models shared by the API routers."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class GeoJSONPoint(BaseModel):
    """A GeoJSON point, stored as [longitude, latitude]."""

    type: Literal["Point"]
    coordinates: list[float] = Field(min_length=2, max_length=2)  # [lng, lat]


class RideOut(BaseModel):
    """A ride as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    driver_id: str
    origin_point: GeoJSONPoint
    departure_time: datetime
    seats: int


class CreateRideBody(BaseModel):
    """Request body for posting a ride."""

    driver_id: str  # TODO: take the driver from the logged-in user instead of the request body
    origin_point: GeoJSONPoint
    departure_time: datetime
    seats: int = Field(default=1, ge=1)


class UpdateRideBody(BaseModel):
    """Request body for editing a ride. Only the fields sent are changed."""

    origin_point: GeoJSONPoint | None = None
    departure_time: datetime | None = None
    seats: int | None = Field(default=None, ge=0)


class CreateRideRequestBody(BaseModel):
    """Request body for creating a ride request"""

    rider_id: str  # TODO: take the rider from the logged-in user instead of the request body


class RideRequestDecisionBody(BaseModel):
    """Request body for when driver decides to accept or decline a request"""

    driver_id: str  # TODO: take the rider from the logged-in user instead of the request body


class RideRequestOut(BaseModel):
    """A ride request as returned by the API"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    ride_id: str
    rider_id: str
    status: Literal["pending", "accepted", "declined"]


class RideRegistrationOut(BaseModel):
    """A ride registration as returned by the API"""

    model_config = ConfigDict(from_attributes=True)

    ride_id: str
    rider_id: str


class UpdatesOut(BaseModel):
    """Everything the page needs to refresh for one user."""

    pending_requests: list[RideRequestOut]
    request_updates: list[RideRequestOut]
