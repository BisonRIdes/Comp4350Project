"""The query behind every list of ride requests a student reads, with names and ride details."""

from sqlalchemy import Select, select
from sqlalchemy.orm import aliased

from models import Ride, RideRequest, User

# the users table is joined twice, once for each side of the request
rider = aliased(User)
driver = aliased(User)


def request_details_query() -> Select:
    """Ride requests with who asked, who drives, and when and where the ride leaves, soonest first.

    Add a `.where()` to pick which requests to return.
    """
    return (
        select(
            RideRequest.id,
            RideRequest.ride_id,
            RideRequest.rider_id,
            RideRequest.status,
            rider.username.label("rider_username"),
            driver.username.label("driver_username"),
            Ride.departure_time,
            Ride.origin_point,
        )
        .join(Ride, Ride.id == RideRequest.ride_id)
        .join(rider, rider.id == RideRequest.rider_id)
        .join(driver, driver.id == Ride.driver_id)
        .order_by(Ride.departure_time)
    )
