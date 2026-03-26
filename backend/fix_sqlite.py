"""
Fix SQLite database by dropping the followed_games table.
"""
import sqlite3
import os

db_path = "./gamedeals.db"

if not os.path.exists(db_path):
    print(f"[ERROR] Database file not found at {db_path}")
    print("   Make sure you're running this from the backend directory")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='followed_games'")
    result = cursor.fetchone()

    if result:
        print("[INFO] Found followed_games table - dropping it...")
        cursor.execute("DROP TABLE IF EXISTS followed_games")
        conn.commit()
        print("[SUCCESS] Dropped followed_games table successfully!")
    else:
        print("[SUCCESS] followed_games table doesn't exist - database is clean!")

    conn.close()
    print("\n[SUCCESS] Database fix complete! Your pages should work now.")

except Exception as e:
    print(f"[ERROR] {e}")
