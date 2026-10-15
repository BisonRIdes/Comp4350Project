from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_unauthorized():
    response = client.get("/test")

    assert response.status_code == 401
    assert response.json() == {'detail': 'Unauthorized'}
    

def test_health_check():
    response = client.get("/test", headers={"x-key": "12345qwerty"})

    assert response.status_code == 200
    assert response.json() == {"message": "API is working!"}
