"""Request and response models shared by the API routers."""

from datetime import datetime
from typing import Final, Literal

from pydantic import BaseModel, ConfigDict, Field

EMAIL_REGEX: Final = r"(?<!\S)[^@\s]+@[^@\s]+\.[^@\s]+(?!\S)"
"""Matches an email address in the format `[username]@[domain].[root_domain]`.

- `(?<!\\S)`    : Matches the beginning of the e-mail (at the start of string or after whitespace).
- `[^@\\s]+`    : Matches one or more characters excluding '@' and whitespace (username).
- `@`           : Matches the literal '@' symbol separating the username and domain.
- `[^@\\s]+`    : Matches one or more characters excluding '@' and whitespace (domain).
- `\\.`         : Matches the literal '.' separating the domain and root domain.
- `[^@\\s]+`    : Matches one or more characters excluding '@' and whitespace (root domain).
- `(?!\\S)`     : Matches the end of the e-mail (at the end of string or before whitespace)

Example valid matches:
    `user@example.com`
    `john.doe@university.ca`
    `student@mail.example.org`

**Note:** This regex validates the general structure of an email address,
but does not guarantee full compliance with email address standards.
"""


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


class CreateUserRequest(BaseModel):
    """Request body for creating a user account. Since account created cannot be driver by default,
    `is_driver` is defaulted to `False` on creation."""

    ## Important: Pydantic Regex's engine does not support look-around, so enforcing model-config to use python-re is important
    model_config = ConfigDict(regex_engine="python-re") 

    username: str = Field(min_length=3, max_length=36)
    # basic format check; avoids needing the email-validator dependency
    email: str = Field(max_length=255, pattern=EMAIL_REGEX)
    password: str = Field(min_length=8)
    is_driver: bool = False


class UserResponse(BaseModel):
    """Represents the response model containing a user's public account information."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    is_driver: bool
