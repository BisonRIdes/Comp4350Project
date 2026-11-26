"""Rating rules and averages, shared by the ratings and rides routes so they're defined once.

Nothing here knows about HTTP: the routes turn these answers into responses.
"""

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import Select, Subquery, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Rating, Ride, RideRegistration, User
from schemas import PendingRatingOut, RatingRole, RatingStats


def to_stats(average: Decimal | float | None, count: int) -> RatingStats:
    # one decimal is all the stars on a card can show
    rounded = None if average is None else round(float(average), 1)
    return RatingStats(average=rounded, count=count)


def stats_subquery(role: RatingRole) -> Subquery:
    """Each user's average stars and number of ratings in this role, to join onto a list query."""
    return (
        select(
            Rating.ratee_id,
            func.avg(Rating.stars).label("average"),
            func.count().label("count"),
        )
        .where(Rating.ratee_role == role)
        .group_by(Rating.ratee_id)
        .subquery()
    )


async def user_stats(user_id: str, role: RatingRole, db: AsyncSession) -> RatingStats:
    """One user's average stars and number of ratings in this role."""
    query = select(func.avg(Rating.stars), func.count()).where(
        Rating.ratee_id == user_id, Rating.ratee_role == role
    )
    average, count = (await db.execute(query)).one()
    return to_stats(average, count)


def has_left(ride: Ride) -> bool:
    """Whether the ride's departure time has passed, so the people on it can rate each other."""
    return ride.departure_time <= datetime.now(UTC)


async def rateable_people(
    ride: Ride, user_id: str, db: AsyncSession
) -> dict[str, RatingRole] | None:
    """Who this user may rate on this ride, mapped to that person's role on it.

    The driver rates each accepted rider and an accepted rider rates the driver.
    Returns None if the user wasn't on the ride.
    """
    riders = set(
        await db.scalars(
            select(RideRegistration.rider_id).where(RideRegistration.ride_id == ride.id)
        )
    )
    if user_id == ride.driver_id:
        return dict.fromkeys(riders, "rider")
    if user_id in riders:
        return {ride.driver_id: "driver"}
    return None


def _shared_rides(user_id: str, role: RatingRole) -> Select:
    """Rides that have left with the people on them in `role`, from this user's side.

    Rows are (ride id, departure time, other person's id, other person's username).
    """
    now = datetime.now(UTC)
    query = select(Ride.id, Ride.departure_time, User.id, User.username).join(
        RideRegistration, RideRegistration.ride_id == Ride.id
    )
    if role == "rider":
        # this user drove: the other people are the accepted riders
        query = query.join(User, User.id == RideRegistration.rider_id).where(
            Ride.driver_id == user_id
        )
    else:
        # this user rode: the other person is the driver
        query = query.join(User, User.id == Ride.driver_id).where(
            RideRegistration.rider_id == user_id
        )
    return query.where(Ride.departure_time <= now)


async def pending_ratings(user_id: str, db: AsyncSession) -> list[PendingRatingOut]:
    """Everyone this user shared a ride with that has left and hasn't rated yet, newest first."""
    rated = await db.execute(
        select(Rating.ride_id, Rating.ratee_id).where(Rating.rater_id == user_id)
    )
    already_rated = {(ride_id, ratee_id) for ride_id, ratee_id in rated.all()}

    pending: list[PendingRatingOut] = []
    for role in ("rider", "driver"):
        rows = await db.execute(_shared_rides(user_id, role))
        for ride_id, departure_time, other_id, username in rows.all():
            if (ride_id, other_id) not in already_rated:
                pending.append(
                    PendingRatingOut(
                        ride_id=ride_id,
                        departure_time=departure_time,
                        user_id=other_id,
                        username=username,
                        role=role,
                    )
                )

    # newest ride first, then by name within a ride (sorts are stable)
    pending.sort(key=lambda item: item.username)
    pending.sort(key=lambda item: item.departure_time, reverse=True)
    return pending
