import asyncio
from app.core.database import AsyncSessionLocal
from app.models import User
from sqlalchemy import select
from app.core.security import verify_password
import sys

# Windows fix for asyncio loop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def f():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"User: {u.email}, Hash: {u.password_hash}")
            print(f"Verify 'admin123': {verify_password('admin123', u.password_hash)}")

asyncio.run(f())
