"""
Script to seed initial store data. Run once after migrations.
"""
import asyncio
from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models.models import Store


async def seed_stores():
    """Create default stores if they don't exist"""
    db = AsyncSessionLocal()
    
    stores_data = [
        {"name": "Steam", "url": "https://steampowered.com", "is_official": True, "is_key_reseller": False, "avg_rating": 4.5},
        {"name": "GOG", "url": "https://gog.com", "is_official": True, "is_key_reseller": False, "avg_rating": 4.3},
        {"name": "Epic Games Store", "url": "https://epicgames.com", "is_official": True, "is_key_reseller": False, "avg_rating": 4.0},
        {"name": "Humble Bundle", "url": "https://humblebundle.com", "is_official": True, "is_key_reseller": False, "avg_rating": 4.6},
        {"name": "Fanatical", "url": "https://fanatical.com", "is_official": True, "is_key_reseller": False, "avg_rating": 4.2},
        {"name": "G2A", "url": "https://g2a.com", "is_official": False, "is_key_reseller": True, "avg_rating": 3.0},
        {"name": "Kinguin", "url": "https://kinguin.net", "is_official": False, "is_key_reseller": True, "avg_rating": 3.2},
        {"name": "Eneba", "url": "https://eneba.com", "is_official": False, "is_key_reseller": True, "avg_rating": 3.5},
    ]
    
    for store_data in stores_data:
        # Check if store already exists
        result = await db.execute(select(Store).where(Store.name == store_data["name"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            store = Store(**store_data, review_count=0)
            db.add(store)
            print(f"✓ Added store: {store_data['name']}")
        else:
            print(f"✗ Store already exists: {store_data['name']}")
    
    await db.commit()
    await db.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(seed_stores())
