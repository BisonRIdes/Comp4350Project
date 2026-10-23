from fastapi import APIRouter, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import User
from schemas import CreateUserRequest, UserResponse
from util.constants import VERIFY_TOKEN_HOURS
from util.email import send_verification_email
from util.security import hash_password
from util.tokens import create_token

router = APIRouter(prefix="/users", tags=["users"])


# create an account and return a user on success with 201 code
@router.post("", status_code=201, response_model=UserResponse)
async def create_account(body: CreateUserRequest) -> User:
    async with SessionLocal() as db:
        existing = await db.scalar(
            select(User.id).where(or_(User.username == body.username, User.email == body.email))
        )
        if existing:
            raise HTTPException(status_code=409, detail="Username or email already exists")

        user = User(
            username=body.username,
            email=body.email,
            password_hash=await hash_password(body.password),
            is_driver=body.is_driver,
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            # lost a race with a concurrent signup
            await db.rollback()
            raise HTTPException(status_code=409, detail="Username or email already exists")

    # the account can't log in until they click the link we email to their student address
    await send_verification_email(user.email, create_token(user.id, "verify", VERIFY_TOKEN_HOURS))
    return user
