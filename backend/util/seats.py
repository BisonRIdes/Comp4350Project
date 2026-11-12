"""Seat counting shared by the rides and ride request routes, so it's defined once."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import RideRegistration


# how many riders the driver has already accepted on this ride
async def count_accepted(ride_id: str, db: AsyncSession) -> int:
    return await db.scalar(
        select(func.count())
        .select_from(RideRegistration)
        .where(RideRegistration.ride_id == ride_id)
    )
