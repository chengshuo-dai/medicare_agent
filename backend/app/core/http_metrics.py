"""HTTP request latency tracking middleware.

Tracks P50/P95/P99 latency for all HTTP endpoints using Redis sorted sets.
Lightweight — fire-and-forget metric writes to avoid blocking responses.
"""

from __future__ import annotations

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.db.redis_client import get_redis

logger = logging.getLogger("http_metrics")

HTTP_LATENCY_KEY = "metrics:http:latency"
HTTP_COUNT_KEY = "metrics:http:counts"
HTTP_WINDOW = 3600 * 24  # 24 hours


class HTTPMetricsMiddleware(BaseHTTPMiddleware):
    """Track request latency for all HTTP endpoints.

    Records latency_ms per (method, path_template, status_code) in Redis.
    Paths are normalized to templates: /api/v1/chat/stream → /api/v1/chat/stream
    Dynamic segments (integers, UUIDs) are collapsed: /users/123 → /users/{id}
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        latency_ms = (time.monotonic() - start) * 1000

        # Fire-and-forget: don't block the response
        try:
            await self._record(
                method=request.method,
                path=self._normalize_path(request.url.path),
                status_code=response.status_code,
                latency_ms=latency_ms,
            )
        except Exception:
            pass  # Never fail a request because of metrics

        return response

    @staticmethod
    def _normalize_path(path: str) -> str:
        """Collapse dynamic path segments into placeholders.

        /api/v1/users/123 → /api/v1/users/{id}
        /api/v1/medical-cases/abc-def-ghi → /api/v1/medical-cases/{id}
        """
        import re

        # Collapse UUIDs
        path = re.sub(
            r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            '/{id}', path, flags=re.IGNORECASE,
        )
        # Collapse integer IDs
        path = re.sub(r'/\d{1,10}(?=/|$)', '/{id}', path)
        # Collapse MongoDB-style ObjectIds
        path = re.sub(r'/[0-9a-f]{24}', '/{id}', path)

        return path

    @staticmethod
    async def _record(
        method: str,
        path: str,
        status_code: int,
        latency_ms: float,
    ) -> None:
        """Record HTTP latency to Redis."""
        try:
            redis = get_redis()
            ts = time.time()
            member = f"{ts}|{method}|{path}|{status_code}"
            await redis.zadd(HTTP_LATENCY_KEY, {member: latency_ms})

            # Increment status code counter
            status_group = f"{status_code // 100}xx"
            await redis.hincrby(HTTP_COUNT_KEY, f"{method}:{path}:{status_group}", 1)
            await redis.hincrby(HTTP_COUNT_KEY, f"{method}:{path}:total", 1)

            # TTL
            await redis.expire(HTTP_LATENCY_KEY, HTTP_WINDOW * 2)
            await redis.expire(HTTP_COUNT_KEY, HTTP_WINDOW * 2)
        except Exception as e:
            logger.debug("Failed to record HTTP metric: %s", e)
