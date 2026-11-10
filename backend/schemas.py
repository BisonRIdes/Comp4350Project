"""Request and response models shared by the API routers."""

import re
from datetime import datetime
from typing import Final, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from util.constants import (
    MIN_PRICE_CENTS,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    STUDENT_EMAIL_DOMAIN,
    USERNAME_LENGTH,
)

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
    price_cents: int | None


class CreateRideBody(BaseModel):
    """Request body for posting a ride. The driver is whoever is logged in."""

    origin_point: GeoJSONPoint
    departure_time: datetime
    seats: int = Field(default=1, ge=1)
    # price per seat in cents, e.g. 500 for $5.00
    price_cents: int | None = Field(default=None, ge=MIN_PRICE_CENTS)


class UpdateRideBody(BaseModel):
    """Request body for editing a ride. Only the fields sent are changed."""

    origin_point: GeoJSONPoint | None = None
    departure_time: datetime | None = None
    seats: int | None = Field(default=None, ge=0)
    price_cents: int | None = Field(default=None, ge=MIN_PRICE_CENTS)


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


class RideRequestDetailsOut(RideRequestOut):
    """A ride request with who asked, who drives, and when and where the ride leaves."""

    rider_username: str
    driver_username: str
    departure_time: datetime
    origin_point: GeoJSONPoint


class UpdatesOut(BaseModel):
    """Everything the page needs to refresh for one user."""

    pending_requests: list[RideRequestDetailsOut]
    request_updates: list[RideRequestDetailsOut]


class PaymentOut(BaseModel):
    """A rider's payment for their seat."""

    request_id: str
    ride_id: str
    # None when the ride has no price, so there's nothing to pay
    amount_cents: int | None
    # "processing": paid in the browser, waiting for Stripe's webhook to confirm it
    status: Literal["unpaid", "processing", "paid"]
    # only while unpaid: lets Stripe's payment form in the browser take the card for this payment
    client_secret: str | None = None


class CreateUserRequest(BaseModel):
    """Request body for creating a user account. Since account created cannot be driver by default,
    `is_driver` is defaulted to `False` on creation."""

    ## Important: Pydantic Regex's engine does not support look-around, so enforcing model-config to use python-re is important
    model_config = ConfigDict(regex_engine="python-re")

    username: str = Field(min_length=3, max_length=USERNAME_LENGTH)
    # basic format check; avoids needing the email-validator dependency
    email: str = Field(max_length=255, pattern=EMAIL_REGEX)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
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

    @field_validator("password")
    @classmethod
    def must_be_strong_password(cls, password: str) -> str:
        # Each rule is (pattern the password must contain, what to call it in the error).
        rules = [
            (r"[A-Z]", "an uppercase letter"),
            (r"[a-z]", "a lowercase letter"),
            (r"[0-9]", "a number"),
            (r"[^A-Za-z0-9]", "a symbol"),
        ]
        missing = [name for pattern, name in rules if not re.search(pattern, password)]
        if missing:
            raise ValueError(f"Password needs {', '.join(missing)}")
        return password


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
