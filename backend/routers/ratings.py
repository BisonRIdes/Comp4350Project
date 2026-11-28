from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Rating, Ride, User
from schemas import (
    PendingRatingOut,
    RatingComment,
    RatingOut,
    SaveRatingBody,
    UserRatingOut,
)
from util.auth import CurrentUser, get_current_user
from util.constants import RECENT_RATING_COMMENTS
from util.ratings import find_rating, pending_ratings, rateable_people, user_stats

# every ratings route needs a logged-in student
router = APIRouter(tags=["ratings"], dependencies=[Depends(get_current_user)])


async def get_ride_or_404(ride_id: str, db: AsyncSession) -> Ride:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride


# the logged-in user rates the driver or a rider on their ride, or changes that rating;
# open from the moment the driver accepts the rider, so it covers before, during and after
@router.put(
    "/rides/{ride_id}/ratings/{ratee_id}",
    response_model=RatingOut,
    responses={201: {"description": "Rating created"}},
)
async def save_rating(
    ride_id: str,
    ratee_id: str,
    body: SaveRatingBody,
    user: CurrentUser,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Rating:
    ride = await get_ride_or_404(ride_id, db)

    if ratee_id == user.id:
        raise HTTPException(status_code=400, detail="You can't rate yourself")

    rateable = await rateable_people(ride, user.id, db)
    if rateable is None:
        raise HTTPException(status_code=403, detail="You aren't on this ride")
    if ratee_id not in rateable:
        raise HTTPException(
            status_code=403, detail="Riders rate the driver, and the driver rates their riders"
        )

    rating = await find_rating(ride_id, user.id, ratee_id, db)
    if rating is None:
        rating = Rating(
            ride_id=ride_id,
            rater_id=user.id,
            ratee_id=ratee_id,
            ratee_role=rateable[ratee_id],
        )
        db.add(rating)
        response.status_code = 201
    rating.stars = body.stars
    rating.comment = body.comment

    try:
        await db.commit()
    except IntegrityError:
        # another tab created this rating between our check and our save
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="This rating was just saved somewhere else. Try again."
        ) from None
    await db.refresh(rating)
    return rating


# the ratings the logged-in user has given on this ride, to fill in the form when editing
@router.get("/rides/{ride_id}/ratings/mine", response_model=list[RatingOut])
async def list_my_ratings_for_ride(
    ride_id: str, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> Sequence[Rating]:
    await get_ride_or_404(ride_id, db)
    result = await db.scalars(
        select(Rating).where(Rating.ride_id == ride_id, Rating.rater_id == user.id)
    )
    return result.all()


# reminders: everyone on rides that have left that the logged-in user hasn't rated yet
@router.get("/ratings/pending", response_model=list[PendingRatingOut])
async def list_pending_ratings(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> list[PendingRatingOut]:
    return await pending_ratings(user.id, db)


# how a user has been rated as a driver and as a rider, with their newest comments
@router.get("/users/{user_id}/rating", response_model=UserRatingOut)
async def get_user_rating(
    user_id: str, db: Annotated[AsyncSession, Depends(get_db)]
) -> UserRatingOut:
    if await db.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")

    with_comments = await db.scalars(
        select(Rating)
        .where(Rating.ratee_id == user_id, Rating.comment.is_not(None))
        .order_by(Rating.updated_at.desc())
        .limit(RECENT_RATING_COMMENTS)
    )
    return UserRatingOut(
        user_id=user_id,
        as_driver=await user_stats(user_id, "driver", db),
        as_rider=await user_stats(user_id, "rider", db),
        # who wrote each comment is left out on purpose
        recent_comments=[
            RatingComment(
                stars=rating.stars,
                comment=rating.comment,
                role=rating.ratee_role,
                updated_at=rating.updated_at,
            )
            for rating in with_comments
        ],
    )
