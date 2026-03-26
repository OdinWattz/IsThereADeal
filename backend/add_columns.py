"""
Add missing columns to the games table.
Run this script to fix the database schema.
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()


async def add_columns():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not found in .env")
        return

    # Parse database URL
    url = database_url.replace("postgres://", "postgresql://")
    parsed = urlparse(url)

    print(f"[INFO] Connecting to database: {parsed.hostname}")

    try:
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip("/"),
            ssl="require" if parsed.hostname and "localhost" not in parsed.hostname else None
        )

        print("[INFO] Adding missing columns to games table...")

        # Add columns if they don't exist
        await conn.execute("""
            ALTER TABLE games
            ADD COLUMN IF NOT EXISTS historic_low_price FLOAT,
            ADD COLUMN IF NOT EXISTS historic_low_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS metacritic_score INTEGER,
            ADD COLUMN IF NOT EXISTS steam_review_score INTEGER,
            ADD COLUMN IF NOT EXISTS steam_review_count INTEGER,
            ADD COLUMN IF NOT EXISTS player_count_current INTEGER,
            ADD COLUMN IF NOT EXISTS player_count_peak INTEGER
        """)

        print("[SUCCESS] Columns added successfully!")

        # Verify columns
        print("\n[INFO] Verifying columns...")
        columns = await conn.fetch("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'games'
            ORDER BY ordinal_position
        """)

        print("\nGames table columns:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']}")

        await conn.close()
        print("\n[SUCCESS] Database migration complete!")

    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    asyncio.run(add_columns())
