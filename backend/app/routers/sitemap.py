"""
Dynamic Sitemap Generator
Generates XML sitemap with static pages + popular games
"""
from fastapi import APIRouter, Response
from sqlalchemy import select, func
from datetime import datetime
from ..database import get_db
from ..models.models import Game

router = APIRouter()

STATIC_URLS = [
    {"loc": "https://serpodin.nl/", "priority": "1.0", "changefreq": "daily"},
    {"loc": "https://serpodin.nl/deals", "priority": "0.9", "changefreq": "daily"},
    {"loc": "https://serpodin.nl/browse", "priority": "0.8", "changefreq": "weekly"},
    {"loc": "https://serpodin.nl/login", "priority": "0.5", "changefreq": "monthly"},
    {"loc": "https://serpodin.nl/register", "priority": "0.5", "changefreq": "monthly"},
]


@router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate dynamic sitemap with static pages + top games"""

    xml_content = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    # Add static URLs
    for url in STATIC_URLS:
        xml_content.append("  <url>")
        xml_content.append(f'    <loc>{url["loc"]}</loc>')
        xml_content.append(f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>')
        xml_content.append(f'    <changefreq>{url["changefreq"]}</changefreq>')
        xml_content.append(f'    <priority>{url["priority"]}</priority>')
        xml_content.append("  </url>")

    # Add top 100 most accessed games (if available)
    try:
        async for db in get_db():
            result = await db.execute(
                select(Game.steam_appid, Game.last_updated)
                .order_by(Game.last_updated.desc())
                .limit(100)
            )
            games = result.all()

            for game in games:
                xml_content.append("  <url>")
                xml_content.append(f'    <loc>https://serpodin.nl/game/{game.steam_appid}</loc>')
                lastmod = game.last_updated.strftime("%Y-%m-%d") if game.last_updated else datetime.now().strftime("%Y-%m-%d")
                xml_content.append(f'    <lastmod>{lastmod}</lastmod>')
                xml_content.append('    <changefreq>weekly</changefreq>')
                xml_content.append('    <priority>0.7</priority>')
                xml_content.append("  </url>")

            break  # Exit after first iteration
    except Exception as e:
        print(f"Error fetching games for sitemap: {e}")
        # Continue with just static URLs if database fails

    xml_content.append("</urlset>")

    sitemap_xml = "\n".join(xml_content)

    return Response(
        content=sitemap_xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=86400"}  # Cache for 24 hours
    )


@router.get("/robots.txt")
async def robots_txt():
    """Serve robots.txt"""
    content = """User-agent: *
Allow: /
Disallow: /api/
Disallow: /profile
Disallow: /wishlist
Disallow: /alerts

Sitemap: https://serpodin.nl/sitemap.xml

Crawl-delay: 1
"""
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=86400"}
    )
