"""Users API tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers: dict, admin_user):
    """Authenticated user with permission can list users."""
    response = await client.get("/api/v1/users", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 1


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, auth_headers: dict):
    """Admin can create a new user."""
    response = await client.post("/api/v1/users", headers=auth_headers, json={
        "username": "newuser",
        "email": "newuser@test.local",
        "password": "StrongPassword@123",
        "full_name": "New User"
    })
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "newuser"
    assert body["email"] == "newuser@test.local"
    assert "id" in body


@pytest.mark.asyncio
async def test_create_user_weak_password(client: AsyncClient, auth_headers: dict):
    """User creation fails with a weak password."""
    response = await client.post("/api/v1/users", headers=auth_headers, json={
        "username": "weakuser",
        "email": "weakuser@test.local",
        "password": "password",
        "full_name": "Weak User"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_user(client: AsyncClient, auth_headers: dict, admin_user):
    """Can fetch a user by ID."""
    user, _ = admin_user
    response = await client.get(f"/api/v1/users/{user.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(user.id)


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient, auth_headers: dict, admin_user):
    """Can update a user's full name."""
    user, _ = admin_user
    response = await client.patch(
        f"/api/v1/users/{user.id}",
        headers=auth_headers,
        json={"full_name": "Updated Admin"}
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Admin"


@pytest.mark.asyncio
async def test_list_roles_and_permissions(client: AsyncClient, auth_headers: dict):
    """Can list available roles and permissions."""
    res_roles = await client.get("/api/v1/users/roles/list", headers=auth_headers)
    assert res_roles.status_code == 200
    assert isinstance(res_roles.json(), list)

    res_perms = await client.get("/api/v1/users/permissions/list", headers=auth_headers)
    assert res_perms.status_code == 200
    assert isinstance(res_perms.json(), list)
