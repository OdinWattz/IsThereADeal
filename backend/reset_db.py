"""
Database reset script - drops all tables and recreates them.
Use this in development to fix schema issues.
"""
import asyncio
from app.database import _get_engine, Base


async def reset_database():
    engine, _ = _get_engine()

    print("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database reset complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset_database())
