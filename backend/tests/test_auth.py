from unittest.mock import AsyncMock

import pytest

from database import SessionLocal
from models import User
from tests.helpers import client, make_user
from util.tokens import create_token, read_token


@pytest.fixture
def send(monkeypatch) -> AsyncMock:
    """Catches verification emails instead of sending them."""
    mock = AsyncMock()
    monkeypatch.setattr("routers.auth.send_verification_email", mock)
    return mock


# login

LOGIN = {"email": "alice@myumanitoba.ca", "password": "password123"}


async def test_login():
    user_id = await make_user("alice", True, verified=True, password="password123")

    response = client.post("/auth/login", json=LOGIN)

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert read_token(body["access_token"], "access") == user_id
    assert body["user"]["id"] == user_id
    assert body["user"]["is_driver"] is True
    assert "password_hash" not in body["user"]


async def test_login_email_is_not_case_sensitive():
    await make_user("alice", verified=True, password="password123")

    response = client.post("/auth/login", json={**LOGIN, "email": "Alice@MyUManitoba.ca"})

    assert response.status_code == 200


async def test_login_wrong_password():
    await make_user("alice", verified=True, password="password123")

    response = client.post("/auth/login", json={**LOGIN, "password": "wrong-password"})

    assert response.status_code == 401


async def test_login_unknown_email_looks_like_a_wrong_password():
    response = client.post("/auth/login", json=LOGIN)

    assert response.status_code == 401
    assert response.json() == {"detail": "Wrong email or password"}


async def test_login_before_verifying_email():
    await make_user("alice", verified=False, password="password123")

    response = client.post("/auth/login", json=LOGIN)

    assert response.status_code == 403


async def test_login_unverified_with_wrong_password_is_still_401():
    await make_user("alice", verified=False, password="password123")

    response = client.post("/auth/login", json={**LOGIN, "password": "wrong-password"})

    assert response.status_code == 401


async def test_login_missing_password():
    response = client.post("/auth/login", json={"email": "alice@myumanitoba.ca"})

    assert response.status_code == 422


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


# resend verification email


async def test_resend_verification(send):
    user_id = await make_user("alice")

    response = client.post("/auth/resend-verification", json={"email": "Alice@myumanitoba.ca"})

    assert response.status_code == 204
    email, token = send.await_args.args
    assert email == "alice@myumanitoba.ca"
    assert read_token(token, "verify") == user_id


async def test_resend_verification_already_verified(send):
    await make_user("alice", verified=True)

    response = client.post("/auth/resend-verification", json={"email": "alice@myumanitoba.ca"})

    assert response.status_code == 204
    send.assert_not_awaited()


async def test_resend_verification_unknown_email_looks_the_same(send):
    response = client.post("/auth/resend-verification", json={"email": "nobody@myumanitoba.ca"})

    assert response.status_code == 204
    send.assert_not_awaited()
