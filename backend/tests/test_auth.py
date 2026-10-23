from database import SessionLocal
from models import User
from tests.helpers import client, make_user
from util.tokens import create_token

# verify email


async def test_verify_email():
    user_id = await make_user("alice")

    response = client.post("/auth/verify", json={"token": create_token(user_id, "verify", 1)})

    assert response.status_code == 200
    assert response.json()["is_verified"] is True
    async with SessionLocal() as db:
        assert (await db.get(User, user_id)).is_verified is True


async def test_verify_email_twice_is_fine():
    user_id = await make_user("alice")
    token = create_token(user_id, "verify", 1)

    client.post("/auth/verify", json={"token": token})
    response = client.post("/auth/verify", json={"token": token})

    assert response.status_code == 200


async def test_verify_email_bad_token():
    response = client.post("/auth/verify", json={"token": "not-a-token"})

    assert response.status_code == 400


async def test_verify_email_expired_token():
    user_id = await make_user("alice")

    response = client.post("/auth/verify", json={"token": create_token(user_id, "verify", -1)})

    assert response.status_code == 400


async def test_verify_email_login_token_is_not_a_verification_link():
    user_id = await make_user("alice")

    response = client.post("/auth/verify", json={"token": create_token(user_id, "access", 1)})

    assert response.status_code == 400


async def test_verify_email_deleted_user():
    response = client.post("/auth/verify", json={"token": create_token("gone", "verify", 1)})

    assert response.status_code == 400
