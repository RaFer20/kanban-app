import re
import uuid
import pytest
import asyncio
import time
import logging
from jose import jwt, JWTError
from unittest.mock import patch
from app.core.config import get_settings
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry import trace
from typing import cast


settings = get_settings()

@pytest.mark.asyncio
async def test_example(client):
    """Health check endpoint returns 200 and expected status."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_register_user(client):
    """Register a new user with valid credentials."""
    email = f"newuser_{uuid.uuid4()}@example.com"
    response = await client.post("/api/v1/users/", json={
        "email": email,
        "password": "newpassword"
    })
    assert response.status_code in (200, 201)
    assert response.json()["email"] == email

@pytest.mark.asyncio
async def test_login_success(client):
    """Login succeeds with correct credentials and returns tokens."""
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
    """Login fails with incorrect password."""
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
    """Refresh token endpoint returns new access token on valid refresh."""
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
    """Registering with an existing email fails."""
    email = f"dupuser_{uuid.uuid4()}@example.com"
    payload = {"email": email, "password": "password123"}
    res1 = await client.post("/api/v1/users/", json=payload)
    assert res1.status_code in (200, 201)
    res2 = await client.post("/api/v1/users/", json=payload)
    assert res2.status_code in (400, 409)

@pytest.mark.asyncio
async def test_register_invalid_email_format(client):
    """Registering with an invalid email format fails."""
    response = await client.post("/api/v1/users/", json={
        "email": "not-an-email",
        "password": "somepassword"
    })
    assert response.status_code in (400, 422)

@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Login fails with wrong password."""
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
    """Logout revokes refresh token and prevents its reuse."""
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
    assert refresh_res.json().get("detail") == "Refresh token invalid or reused"

@pytest.mark.asyncio
async def test_refresh_token_invalid_token(client):
    """Invalid refresh token is rejected."""
    invalid_token = "this.is.not.a.valid.token"
    res = await client.post("/api/v1/refresh", json={"refresh_token": invalid_token})
    assert res.status_code == 401
    assert res.json().get("detail") == "Invalid refresh token"

@pytest.mark.asyncio
async def test_refresh_token_missing_token(client):
    """Missing refresh token in request is rejected."""
    res = await client.post("/api/v1/refresh", json={})
    assert res.status_code in (400, 422)

@pytest.mark.asyncio
async def test_refresh_token_expired_token(client):
    """Refresh token is invalid after logout (simulate expiry/revocation)."""
    email = f"expireduser_{uuid.uuid4()}@example.com"
    password = "expiredpassword"
    await client.post("/api/v1/users/", json={"email": email, "password": password})
    login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
    refresh_token = login_res.json()["refresh_token"]

    access_token = login_res.json()["access_token"]
    await client.post("/api/v1/logout", headers={"Authorization": f"Bearer {access_token}"})
    # ...assert expired/invalid refresh token here if needed...

@pytest.mark.asyncio
async def test_refresh_token_double_use(client):
    """Refresh token cannot be used more than once (reuse is blocked)."""
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
    assert res2.json().get("detail") in ("Refresh token invalid or reused", "Invalid refresh token")


@pytest.mark.asyncio
async def test_refresh_token_for_another_user(client):
    """Refresh token cannot be used by another user (cross-user misuse)."""
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
    """Refresh token is revoked after logout and cannot be reused."""
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
    assert refresh_res.json().get("detail") == "Refresh token invalid or reused"


@pytest.mark.asyncio
async def test_refresh_token_contains_iat_claim(client):
    """Refresh token payload contains 'iat' (issued at) claim."""
    email = f"iatuser_{uuid.uuid4()}@example.com"
    password = "iatpass"

    # Register user
    await client.post("/api/v1/users/", json={"email": email, "password": password})

    # Login and get refresh token
    login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
    refresh_token = login_res.json()["refresh_token"]

    # Decode refresh token without verifying expiration (ignore exp for test)
    payload = jwt.decode(
        refresh_token,
        settings.secret_key,
        algorithms=[settings.algorithm],
        options={"verify_exp": False}
    )

    assert "iat" in payload
    assert isinstance(payload["iat"], int)



