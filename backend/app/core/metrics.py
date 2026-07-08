"""LLM call latency & token metrics collection.

Stores time-series metrics in Redis with automatic percentile computation.
Supports:
- Per-provider, per-model, per-operation latency histograms
- Token usage tracking
- Error/success rate counters
- Automatic P50/P95/P99 calculation via sorted sets
"""

from __future__ import annotations

import time
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any

from app.db.redis_client import get_redis

logger = logging.getLogger("metrics")

# Redis key prefixes
METRIC_PREFIX = "metrics:llm"
LATENCY_KEY = f"{METRIC_PREFIX}:latency"  # Sorted set: score=latency_ms, member=timestamp|provider|model|op
TOKEN_KEY = f"{METRIC_PREFIX}:tokens"      # Hash: provider:model:op → total_tokens
COUNT_KEY = f"{METRIC_PREFIX}:counts"      # Hash: provider:model:op:status → count
ERROR_KEY = f"{METRIC_PREFIX}:errors"      # List: recent error details
WINDOW_SECONDS = 3600 * 24  # 24-hour rolling window


@dataclass
class LLMCallMetrics:
    """Metrics for a single LLM call."""
    provider: str
    model: str
    operation: str  # chat, chat_stream, chat_with_tools, generate_structured, chat_vision
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    success: bool
    error_type: str | None = None
    error_message: str | None = None


async def record_llm_call(metrics: LLMCallMetrics) -> None:
    """Record a single LLM call's metrics to Redis."""
    try:
        redis = get_redis()
        ts = time.time()
        # Store timestamp as score (for time-range queries), latency in member
        member = f"{metrics.latency_ms}|{metrics.provider}|{metrics.model}|{metrics.operation}"

        # Store in sorted set with timestamp as score for time-based filtering
        await redis.zadd(LATENCY_KEY, {member: ts})

        # Increment token counters
        token_field = f"{metrics.provider}:{metrics.model}:{metrics.operation}"
        await redis.hincrby(TOKEN_KEY, f"{token_field}:prompt", metrics.prompt_tokens)
        await redis.hincrby(TOKEN_KEY, f"{token_field}:completion", metrics.completion_tokens)

        # Increment count by status
        status = "success" if metrics.success else "error"
        count_field = f"{metrics.provider}:{metrics.model}:{metrics.operation}:{status}"
        await redis.hincrby(COUNT_KEY, count_field, 1)

        # Store recent errors
        if not metrics.success:
            error_entry = json.dumps({
                "ts": ts,
                "provider": metrics.provider,
                "model": metrics.model,
                "operation": metrics.operation,
                "error_type": metrics.error_type,
                "error_message": metrics.error_message[:500] if metrics.error_message else None,
            })
            await redis.lpush(ERROR_KEY, error_entry)
            await redis.ltrim(ERROR_KEY, 0, 99)  # Keep last 100 errors

        # Set TTL on keys to auto-expire old data
        await redis.expire(LATENCY_KEY, WINDOW_SECONDS * 2)
        await redis.expire(TOKEN_KEY, WINDOW_SECONDS * 2)
        await redis.expire(COUNT_KEY, WINDOW_SECONDS * 2)

    except Exception as e:
        logger.warning("Failed to record LLM metrics: %s", e)


async def get_latency_percentiles(
    provider: str | None = None,
    model: str | None = None,
    operation: str | None = None,
    window_seconds: int = WINDOW_SECONDS,
) -> dict[str, float]:
    """Calculate P50, P95, P99 latency from stored data.

    Uses Redis sorted set: score=timestamp, member=latency|provider|model|operation
    """
    try:
        redis = get_redis()
        now = time.time()
        min_ts = now - window_seconds

        # Get all members in time window (sorted by timestamp score)
        all_members = await redis.zrangebyscore(
            LATENCY_KEY, min_ts, now, withscores=False
        )

        # Parse latency values from member strings and filter
        latencies = []
        for member in all_members:
            parts = member.split("|", 3)  # latency|provider|model|operation
            if len(parts) != 4:
                continue
            try:
                latency_ms = float(parts[0])
            except (ValueError, IndexError):
                continue
            mem_provider, mem_model, mem_op = parts[1], parts[2], parts[3]
            if provider and mem_provider != provider:
                continue
            if model and mem_model != model:
                continue
            if operation and mem_op != operation:
                continue
            latencies.append(latency_ms)

        if not latencies:
            return {"p50": 0, "p95": 0, "p99": 0, "count": 0, "avg": 0}

        latencies.sort()
        n = len(latencies)

        def percentile(p: float) -> float:
            k = (p / 100) * (n - 1)
            f = int(k)
            c = k - f
            if f + 1 < n:
                return latencies[f] + c * (latencies[f + 1] - latencies[f])
            return latencies[f]

        return {
            "p50": round(percentile(50), 1),
            "p95": round(percentile(95), 1),
            "p99": round(percentile(99), 1),
            "count": n,
            "avg": round(sum(latencies) / n, 1),
            "min": round(latencies[0], 1),
            "max": round(latencies[-1], 1),
        }
    except Exception as e:
        logger.warning("Failed to compute latency percentiles: %s", e)
        return {"p50": 0, "p95": 0, "p99": 0, "count": 0, "avg": 0, "error": str(e)}


