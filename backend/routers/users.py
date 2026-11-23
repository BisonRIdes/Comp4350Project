from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import SessionLocal, get_db
from models import User
from schemas import CreateUserRequest, UpdateUserRequest, UserResponse
from util.auth import CurrentUser
from util.constants import VERIFY_TOKEN_HOURS
from util.email import send_verification_email
from util.security import hash_password, verify_password
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


# the logged-in user's own account, e.g. to show their name or check if they drive
@router.get("/me", response_model=UserResponse)
async def read_current_user(user: CurrentUser) -> User:
    return user


# edit the logged-in user's own account. Only the fields sent are changed
@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    body: UpdateUserRequest, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    # none of these can be null, so a null is treated the same as leaving the field out
    changes = body.model_dump(exclude_none=True)
    current_password = changes.pop("current_password", None)
    new_password = changes.pop("new_password", None)
    if not changes and new_password is None:
        raise HTTPException(status_code=422, detail="No fields to update")

    if new_password is not None:
        # so someone on a laptop left logged in can't lock the owner out.
        # 403 and not 401, since a 401 would log the user out on the frontend
        if current_password is None or not await verify_password(
            current_password, user.password_hash
        ):
            raise HTTPException(status_code=403, detail="Current password is wrong")
        user.password_hash = await hash_password(new_password)

    if "username" in changes and changes["username"] != user.username:
        taken = await db.scalar(select(User.id).where(User.username == changes["username"]))
        if taken:
            raise HTTPException(status_code=409, detail="Username is already taken")

    for field, value in changes.items():
        setattr(user, field, value)

    try:
        await db.commit()
    except IntegrityError:
        # lost a race with someone else taking the same username
        await db.rollback()
        raise HTTPException(status_code=409, detail="Username is already taken")
    await db.refresh(user)
    return user
