import os
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from tests.helpers import auth, make_user
from util.tokens import create_token, read_token

client = TestClient(app, headers={"x-key": os.environ["API_KEY"]})
BODY = {"username": "alice", "email": "alice@myumanitoba.ca", "password": "password123"}


def test_create_account() -> None:
    response = client.post("/users", json=BODY)

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "alice"
    assert data["is_driver"] is False
    assert data["is_verified"] is False
    assert "password" not in data
    assert "password_hash" not in data


def test_create_account_emails_a_verification_link(monkeypatch) -> None:
    send = AsyncMock()
    monkeypatch.setattr("routers.users.send_verification_email", send)

    response = client.post("/users", json=BODY)

    email, token = send.await_args.args
    assert email == "alice@myumanitoba.ca"
    assert read_token(token, "verify") == response.json()["id"]


def test_create_account_duplicate() -> None:
    client.post("/users", json=BODY)
    response = client.post("/users", json={**BODY, "username": "bob"})

    assert response.status_code == 409


def test_create_account_concurrent_signup(monkeypatch):
    db = AsyncMock(spec=AsyncSession)
    db.scalar.return_value = None
    db.commit.side_effect = IntegrityError("INSERT", {}, Exception("duplicate key"))

    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(return_value=db)
    session_context.__aexit__ = AsyncMock(return_value=None)
    session_factory = MagicMock(return_value=session_context)
    monkeypatch.setattr("routers.users.SessionLocal", session_factory)

    response = client.post("/users", json=BODY)

    assert response.status_code == 409
    assert response.json() == {"detail": "Username or email already exists"}
    db.rollback.assert_awaited_once()
    session_factory.assert_called_once_with()


def test_create_account_validation():
    response = client.post("/users", json={**BODY, "password": "short"})

    assert response.status_code == 422


@pytest.mark.parametrize(
    "email",
    [
        "alice@gmail.com",
        "alice@umanitoba.ca",
        "alice@evil-myumanitoba.ca",
        "alice@myumanitoba.ca.evil.com",
    ],
)
def test_create_account_rejects_non_student_email(email):
    response = client.post("/users", json={**BODY, "email": email})

    assert response.status_code == 422


def test_create_account_lowercases_email():
    response = client.post("/users", json={**BODY, "email": "Alice@MyUManitoba.ca"})

    assert response.status_code == 201
    assert response.json()["email"] == "alice@myumanitoba.ca"


def test_create_account_duplicate_email_any_case():
    client.post("/users", json=BODY)
    response = client.post(
        "/users", json={**BODY, "username": "bob", "email": "ALICE@myumanitoba.ca"}
    )

    assert response.status_code == 409


# current user


async def test_me():
    user_id = await make_user("alice", True)

    response = client.get("/users/me", headers=auth(user_id))

    assert response.status_code == 200
    assert response.json()["id"] == user_id
    assert response.json()["is_driver"] is True


async def test_me_not_logged_in():
    response = client.get("/users/me")

    assert response.status_code == 401


async def test_me_bad_token():
    response = client.get("/users/me", headers={"Authorization": "Bearer not-a-token"})

    assert response.status_code == 401


async def test_me_verification_link_is_not_a_login():
    user_id = await make_user("alice")
    token = create_token(user_id, "verify", 1)

    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


async def test_me_deleted_user():
    response = client.get("/users/me", headers=auth("gone"))

    assert response.status_code == 401
