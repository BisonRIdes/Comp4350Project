from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from schemas import CreateUserRequest, UserResponse
from util.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


# create an account and return a user on success with 201 code
@router.post("", status_code=201, response_model=UserResponse)
async def create_account(body: CreateUserRequest, db: AsyncSession = Depends(get_db)) -> User:
    existing = await db.scalar(
        select(User.id).where(or_(User.username == body.username, User.email == body.email))
    )
    if existing:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        is_driver=body.is_driver,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # lost a race with a concurrent signup
        await db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already exists")
    return user
