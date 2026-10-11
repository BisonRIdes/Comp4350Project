import uuid
from datetime import datetime

from database import Base
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column


def new_id() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
 
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_driver: Mapped[bool] = mapped_column(default=False)
    
class Ride(Base):
    __tablename__ = "rides"
 
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    driver_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    origin: Mapped[str] = mapped_column(String(255))
    destination: Mapped[str] = mapped_column(String(255))
    departure_time: Mapped[datetime] = mapped_column(DateTime)
    seats: Mapped[int] = mapped_column(default=1)

class RideRequest(Base):
    __tablename__ = "ride_requests"
 
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), index=True)
    rider_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")

class RideRegistration(Base): 
    __tablename__ = "ride_registrations"
 
    ride_id: Mapped[str] = mapped_column(ForeignKey("rides.id"), primary_key=True)
    rider_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True, index=True)

