from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Rating, Ride, User
from schemas import (
    CreateRatingBody,
    PendingRatingOut,
    RatingComment,
    RatingOut,
    UserRatingOut,
)
from util.auth import CurrentUser, get_current_user
from util.constants import RECENT_RATING_COMMENTS
from util.ratings import has_left, pending_ratings, rateable_people, user_stats

# every ratings route needs a logged-in student
router = APIRouter(tags=["ratings"], dependencies=[Depends(get_current_user)])


# the logged-in user rates the driver or a rider they shared a ride with
@router.post("/rides/{ride_id}/ratings", status_code=201, response_model=RatingOut)
async def create_rating(
    ride_id: str,
    body: CreateRatingBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Rating:
    ride = await db.get(Ride, ride_id)
    if ride is None:
        raise HTTPException(status_code=404, detail="Ride not found")

    if body.ratee_id == user.id:
        raise HTTPException(status_code=400, detail="You can't rate yourself")

    rateable = await rateable_people(ride, user.id, db)
    if rateable is None:
        raise HTTPException(status_code=403, detail="You weren't on this ride")
    if body.ratee_id not in rateable:
        raise HTTPException(
            status_code=403, detail="Riders rate the driver, and the driver rates their riders"
        )

    if not has_left(ride):
        raise HTTPException(status_code=400, detail="You can rate this ride once it has left")

    rating = Rating(
        ride_id=ride_id,
        rater_id=user.id,
        ratee_id=body.ratee_id,
        ratee_role=rateable[body.ratee_id],
        stars=body.stars,
        comment=body.comment,
    )
    db.add(rating)
    try:
        await db.commit()
    except IntegrityError:
        # one rating per person per ride, also when two submits race each other
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="You already rated this person for this ride"
        ) from None
    await db.refresh(rating)
    return rating


# everyone the logged-in user still has to rate, newest ride first
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
        .order_by(Rating.created_at.desc())
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
                created_at=rating.created_at,
            )
            for rating in with_comments
        ],
    )
