import asyncio
from app.core.database import AsyncSessionLocal
from app.models import User
from sqlalchemy import select
from app.services.auth_service import AuthService
import sys

# Windows fix for asyncio loop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test_auth():
    auth_service = AuthService()
    async with AsyncSessionLocal() as db:
        try:
            acc, ref, user = await auth_service.authenticate(db, "admin@rsquare.com", "admin123")
            print("Auth Service Success! User ID:", user.id)
        except Exception as e:
            print("Auth Service Failed:", str(e))

asyncio.run(test_auth())
