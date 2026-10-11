from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/test")
    
    assert response.status_code == 200
    assert response.json() == {"message": "API is working!"}