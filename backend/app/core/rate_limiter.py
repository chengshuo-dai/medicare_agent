"""Redis-based sliding window rate limiting middleware.

Implements configurable rate limits per endpoint category:
- auth:    20 req/min  (login/register — prevent brute force)
- llm:     30 req/min  (LLM calls — cost control)
- general: 120 req/min (standard API)
- admin:   300 req/min (admin dashboard)

Uses Redis sorted sets for sliding window implementation.
Returns 429 Too Many Requests with Retry-After header.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.db.redis_client import get_redis

logger = logging.getLogger("rate_limiter")

RATE_LIMIT_KEY = "rate_limit"

# Limits: (max_requests, window_seconds)
DEFAULT_LIMITS: dict[str, tuple[int, int]] = {
    "auth": (100, 60),      # 100 requests per minute
    "llm": (200, 60),       # 200 LLM calls per minute
    "agents": (60, 60),     # 60 agent calls per minute
    "admin": (300, 60),     # 300 admin requests per minute
    "upload": (50, 60),     # 50 uploads per minute
    "general": (300, 60),   # 300 general API calls per minute
}


def categorize_request(path: str) -> str:
    """Map request path to rate limit category."""
    path = path.lower()
    if "/auth/" in path:
        return "auth"
    if "/llm/" in path:
        return "llm"
    if "/agents/" in path:
        return "agents"
    if "/admin/" in path:
        return "admin"
    if "/upload/" in path:
        return "upload"
    return "general"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter per client IP.

    Tracks requests in Redis sorted sets:
      Key:   rate_limit:{category}:{client_ip}
      Score: request timestamp
      Member: unique request id (timestamp + random)

    Configuration via DEFAULT_LIMITS dict above.
    To make limits dynamic, extend to read from SystemSettings table.
    """

    def __init__(self, app, limits: dict[str, tuple[int, int]] | None = None) -> None:
        super().__init__(app)
        self.limits = limits or DEFAULT_LIMITS

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health/readiness probes
        path = request.url.path
        if path in ("/health", "/ready", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        # Skip non-API routes
        if not path.startswith("/api/"):
            return await call_next(request)

        category = categorize_request(path)
        limit, window = self.limits.get(category, self.limits["general"])

        # Get client identifier (IP or X-Forwarded-For)
        client_ip = self._get_client_ip(request)

        # Check rate limit
        is_limited, retry_after = await self._check_limit(
            category, client_ip, limit, window
        )

        if is_limited:
            logger.warning(
                "[RATE_LIMIT] category=%s ip=%s limit=%d/%ds retry_after=%ds",
                category, client_ip, limit, window, retry_after,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Too many requests. Rate limit: {limit} requests per {window}s. "
                              f"Retry after {retry_after}s.",
                    "retry_after": retry_after,
                    "limit": limit,
                    "window": window,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Extract client IP, handling proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        client = request.client
        return client.host if client else "unknown"

    @staticmethod
    async def _check_limit(
        category: str,
        client_ip: str,
        limit: int,
        window: int,
    ) -> tuple[bool, int]:
        """Check if request is within rate limit.

        Uses sliding window: counts requests in [now - window, now].

        Returns:
            (is_limited: bool, retry_after_seconds: int)
        """
        try:
            redis = get_redis()
            key = f"{RATE_LIMIT_KEY}:{category}:{client_ip}"
            now = time.time()
            window_start = now - window

            # Remove expired entries (outside the window)
            await redis.zremrangebyscore(key, 0, window_start)

            # Count current requests in window
            count = await redis.zcard(key)

            if count >= limit:
                # Get the oldest request timestamp in the window
                oldest = await redis.zrange(key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(oldest[0][1] - window_start) + 1
                    return True, max(1, retry_after)
                return True, window

            # Add current request
            member = f"{now}:{count}"
            await redis.zadd(key, {member: now})
            await redis.expire(key, window * 2)  # TTL = 2x window for safety

            return False, 0

        except Exception as e:
            logger.debug("Rate limit check failed (allowing): %s", e)
            # Fail open — don't block traffic if Redis is down
            return False, 0


async def get_rate_limit_stats() -> dict:
    """Get current rate limit usage for monitoring."""
    try:
        redis = get_redis()
        stats = {}
        for category in DEFAULT_LIMITS:
            pattern = f"{RATE_LIMIT_KEY}:{category}:*"
            keys = []
            cursor = 0
            while True:
                cursor, batch = await redis.scan(cursor, match=pattern, count=50)
                keys.extend(batch)
                if cursor == 0:
                    break
            if keys:
                limit, window = DEFAULT_LIMITS[category]
                counts = {}
                for key in keys:
                    count = await redis.zcard(key)
                    ip = key.split(":")[-1] if ":" in key else key
                    if count > 0:
                        counts[ip] = count
                stats[category] = {
                    "limit": limit,
                    "window_s": window,
                    "active_ips": len(counts),
                    "top_ips": dict(
                        sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
                    ),
                }
        return stats
    except Exception as e:
        return {"error": str(e)}
