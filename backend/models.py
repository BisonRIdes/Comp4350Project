import uuid
from datetime import UTC, datetime
from typing import Final

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from util.constants import (
    MAX_STARS,
    MESSAGE_LENGTH,
    MIN_STARS,
    RATING_COMMENT_LENGTH,
    USERNAME_LENGTH,
)

user_id: Final = "users.id"


def new_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(USERNAME_LENGTH), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_driver: Mapped[bool] = mapped_column(default=False)
    # Set once the student clicks the link we email to their @myumanitoba.ca address.
    is_verified: Mapped[bool] = mapped_column(default=False)


class Ride(Base):
    __tablename__ = "rides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    driver_id: Mapped[str] = mapped_column(ForeignKey(user_id), index=True)
    # JSON type for GeoJSON data.
    # JSON works with both SQLite and PSQL, but swapping to JSONB would be faster for psql.
    origin_point: Mapped[dict] = mapped_column(JSON)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    seats: Mapped[int] = mapped_column(default=1)
    # What each rider pays for a seat, in cents (CAD). Rides posted before prices were saved have none.
    price_cents: Mapped[int | None] = mapped_column(default=None)


class RideRequest(Base):
    __tablename__ = "ride_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), index=True)
    rider_id: Mapped[str] = mapped_column(ForeignKey(user_id), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    detour_point: Mapped[dict | None] = mapped_column(JSON, default=None, nullable=True)


class RideRegistration(Base):
    __tablename__ = "ride_registrations"

    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), primary_key=True)
    rider_id: Mapped[str] = mapped_column(ForeignKey(user_id), primary_key=True, index=True)


class RideDetour(Base):
    __tablename__ = "ride_detours"

    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey(user_id), primary_key=True, index=True)
    detour_point: Mapped[dict] = mapped_column(JSON)


class Payment(Base):
    """A rider's card payment for their seat on a ride. Stripe keeps the card details and history."""

    __tablename__ = "payments"

    request_id: Mapped[str] = mapped_column(ForeignKey("ride_requests.id"), primary_key=True)
    stripe_payment_id: Mapped[str] = mapped_column(String(255), unique=True)
    amount_cents: Mapped[int]
    # "unpaid" until Stripe's webhook says the money arrived, then "paid"
    status: Mapped[str] = mapped_column(String(20), default="unpaid")


class Rating(Base):
    """Stars one person on a ride gives another once it has left.

    Riders rate the driver and the driver rates each accepted rider.
    """

    __tablename__ = "ratings"
    __table_args__ = (
        # one rating per person per ride, which also stops a double submit
        UniqueConstraint("ride_id", "rater_id", "ratee_id"),
        CheckConstraint(f"stars BETWEEN {MIN_STARS} AND {MAX_STARS}", name="ck_ratings_stars"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id", ondelete="CASCADE"), index=True)
    rater_id: Mapped[str] = mapped_column(ForeignKey(user_id))
    ratee_id: Mapped[str] = mapped_column(ForeignKey(user_id), index=True)
    # the rated person's role on this ride ("driver" or "rider"), so the two are averaged apart
    ratee_role: Mapped[str] = mapped_column(String(6))
    stars: Mapped[int]
    comment: Mapped[str | None] = mapped_column(String(RATING_COMMENT_LENGTH), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class ChatRecord(Base):
    """A group chat or a private chat associated with a ride."""

    __tablename__ = "chats"
    __table_args__ = (UniqueConstraint("ride_id", "type", "rider_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(8))
    rider_key: Mapped[str] = mapped_column(String(36), default="")


class MessageRecord(Base):
    """A message belonging to a ride chat."""

    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_page", "chat_id", "created_at", "id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    chat_id: Mapped[str] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    sender_id: Mapped[str] = mapped_column(ForeignKey(user_id))
    content: Mapped[str] = mapped_column(String(MESSAGE_LENGTH))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
