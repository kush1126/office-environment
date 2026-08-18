import asyncio
import asyncpg
import sys

async def create_db():
    try:
        # Connect to the default 'postgres' database
        conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/postgres')
        # Check if database exists
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'officeos'")
        if not exists:
            # Create database
            await conn.execute('CREATE DATABASE officeos')
            print("Database 'officeos' created successfully.")
        else:
            print("Database 'officeos' already exists.")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_db())
