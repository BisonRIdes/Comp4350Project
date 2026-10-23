from typing import Annotated, Final

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from schemas import (
    LoginBody,
    LoginResponse,
    ResendVerificationBody,
    UserResponse,
    VerifyEmailBody,
)
from util.constants import ACCESS_TOKEN_HOURS, VERIFY_TOKEN_HOURS
from util.email import send_verification_email
from util.security import verify_password
from util.tokens import create_token, read_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Checked when the email has no account, so a wrong email takes as long as a wrong password
# and response times don't reveal which emails have signed up.
NO_ACCOUNT_HASH: Final = f"{'0' * 32}${'0' * 128}"


# log a user in and return a token plus their account details, such as if they are a driver
@router.post("/login", response_model=LoginResponse)
async def login(body: LoginBody, db: Annotated[AsyncSession, Depends(get_db)]) -> LoginResponse:
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    stored_hash = user.password_hash if user else NO_ACCOUNT_HASH
    password_ok = await verify_password(body.password, stored_hash)
    if user is None or not password_ok:
        raise HTTPException(status_code=401, detail="Wrong email or password")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Verify your student email before logging in")

    return LoginResponse(
        access_token=create_token(user.id, "access", ACCESS_TOKEN_HOURS),
        user=UserResponse.model_validate(user),
    )


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


# send a fresh link, e.g. if the first email got lost or the link expired
@router.post("/resend-verification", status_code=204)
async def resend_verification(
    body: ResendVerificationBody, db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    # same response either way, so nobody can use this to check which emails have accounts
    if user is not None and not user.is_verified:
        token = create_token(user.id, "verify", VERIFY_TOKEN_HOURS)
        await send_verification_email(user.email, token)
