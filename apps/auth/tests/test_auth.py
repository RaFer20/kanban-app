import pytest
import uuid

@pytest.mark.asyncio
async def test_example(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_register_user(client):
    email = f"newuser_{uuid.uuid4()}@example.com"
    response = await client.post("/api/v1/users/", json={
        "email": email,
        "password": "newpassword"
    })
    assert response.status_code in (200, 201)
    assert response.json()["email"] == email

@pytest.mark.asyncio
async def test_login_success(client):
    email = f"testuser_{uuid.uuid4()}@example.com"
    register_response = await client.post("/api/v1/users/", json={
        "email": email,
        "password": "testpassword"
    })
    assert register_response.status_code in (200, 201)
    response = await client.post("/api/v1/token", data={
        "username": email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert "refresh_token" in json_data
    assert json_data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_password(client):
    email = f"testuser_{uuid.uuid4()}@example.com"
    await client.post("/api/v1/users/", json={
        "email": email,
        "password": "testpassword"
    })
    response = await client.post("/api/v1/token", data={
        "username": email,
        "password": "wrongpassword"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_refresh_token_success(client):
    email = f"testuser_{uuid.uuid4()}@example.com"
    await client.post("/api/v1/users/", json={
        "email": email,
        "password": "testpassword"
    })
    login_res = await client.post("/api/v1/token", data={
        "username": email,
        "password": "testpassword"
    })
    assert login_res.status_code == 200
    refresh_token = login_res.json()["refresh_token"]
    refresh_res = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()

@pytest.mark.asyncio
async def test_register_duplicate_user(client):
    email = f"dupuser_{uuid.uuid4()}@example.com"
    payload = {"email": email, "password": "password123"}
    res1 = await client.post("/api/v1/users/", json=payload)
    assert res1.status_code in (200, 201)
    res2 = await client.post("/api/v1/users/", json=payload)
    assert res2.status_code in (400, 409)

@pytest.mark.asyncio
async def test_register_invalid_email_format(client):
    response = await client.post("/api/v1/users/", json={
        "email": "not-an-email",
        "password": "somepassword"
    })
    assert response.status_code in (400, 422)

@pytest.mark.asyncio
async def test_login_wrong_password(client):
    email = f"wrongpass_{uuid.uuid4()}@example.com"
    await client.post("/api/v1/users/", json={
        "email": email,
        "password": "correctpassword"
    })
    response = await client.post("/api/v1/token", data={
        "username": email,
        "password": "incorrectpassword"
    })
    assert response.status_code == 401
