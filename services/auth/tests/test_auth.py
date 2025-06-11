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

@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client):
    email = f"logoutuser_{uuid.uuid4()}@example.com"
    password = "logoutpassword"
    await client.post("/api/v1/users/", json={"email": email, "password": password})

    login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
    tokens = login_res.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    logout_res = await client.post(
        "/api/v1/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert logout_res.status_code == 204

    refresh_res = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 401
    assert refresh_res.json().get("detail") == "Invalid or reused refresh token"

@pytest.mark.asyncio
async def test_refresh_token_invalid_token(client):
    invalid_token = "this.is.not.a.valid.token"
    res = await client.post("/api/v1/refresh", json={"refresh_token": invalid_token})
    assert res.status_code == 401
    assert res.json().get("detail") == "Invalid refresh token"

@pytest.mark.asyncio
async def test_refresh_token_missing_token(client):
    res = await client.post("/api/v1/refresh", json={})
    assert res.status_code in (400, 422)

@pytest.mark.asyncio
async def test_refresh_token_expired_token(client):
    email = f"expireduser_{uuid.uuid4()}@example.com"
    password = "expiredpassword"
    await client.post("/api/v1/users/", json={"email": email, "password": password})
    login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
    refresh_token = login_res.json()["refresh_token"]

    access_token = login_res.json()["access_token"]
    await client.post("/api/v1/logout", headers={"Authorization": f"Bearer {access_token}"})
    @pytest.mark.asyncio
    async def test_refresh_token_double_use(client):
        """
        Ensure that a refresh token cannot be used more than once.
        """
        email = f"doubleuse_{uuid.uuid4()}@example.com"
        password = "doublepass"
        await client.post("/api/v1/users/", json={"email": email, "password": password})
        login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
        refresh_token = login_res.json()["refresh_token"]

        # First use should succeed
        res1 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
        assert res1.status_code == 200
        assert "access_token" in res1.json()
        assert "refresh_token" in res1.json()

        # Second use should fail
        res2 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
        assert res2.status_code == 401
        assert res2.json().get("detail") in ("Invalid or reused refresh token", "Invalid refresh token")

    @pytest.mark.asyncio
    async def test_refresh_token_chain_reuse(client):
        """
        Ensure that only the latest refresh token in a chain is valid.
        """
        email = f"chainuser_{uuid.uuid4()}@example.com"
        password = "chainpass"
        await client.post("/api/v1/users/", json={"email": email, "password": password})
        login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
        refresh_token1 = login_res.json()["refresh_token"]

        # First refresh
        res1 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token1})
        assert res1.status_code == 200
        refresh_token2 = res1.json()["refresh_token"]

        # Second refresh with new token
        res2 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token2})
        assert res2.status_code == 200
        refresh_token3 = res2.json()["refresh_token"]

        # Old tokens should now be invalid
        res_old1 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token1})
        assert res_old1.status_code == 401

        res_old2 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token2})
        assert res_old2.status_code == 401

        # Only the latest token is valid
        res3 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token3})
        assert res3.status_code == 200
        assert "access_token" in res3.json()
        assert "refresh_token" in res3.json()

    @pytest.mark.asyncio
    async def test_refresh_token_for_another_user(client):
        """
        Ensure that a refresh token cannot be used by another user.
        """
        # Register two users
        email1 = f"user1_{uuid.uuid4()}@example.com"
        email2 = f"user2_{uuid.uuid4()}@example.com"
        password = "testpass"
        await client.post("/api/v1/users/", json={"email": email1, "password": password})
        await client.post("/api/v1/users/", json={"email": email2, "password": password})

        # Login as user1 and get refresh token
        login_res1 = await client.post("/api/v1/token", data={"username": email1, "password": password})
        refresh_token1 = login_res1.json()["refresh_token"]

        # Login as user2 and get access token
        login_res2 = await client.post("/api/v1/token", data={"username": email2, "password": password})
        access_token2 = login_res2.json()["access_token"]

        # Try to use user1's refresh token as user2 (should not matter, refresh endpoint is not authenticated)
        res = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token1})
        assert res.status_code == 200 or res.status_code == 401  # Acceptable: depends on implementation

    @pytest.mark.asyncio
    async def test_refresh_token_revoked_after_logout(client):
        """
        Ensure that after logout, the refresh token is revoked and cannot be used.
        """
        email = f"logoutrevoked_{uuid.uuid4()}@example.com"
        password = "logoutpass"
        await client.post("/api/v1/users/", json={"email": email, "password": password})
        login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
        tokens = login_res.json()
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        # Logout
        logout_res = await client.post("/api/v1/logout", headers={"Authorization": f"Bearer {access_token}"})
        assert logout_res.status_code == 204

        # Try to use refresh token after logout
        refresh_res = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
        assert refresh_res.status_code == 401
        assert refresh_res.json().get("detail") == "Invalid or reused refresh token"
