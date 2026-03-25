"""
Simple in-memory TTL cache.

On Vercel, a warm serverless instance can stay live for several minutes.
Caching external API responses here avoids re-hitting Steam/ITAD/CheapShark
on every request and cuts game page load time from ~3-8 s to <50 ms for
repeat visitors.
"""
import time
from typing import Any, Optional, Dict, Tuple

_store: Dict[str, Tuple[float, Any]] = {}


def get(key: str, ttl: int = 300) -> Optional[Any]:
    """Return cached value if it exists and is younger than ttl seconds."""
    entry = _store.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def set(key: str, value: Any) -> None:  # noqa: A001
    _store[key] = (time.time(), value)


def invalidate(key: str) -> None:
    _store.pop(key, None)


def clear() -> None:
    _store.clear()
