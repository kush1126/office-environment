"""Auth API tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    """Valid credentials return access and refresh tokens."""
    response = await client.post("/api/v1/auth/login", data={
        "username": "testadmin",
        "password": "TestAdmin@123",
    })
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user):
    """Wrong password returns 401."""
    response = await client.post("/api/v1/auth/login", data={
        "username": "testadmin",
        "password": "WrongPassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Non-existent user returns 401."""
    response = await client.post("/api/v1/auth/login", data={
        "username": "ghost",
        "password": "anypassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, auth_headers: dict):
    """Authenticated /me returns user info."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "testadmin"
    assert "permissions" in body
    assert "roles" in body


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    """/me without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, admin_user):
    """Valid refresh token issues new access token."""
    login = await client.post("/api/v1/auth/login", data={
        "username": "testadmin",
        "password": "TestAdmin@123",
    })
    refresh_token = login.json()["refresh_token"]
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, admin_user):
    """Logout revokes the refresh token."""
    login = await client.post("/api/v1/auth/login", data={
        "username": "testadmin",
        "password": "TestAdmin@123",
    })
    refresh_token = login.json()["refresh_token"]
    response = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert response.status_code == 200

    # Token should now be invalid
    refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh.status_code == 401
