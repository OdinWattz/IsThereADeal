"""
Quick fix script to drop the followed_games table.
Run this if you're seeing errors with wishlist, collections, alerts, or stats pages.
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()


async def fix_database():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in .env")
        return

    # Parse database URL
    parsed = urlparse(database_url.replace("postgres://", "postgresql://"))

    print(f"Connecting to database: {parsed.hostname}")

    try:
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip("/"),
            ssl="require" if parsed.hostname and "localhost" not in parsed.hostname else None
        )

        # Check if table exists
        result = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'followed_games')"
        )

        if result:
            print("❌ Found followed_games table - dropping it...")
            await conn.execute("DROP TABLE IF EXISTS followed_games CASCADE")
            print("✅ Dropped followed_games table successfully!")
        else:
            print("✅ followed_games table doesn't exist - database is clean!")

        await conn.close()
        print("\n✅ Database fix complete! Restart your backend server now.")

    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nIf you can't connect, you can also run this SQL manually in your database:")
        print("   DROP TABLE IF EXISTS followed_games CASCADE;")


if __name__ == "__main__":
    asyncio.run(fix_database())
