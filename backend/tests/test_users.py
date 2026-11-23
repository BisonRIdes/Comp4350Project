import os
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from tests.helpers import auth, make_user
from util.tokens import create_token, read_token

pytestmark = pytest.mark.regression

client = TestClient(app, headers={"x-key": os.environ["API_KEY"]})
BODY = {"username": "alice", "email": "alice@myumanitoba.ca", "password": "Password123!"}


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


def test_create_account_password_too_long():
    response = client.post("/users", json={**BODY, "password": "Aa1!" * 33})

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("password", "missing"),
    [
        ("password123!", "an uppercase letter"),
        ("PASSWORD123!", "a lowercase letter"),
        ("Password!!!", "a number"),
        ("Password123", "a symbol"),
    ],
)
def test_create_account_weak_password(password: str, missing: str):
    response = client.post("/users", json={**BODY, "password": password})

    assert response.status_code == 422
    assert f"Password needs {missing}" in response.json()["detail"][0]["msg"]


def test_create_account_weak_password_lists_everything_missing():
    response = client.post("/users", json={**BODY, "password": "abcdefgh"})

    assert response.status_code == 422
    assert (
        "Password needs an uppercase letter, a number, a symbol"
        in response.json()["detail"][0]["msg"]
    )


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


# editing the current user


async def test_update_me_username():
    user_id = await make_user("alice")

    response = client.patch("/users/me", json={"username": "alicia"}, headers=auth(user_id))

    assert response.status_code == 200
    assert response.json()["username"] == "alicia"
    assert client.get("/users/me", headers=auth(user_id)).json()["username"] == "alicia"


async def test_update_me_become_driver():
    user_id = await make_user("alice")

    response = client.patch("/users/me", json={"is_driver": True}, headers=auth(user_id))

    assert response.status_code == 200
    assert response.json()["is_driver"] is True
    # other fields stay the same
    assert response.json()["username"] == "alice"


async def test_update_me_stop_driving():
    user_id = await make_user("alice", True)

    response = client.patch("/users/me", json={"is_driver": False}, headers=auth(user_id))

    assert response.status_code == 200
    assert response.json()["is_driver"] is False


async def test_update_me_keep_own_username():
    user_id = await make_user("alice")

    response = client.patch(
        "/users/me", json={"username": "alice", "is_driver": True}, headers=auth(user_id)
    )

    assert response.status_code == 200


async def test_update_me_username_taken():
    user_id = await make_user("alice")
    await make_user("bob")

    response = client.patch("/users/me", json={"username": "bob"}, headers=auth(user_id))

    assert response.status_code == 409
    assert client.get("/users/me", headers=auth(user_id)).json()["username"] == "alice"


async def test_update_me_username_taken_in_a_race(monkeypatch):
    user_id = await make_user("alice")
    await make_user("bob")
    # the check finds no clash, like when someone else takes the name just after it runs
    monkeypatch.setattr(AsyncSession, "scalar", AsyncMock(return_value=None))

    response = client.patch("/users/me", json={"username": "bob"}, headers=auth(user_id))

    assert response.status_code == 409


async def test_update_me_change_password():
    user_id = await make_user("alice", verified=True, password="Password123!")

    response = client.patch(
        "/users/me",
        json={"current_password": "Password123!", "new_password": "NewPassword456?"},
        headers=auth(user_id),
    )

    assert response.status_code == 200
    login = {"email": "alice@myumanitoba.ca"}
    assert client.post("/auth/login", json={**login, "password": "NewPassword456?"}).is_success
    assert client.post("/auth/login", json={**login, "password": "Password123!"}).status_code == 401


@pytest.mark.parametrize(
    "body",
    [
        {"current_password": "Wrong123!", "new_password": "NewPassword456?"},
        {"new_password": "NewPassword456?"},
    ],
)
async def test_update_me_change_password_needs_current_password(body):
    user_id = await make_user("alice", verified=True, password="Password123!")

    response = client.patch("/users/me", json=body, headers=auth(user_id))

    assert response.status_code == 403
    login = {"email": "alice@myumanitoba.ca", "password": "Password123!"}
    assert client.post("/auth/login", json=login).is_success


async def test_update_me_wrong_password_changes_nothing():
    user_id = await make_user("alice", verified=True, password="Password123!")

    response = client.patch(
        "/users/me",
        json={"username": "alicia", "current_password": "Wrong123!", "new_password": "New456?ab"},
        headers=auth(user_id),
    )

    assert response.status_code == 403
    assert client.get("/users/me", headers=auth(user_id)).json()["username"] == "alice"


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"username": None},
        # a current password alone doesn't change anything
        {"current_password": "Password123!"},
        {"username": "al"},
        {"new_password": "weakpass"},
        {"new_password": "Sh0rt!"},
    ],
)
async def test_update_me_invalid(body):
    user_id = await make_user("alice")

    response = client.patch("/users/me", json=body, headers=auth(user_id))

    assert response.status_code == 422


async def test_update_me_not_logged_in():
    response = client.patch("/users/me", json={"username": "alicia"})

    assert response.status_code == 401
