from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from schemas import UserResponse, VerifyEmailBody
from util.tokens import read_token

router = APIRouter(prefix="/auth", tags=["auth"])


# log a user in, return necessary info, such as if they are a driver
@router.post("/login")
async def login():
    pass


# the frontend's /verify page sends the token from the emailed link here
@router.post("/verify", response_model=UserResponse)
async def verify_email(body: VerifyEmailBody, db: Annotated[AsyncSession, Depends(get_db)]) -> User:
    user_id = read_token(body.token, "verify")
    user = await db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=400, detail="This verification link is invalid or expired")

    user.is_verified = True
    await db.commit()
    return user
