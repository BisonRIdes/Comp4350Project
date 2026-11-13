import uuid
from datetime import UTC, datetime
from typing import Final

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from util.constants import USERNAME_LENGTH

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


class RideRegistration(Base):
    __tablename__ = "ride_registrations"

    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), primary_key=True)
    rider_id: Mapped[str] = mapped_column(ForeignKey(user_id), primary_key=True, index=True)


class Payment(Base):
    """A rider's card payment for their seat on a ride. Stripe keeps the card details and history."""

    __tablename__ = "payments"

    request_id: Mapped[str] = mapped_column(ForeignKey("ride_requests.id"), primary_key=True)
    stripe_payment_id: Mapped[str] = mapped_column(String(255), unique=True)
    amount_cents: Mapped[int]
    # "unpaid" until Stripe's webhook says the money arrived, then "paid"
    status: Mapped[str] = mapped_column(String(20), default="unpaid")
class Chat(Base):
    """A group chat or a private chat associated with a ride."""

    __tablename__ = "chats"
    __table_args__ = (UniqueConstraint("ride_id", "type", "rider_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(8))
    rider_key: Mapped[str] = mapped_column(String(36), default="")


class ChatMessage(Base):
    """A message belonging to a ride chat."""

    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_page", "chat_id", "created_at", "id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    chat_id: Mapped[str] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    sender_id: Mapped[str] = mapped_column(ForeignKey(user_id))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
