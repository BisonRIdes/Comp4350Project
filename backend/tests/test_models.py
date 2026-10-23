from sqlalchemy import select

from database import SessionLocal
from models import User


async def test_create_user():
    async with SessionLocal() as db:
        db.add(User(username="123", email="a@b.com", password_hash="abcdefghi", is_driver=True))
        await db.commit()

        user = (await db.scalars(select(User))).one()

    assert user.username == "123"
    assert user.email == "a@b.com"
    assert user.is_driver is True
    assert user.is_verified is False
    assert user.id
