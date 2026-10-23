"""Request and response models shared by the API routers."""

from datetime import datetime
from typing import Final, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from util.constants import STUDENT_EMAIL_DOMAIN, USERNAME_LENGTH

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
    """Request body for posting a ride. The driver is whoever is logged in."""

    origin_point: GeoJSONPoint
    departure_time: datetime
    seats: int = Field(default=1, ge=1)


class UpdateRideBody(BaseModel):
    """Request body for editing a ride. Only the fields sent are changed."""

    origin_point: GeoJSONPoint | None = None
    departure_time: datetime | None = None
    seats: int | None = Field(default=None, ge=0)


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


class CreateUserRequest(BaseModel):
    """Request body for creating a user account. Since account created cannot be driver by default,
    `is_driver` is defaulted to `False` on creation."""

    ## Important: Pydantic Regex's engine does not support look-around, so enforcing model-config to use python-re is important
    model_config = ConfigDict(regex_engine="python-re")

    username: str = Field(min_length=3, max_length=USERNAME_LENGTH)
    # basic format check; avoids needing the email-validator dependency
    email: str = Field(max_length=255, pattern=EMAIL_REGEX)
    password: str = Field(min_length=8)
    is_driver: bool = False

    @field_validator("email")
    @classmethod
    def must_be_student_email(cls, email: str) -> str:
        # Compare the whole domain so lookalikes like "x@evil-myumanitoba.ca" are rejected.
        # Lowercase it so the same student can't sign up twice with different capitals.
        email = email.lower()
        if email.rsplit("@", 1)[1] != STUDENT_EMAIL_DOMAIN:
            raise ValueError(f"Use your @{STUDENT_EMAIL_DOMAIN} student email")
        return email


class VerifyEmailBody(BaseModel):
    """The token from the link in the verification email."""

    token: str


class ResendVerificationBody(BaseModel):
    """The email to send a new verification link to."""

    email: str


class UserResponse(BaseModel):
    """Represents the response model containing a user's public account information."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    is_driver: bool
    is_verified: bool


class LoginBody(BaseModel):
    """Email and password for logging in."""

    email: str
    password: str


class LoginResponse(BaseModel):
    """A login token and the account it belongs to. Send the token as `Authorization: Bearer`."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse
