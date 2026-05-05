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


# Separate store for rate-limit counters: {key: (window_start, count)}
_rl_store: Dict[str, Tuple[float, int]] = {}


def check_rate_limit(key: str, limit: int, window: int) -> bool:
    """Best-effort in-process rate limiter.

    Returns True when the caller has exceeded *limit* calls inside *window*
    seconds.  Not distributed across Vercel function instances, but stops
    the vast majority of brute-force and credential-stuffing attacks that
    hit the same warm instance repeatedly.

    Args:
        key:    Unique identifier for this bucket (e.g. "login:<ip>").
        limit:  Maximum allowed calls per window.
        window: Rolling window size in seconds.
    """
    now = time.time()
    entry = _rl_store.get(key)
    if entry:
        window_start, count = entry
        if now - window_start < window:
            if count >= limit:
                return True          # limit exceeded
            _rl_store[key] = (window_start, count + 1)
        else:
            _rl_store[key] = (now, 1)  # window expired, reset
    else:
        _rl_store[key] = (now, 1)
    return False
