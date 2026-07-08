"""Semantic cache for LLM responses backed by Redis.

Strategy:
- Exact-match cache: hash(system_prompt + user_messages + model) → cached response
- Streaming responses: buffer all chunks, cache the complete result
- Configurable TTL per operation type (chat: 5min, structured: 10min, vision: 30min)

Cache bypass when:
- temperature > 0 (non-deterministic output shouldn't be cached)
- messages contain tool results (dynamic, shouldn't be cached)
- cache is explicitly disabled

Cost saving estimate: 30-40% reduction in LLM calls for repeat/similar queries.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass
from typing import Any

from app.db.redis_client import get_redis

logger = logging.getLogger("llm_cache")

# Redis key prefix
CACHE_PREFIX = "llm_cache:v1"

# TTL per operation type (seconds)
CACHE_TTL = {
    "chat": 300,              # 5 minutes
    "chat_stream": 300,       # 5 minutes
    "chat_with_tools": 120,   # 2 minutes (tool calls are dynamic)
    "generate_structured": 600,  # 10 minutes (structured outputs more stable)
    "chat_vision": 1800,      # 30 minutes (vision results rarely change)
}

# Max cache value size (256KB) — larger responses aren't worth caching
MAX_CACHE_SIZE = 256 * 1024


@dataclass
class CacheEntry:
    """Cached LLM response."""
    content: str
    model: str
    provider: str
    usage_prompt_tokens: int
    usage_completion_tokens: int
    finish_reason: str | None = None
    cached_at: float = 0.0


def _build_cache_key(
    messages: list[dict[str, str]],
    model: str,
    system_prompt: str | None = None,
    operation: str = "chat",
) -> str:
    """Build a deterministic cache key from request parameters.

    Excludes temperature and max_tokens from the key since they don't
    change the semantic meaning of the response.
    """
    # Normalize: sort keys, strip whitespace
    normalized = {
        "op": operation,
        "model": model,
        "system": (system_prompt or "").strip(),
        "messages": [
            {k: v.strip() if isinstance(v, str) else v for k, v in msg.items()}
            for msg in messages
        ],
    }
    payload = json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode()).hexdigest()[:32]
    return f"{CACHE_PREFIX}:{operation}:{model}:{digest}"


def _should_cache(
    messages: list[dict[str, str]],
    temperature: float | None = None,
) -> bool:
    """Determine if this request should be cached.

    Don't cache:
    - Non-deterministic requests (temperature > 0)
    - Tool result messages (dynamic, rarely repeated)
    """
    if temperature and temperature > 0:
        return False

    # Check for tool results — these are rarely cacheable
    for msg in messages:
        if msg.get("role") == "tool":
            return False
        # Tool call assistant messages are also dynamic
        if msg.get("role") == "assistant" and msg.get("tool_calls"):
            return False

    return True


async def get_cached_response(
    messages: list[dict[str, str]],
    model: str,
    system_prompt: str | None = None,
    operation: str = "chat",
    temperature: float | None = None,
) -> CacheEntry | None:
    """Try to retrieve a cached response.

    Returns None on cache miss or if caching is disabled for this request.
    """
    if not _should_cache(messages, temperature):
        return None

    try:
        redis = get_redis()
        key = _build_cache_key(messages, model, system_prompt, operation)
        data = await redis.get(key)

        if data:
            entry = json.loads(data)
            logger.info(
                "[CACHE_HIT] operation=%s model=%s key=%s",
                operation, model, key[-8:],
            )
            return CacheEntry(
                content=entry["content"],
                model=entry["model"],
                provider=entry["provider"],
                usage_prompt_tokens=entry.get("usage_prompt_tokens", 0),
                usage_completion_tokens=entry.get("usage_completion_tokens", 0),
                finish_reason=entry.get("finish_reason"),
                cached_at=entry.get("cached_at", 0),
            )

        logger.debug("[CACHE_MISS] operation=%s model=%s", operation, model)
        return None

    except Exception as e:
        logger.debug("Cache read error: %s", e)
        return None


async def set_cached_response(
    messages: list[dict[str, str]],
    model: str,
    response_content: str,
    provider: str,
    system_prompt: str | None = None,
    operation: str = "chat",
    temperature: float | None = None,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    finish_reason: str | None = None,
) -> None:
    """Store a response in the cache."""
    if not _should_cache(messages, temperature):
        return

    # Don't cache very large responses
    if len(response_content) > MAX_CACHE_SIZE:
        logger.debug("[CACHE_SKIP] response too large: %d bytes", len(response_content))
        return

    try:
        redis = get_redis()
        key = _build_cache_key(messages, model, system_prompt, operation)
        ttl = CACHE_TTL.get(operation, 300)

        entry = json.dumps({
            "content": response_content,
            "model": model,
            "provider": provider,
            "usage_prompt_tokens": prompt_tokens,
            "usage_completion_tokens": completion_tokens,
            "finish_reason": finish_reason,
            "cached_at": time.time(),
        })

        await redis.setex(key, ttl, entry)
        logger.info(
            "[CACHE_STORE] operation=%s model=%s ttl=%ds len=%d",
            operation, model, ttl, len(response_content),
        )

    except Exception as e:
        logger.debug("Cache write error: %s", e)


async def invalidate_cache(
    operation: str | None = None,
    model: str | None = None,
) -> int:
    """Invalidate cache entries. Returns number of keys removed.

    If operation/model is None, invalidates all matching.
    """
    try:
        redis = get_redis()
        pattern_parts = [CACHE_PREFIX]
        if operation:
            pattern_parts.append(operation)
        if model:
            pattern_parts.append(model)
        pattern_parts.append("*")
        pattern = ":".join(pattern_parts)

        keys = []
        cursor = 0
        while True:
            cursor, batch = await redis.scan(cursor, match=pattern, count=100)
            keys.extend(batch)
            if cursor == 0:
                break

        if keys:
            await redis.delete(*keys)
            logger.info("[CACHE_INVALIDATE] removed %d keys matching %s", len(keys), pattern)
        return len(keys)

    except Exception as e:
        logger.warning("Cache invalidation error: %s", e)
        return 0


async def get_cache_stats() -> dict[str, Any]:
    """Get cache statistics for monitoring."""
    try:
        redis = get_redis()
        pattern = f"{CACHE_PREFIX}:*"
        keys = []
        cursor = 0
        while True:
            cursor, batch = await redis.scan(cursor, match=pattern, count=100)
            keys.extend(batch)
            if cursor == 0:
                break

        total = len(keys)
        ttl_info = {}
        for key in keys[:100]:  # Sample first 100 for TTL
            ttl = await redis.ttl(key)
            parts = key.split(":")
            if len(parts) >= 3:
                op = parts[2] if len(parts) > 2 else "unknown"
                ttl_info[key] = {"operation": op, "ttl": ttl}

        return {
            "total_cached_entries": total,
            "sample": dict(list(ttl_info.items())[:20]),
        }
    except Exception as e:
        return {"error": str(e)}
