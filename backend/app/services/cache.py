"""
Simple in-memory TTL cache.

On Vercel, a warm serverless instance can stay live for several minutes.
Caching external API responses here avoids re-hitting Steam/ITAD/CheapShark
on every request and cuts game page load time from ~3-8 s to <50 ms for
repeat visitors.
"""
import time
from typing import Any, Optional, Dict, Tuple, Union

_store: Dict[str, Union[Tuple[float, Any], Tuple[float, Any, int]]] = {}


def get(key: str, ttl: int = 300) -> Optional[Any]:
    """Return cached value if it exists and is younger than ttl seconds."""
    entry = _store.get(key)
    if not entry:
        return None

    # Backward-compatible with old 2-tuple entries and new 3-tuple entries.
    if len(entry) == 3:
        stored_at, value, entry_ttl = entry
        effective_ttl = entry_ttl
    else:
        stored_at, value = entry
        effective_ttl = ttl

    if (time.time() - stored_at) < effective_ttl:
        return value
    return None


def set(key: str, value: Any, ttl: Optional[int] = None) -> None:  # noqa: A001
    if ttl is not None:
        _store[key] = (time.time(), value, ttl)
    else:
        _store[key] = (time.time(), value)


def invalidate(key: str) -> None:
    _store.pop(key, None)


def clear() -> None:
    _store.clear()
