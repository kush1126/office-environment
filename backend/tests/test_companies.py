"""Company API tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_companies(client: AsyncClient, auth_headers: dict, admin_user):
    """Authenticated user can list companies."""
    response = await client.get("/api/v1/companies", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 1


@pytest.mark.asyncio
async def test_create_company(client: AsyncClient, auth_headers: dict):
    """Admin can create a company."""
    response = await client.post("/api/v1/companies", headers=auth_headers, json={
        "name": "Test Corp",
        "city": "Mumbai",
        "state": "Maharashtra",
    })
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Test Corp"
    assert body["city"] == "Mumbai"
    assert "id" in body


@pytest.mark.asyncio
async def test_create_company_invalid_gstin(client: AsyncClient, auth_headers: dict):
    """Invalid GSTIN (wrong length) is rejected."""
    response = await client.post("/api/v1/companies", headers=auth_headers, json={
        "name": "Bad GSTIN Corp",
        "gstin": "TOOSHORT",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_company(client: AsyncClient, auth_headers: dict, admin_user):
    """Can fetch a company by ID."""
    _, company = admin_user
    response = await client.get(f"/api/v1/companies/{company.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(company.id)


@pytest.mark.asyncio
async def test_update_company(client: AsyncClient, auth_headers: dict, admin_user):
    """Can update a company's city."""
    _, company = admin_user
    response = await client.patch(
        f"/api/v1/companies/{company.id}",
        headers=auth_headers,
        json={"city": "Nagpur"},
    )
    assert response.status_code == 200
    assert response.json()["city"] == "Nagpur"


@pytest.mark.asyncio
async def test_list_companies_unauthenticated(client: AsyncClient):
    """Unauthenticated request is rejected."""
    response = await client.get("/api/v1/companies")
    assert response.status_code == 401