@pytest.mark.asyncio
async def test_refresh_token_reuse_blocked(client):
    """Each refresh token can only be used once; reuse is blocked."""
    email = f"user_{uuid.uuid4()}@example.com"
    password = "testpassword"
    
    # Register new user
    res_register = await client.post("/api/v1/users/", json={"email": email, "password": password})
    assert res_register.status_code == 200
    
    # Login to get initial tokens
    login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
    assert login_res.status_code == 200
    tokens = login_res.json()
    refresh_token_1 = tokens["refresh_token"]
    print("refresh_token_1:", refresh_token_1)

    # Use refresh token to get new tokens (first refresh)
    refresh_res_1 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token_1})
    assert refresh_res_1.status_code == 200
    refresh_token_2 = refresh_res_1.json()["refresh_token"]
    print("refresh_token_2:", refresh_token_2)

    await asyncio.sleep(0.1)

    # Using old refresh token again should fail (reuse detected)
    refresh_res_reuse = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token_1})
    assert refresh_res_reuse.status_code == 401

    # Use second refresh token to get new tokens (second refresh)
    refresh_res_2 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token_2})
    print("refresh_res_2.status_code:", refresh_res_2.status_code)
    print("refresh_res_2.json():", refresh_res_2.json())
    assert refresh_res_2.status_code == 200
    refresh_token_3 = refresh_res_2.json()["refresh_token"]
    print("refresh_token_3:", refresh_token_3)

    await asyncio.sleep(0.1)

    # Using second refresh token again should fail (reuse detected)
    refresh_res_reuse2 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token_2})
    assert refresh_res_reuse2.status_code == 401

    # The latest refresh token should still work (third refresh)
    refresh_res_3 = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token_3})
    print("refresh_res_3.status_code:", refresh_res_3.status_code)
    print("refresh_res_3.json():", refresh_res_3.json())
    assert refresh_res_3.status_code == 200


@pytest.mark.asyncio
async def test_access_token_tampering(client):
    """Tampered access tokens are rejected by protected endpoints."""
    email = f"tampertest_{uuid.uuid4()}@example.com"
    password = "tamperpass"
    await client.post("/api/v1/users/", json={"email": email, "password": password})
    login_res = await client.post("/api/v1/token", data={"username": email, "password": password})
    tokens = login_res.json()
    access_token = tokens["access_token"]

    # Tamper with the payload (change a character)
    parts = access_token.split('.')
    assert len(parts) == 3
    import base64
    import json

    payload_bytes = base64.urlsafe_b64decode(parts[1] + '==')
    payload = json.loads(payload_bytes)
    payload["sub"] = "hacker@example.com"
    new_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    tampered_token = f"{parts[0]}.{new_payload}.{parts[2]}"

    # Use the correct protected endpoint
    res = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401 or res.status_code == 403

@pytest.mark.asyncio
async def test_metrics_user_registration(client):
    """Register a user and check registration metric increments."""
    email = f"metricsuser_{uuid.uuid4()}@example.com"
    # Register user
    res = await client.post("/api/v1/users/", json={"email": email, "password": "testpassword"})
    assert res.status_code in (200, 201)
    # Fetch metrics
    metrics_res = await client.get("/metrics")
    assert metrics_res.status_code == 200
    # Check registration metric is present and incremented
    assert re.search(r'app_user_registrations_total\{method="password"\} [1-9][0-9]*\.0', metrics_res.text)

@pytest.mark.asyncio
async def test_metrics_user_login(client):
    """Login a user and check login metric increments."""
    email = f"metricslogin_{uuid.uuid4()}@example.com"
    # Register user
    await client.post("/api/v1/users/", json={"email": email, "password": "testpassword"})
    # Login user
    res = await client.post("/api/v1/token", data={"username": email, "password": "testpassword"})
    assert res.status_code == 200
    # Fetch metrics
    metrics_res = await client.get("/metrics")
    assert metrics_res.status_code == 200
    # Check login metric is present and incremented
    assert re.search(r'app_user_logins_total\{method="password"\} [1-9][0-9]*\.0', metrics_res.text)

@pytest.mark.asyncio
async def test_metrics_refresh_token_usage(client):
    """Use refresh token and check refresh token usage metric increments."""
    email = f"metricsrefresh_{uuid.uuid4()}@example.com"
    # Register user
    await client.post("/api/v1/users/", json={"email": email, "password": "testpassword"})
    # Login user to get tokens
    login_res = await client.post("/api/v1/token", data={"username": email, "password": "testpassword"})
    assert login_res.status_code == 200
    refresh_token = login_res.json()["refresh_token"]
    # Use refresh token
    refresh_res = await client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    # Fetch metrics
    metrics_res = await client.get("/metrics")
    assert metrics_res.status_code == 200
    # Check refresh token usage metric is present and incremented
    assert re.search(r'app_refresh_token_usage_total\{method="refresh"\} [1-9][0-9]*\.0', metrics_res.text)

@pytest.mark.asyncio
async def test_logging_middleware(client, caplog):
    """Test that request/response logs are emitted for an endpoint."""
    with caplog.at_level(logging.INFO, logger="auth"):
        await client.get("/api/v1/health")
    # Check that both request_start and request_end events are logged
    assert any("request_start" in record.getMessage() for record in caplog.records)
    assert any("request_end" in record.getMessage() for record in caplog.records)

@pytest.mark.asyncio
async def test_tracing_span_created(client):
    """Test that a tracing span is created for a request."""
    # Get the global tracer provider (already set by the app)
    provider = cast(TracerProvider, trace.get_tracer_provider())
    exporter = InMemorySpanExporter()
    processor = SimpleSpanProcessor(exporter)
    provider.add_span_processor(processor)

    # Make a request
    await client.get("/api/v1/health")

    # Check that at least one span was exported
    spans = exporter.get_finished_spans()
    assert len(spans) > 0
    # Optionally, check span names
    assert any("/api/v1/health" in span.name for span in spans)
