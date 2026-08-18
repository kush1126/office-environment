"""Pytest configuration and fixtures for backend tests."""
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import hash_password
from main import app

# Use in-memory SQLite for tests (PostgreSQL for integration tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client with DB session override."""
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession):
    """Create an admin user for tests."""
    import uuid
    from datetime import datetime, timezone
    from app.models.user import User, Role
    from app.models.company import Company, UserCompanyAccess

    # Create company
    company = Company(
        id=uuid.uuid4(),
        name="Test Company",
        financial_year_start=4,
        currency="INR",
        timezone="Asia/Kolkata",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(company)

    # Create admin user (superuser — bypasses all permission checks)
    user = User(
        id=uuid.uuid4(),
        username="testadmin",
        email="testadmin@test.local",
        password_hash=hash_password("TestAdmin@123"),
        full_name="Test Admin",
        is_active=True,
        is_superuser=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.flush()

    access = UserCompanyAccess(
        user_id=user.id,
        company_id=company.id,
        is_primary=True,
        granted_at=datetime.now(timezone.utc),
    )
    db.add(access)
    await db.commit()
    return user, company


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, admin_user) -> dict:
    """Return Authorization headers for an authenticated admin."""
    user, company = admin_user
    response = await client.post("/api/v1/auth/login", data={
        "username": "testadmin",
        "password": "TestAdmin@123",
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
