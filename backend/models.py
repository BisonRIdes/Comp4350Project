import uuid
from datetime import datetime
from typing import Final

from sqlalchemy import JSON, DateTime, ForeignKey, String
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


class Ride(Base):
    __tablename__ = "rides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    driver_id: Mapped[str] = mapped_column(ForeignKey(user_id), index=True)
    # JSON type for GeoJSON data.
    # JSON works with both SQLite and PSQL, but swapping to JSONB would be faster for psql.
    origin_point: Mapped[dict] = mapped_column(JSON)
    departure_time: Mapped[datetime] = mapped_column(DateTime)
    seats: Mapped[int] = mapped_column(default=1)


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
