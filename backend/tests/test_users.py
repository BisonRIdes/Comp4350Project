from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from main import app

client = TestClient(app)
HEADERS = {"x-key": "12345qwerty"}
BODY = {"username": "alice", "email": "alice@example.com", "password": "password123"}


def test_create_account() -> None:
    response = client.post("/users", json=BODY, headers=HEADERS)

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "alice"
    assert data["is_driver"] is False
    assert "password" not in data 
    assert "password_hash" not in data


def test_create_account_duplicate() -> None:
    client.post("/users", json=BODY, headers=HEADERS)
    response = client.post("/users", json={**BODY, "username": "bob"}, headers=HEADERS)

    assert response.status_code == 409

def test_create_account_concurrent_signup():
    db = AsyncMock(spec=AsyncSession)
    db.scalar.return_value = None
    db.commit.side_effect = IntegrityError("INSERT", {}, Exception("duplicate key"))

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = client.post("/users", json=BODY, headers=HEADERS)
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 409
    assert response.json() == {"detail": "Username or email already exists"}
    db.rollback.assert_awaited_once()


def test_create_account_validation():
    response = client.post("/users", json={**BODY, "password": "short"}, headers=HEADERS)

    assert response.status_code == 422