async def get_token_usage(
    provider: str | None = None,
    model: str | None = None,
) -> dict[str, int]:
    """Get aggregate token usage."""
    try:
        redis = get_redis()
        all_tokens = await redis.hgetall(TOKEN_KEY)
        prompt_total = 0
        completion_total = 0

        for field, value in all_tokens.items():
            parts = field.split(":")
            if len(parts) < 4:
                continue
            f_provider, f_model, f_op, tok_type = parts[0], parts[1], parts[2], parts[3]
            if provider and f_provider != provider:
                continue
            if model and f_model != model:
                continue
            if tok_type == "prompt":
                prompt_total += int(value)
            elif tok_type == "completion":
                completion_total += int(value)

        return {
            "prompt_tokens": prompt_total,
            "completion_tokens": completion_total,
            "total_tokens": prompt_total + completion_total,
        }
    except Exception as e:
        logger.warning("Failed to get token usage: %s", e)
        return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}


async def get_success_rate(
    provider: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """Calculate success rate from counters."""
    try:
        redis = get_redis()
        all_counts = await redis.hgetall(COUNT_KEY)
        success = 0
        error = 0

        for field, value in all_counts.items():
            parts = field.split(":")
            if len(parts) < 4:
                continue
            f_provider, f_model, f_op, status = parts[0], parts[1], parts[2], parts[3]
            if provider and f_provider != provider:
                continue
            if model and f_model != model:
                continue
            if status == "success":
                success += int(value)
            elif status == "error":
                error += int(value)

        total = success + error
        return {
            "total_calls": total,
            "success": success,
            "error": error,
            "success_rate": round(success / total * 100, 2) if total > 0 else 100.0,
        }
    except Exception as e:
        logger.warning("Failed to get success rate: %s", e)
        return {"total_calls": 0, "success": 0, "error": 0, "success_rate": 100.0}


async def get_recent_errors(limit: int = 20) -> list[dict]:
    """Get recent LLM call errors."""
    try:
        redis = get_redis()
        errors = await redis.lrange(ERROR_KEY, 0, limit - 1)
        return [json.loads(e) for e in errors]
    except Exception as e:
        logger.warning("Failed to get recent errors: %s", e)
        return []


async def get_metrics_summary() -> dict[str, Any]:
    """Get a comprehensive metrics summary for the dashboard."""
    latency = await get_latency_percentiles()
    tokens = await get_token_usage()
    success = await get_success_rate()
    recent_errors = await get_recent_errors(limit=5)

    # Per-provider breakdown
    providers = ["deepseek", "openai", "moonshot"]
    provider_stats = {}
    for p in providers:
        p_latency = await get_latency_percentiles(provider=p)
        p_success = await get_success_rate(provider=p)
        if p_latency["count"] > 0:
            provider_stats[p] = {
                "latency": p_latency,
                "success_rate": p_success["success_rate"],
                "total_calls": p_success["total_calls"],
            }

    # Cache stats
    cache_info = {}
    try:
        from app.services.cache import get_cache_stats
        cache_info = await get_cache_stats()
    except Exception:
        pass

    return {
        "latency": latency,
        "tokens": tokens,
        "success_rate": success,
        "provider_breakdown": provider_stats,
        "recent_errors": recent_errors,
        "cache": cache_info,
    }


@asynccontextmanager
async def track_llm_call(
    provider: str,
    model: str,
    operation: str = "chat",
):
    """Context manager to automatically track LLM call metrics.

    Usage:
        async with track_llm_call("deepseek", "deepseek-chat", "chat") as tracker:
            response = await client.chat.completions.create(...)
            tracker.set_usage(response.usage)
    """
    start = time.monotonic()
    tracker = _CallTracker()

    try:
        yield tracker
        # Success path
        latency_ms = (time.monotonic() - start) * 1000
        await record_llm_call(LLMCallMetrics(
            provider=provider,
            model=model,
            operation=operation,
            latency_ms=latency_ms,
            prompt_tokens=tracker.prompt_tokens,
            completion_tokens=tracker.completion_tokens,
            success=True,
        ))
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        await record_llm_call(LLMCallMetrics(
            provider=provider,
            model=model,
            operation=operation,
            latency_ms=latency_ms,
            prompt_tokens=tracker.prompt_tokens,
            completion_tokens=tracker.completion_tokens,
            success=False,
            error_type=type(e).__name__,
            error_message=str(e),
        ))
        raise


class _CallTracker:
    """Mutable tracker for token counts during a call."""
    prompt_tokens: int = 0
    completion_tokens: int = 0

    def set_usage(self, usage: Any) -> None:
        """Extract token counts from OpenAI usage object."""
        if usage is None:
            return
        self.prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
        self.completion_tokens = getattr(usage, "completion_tokens", 0) or 0
