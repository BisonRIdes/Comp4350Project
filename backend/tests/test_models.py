from database import SessionLocal
from models import User
from sqlalchemy import select


async def test_create_user():
    async with SessionLocal() as db:
        db.add(User(email="a@b.com", password_hash="abcdefghi", is_driver=True))
        await db.commit()

        user = (await db.scalars(select(User))).one()

    assert user.email == "a@b.com"
    assert user.is_driver is True
    assert user.id