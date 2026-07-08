"""Metrics & observability API endpoints.

Provides:
- GET /api/v1/metrics/llm — LLM latency, token usage, success rate
- GET /api/v1/metrics/llm/latency — Latency percentiles (P50/P95/P99)
- GET /api/v1/metrics/llm/circuit — Circuit breaker status
- GET /api/v1/metrics/http — HTTP request latency stats
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.metrics import (
    get_latency_percentiles,
    get_token_usage,
    get_success_rate,
    get_recent_errors,
    get_metrics_summary,
)
from app.core.rate_limiter import get_rate_limit_stats
from app.services.cache import get_cache_stats, invalidate_cache
from app.services.fallback import get_circuit_status

router = APIRouter()


@router.get("/llm")
async def llm_metrics_summary(
    current_user: CurrentUser,
) -> dict:
    """Get comprehensive LLM metrics summary.

    Returns latency percentiles, token usage, success rate,
    per-provider breakdown, and recent errors.
    """
    return await get_metrics_summary()


@router.get("/llm/latency")
async def llm_latency(
    current_user: CurrentUser,
    provider: str | None = Query(None, description="Filter by provider (e.g. deepseek)"),
    model: str | None = Query(None, description="Filter by model"),
    operation: str | None = Query(None, description="Filter by operation (chat, chat_stream, etc.)"),
    window_minutes: int = Query(60, ge=1, le=1440, description="Time window in minutes"),
) -> dict:
    """Get LLM latency percentiles (P50, P95, P99)."""
    return await get_latency_percentiles(
        provider=provider,
        model=model,
        operation=operation,
        window_seconds=window_minutes * 60,
    )


@router.get("/llm/tokens")
async def llm_token_usage(
    current_user: CurrentUser,
    provider: str | None = Query(None),
    model: str | None = Query(None),
) -> dict:
    """Get aggregate token usage statistics."""
    return await get_token_usage(provider=provider, model=model)


@router.get("/llm/success-rate")
async def llm_success_rate(
    current_user: CurrentUser,
    provider: str | None = Query(None),
    model: str | None = Query(None),
) -> dict:
    """Get LLM call success rate."""
    return await get_success_rate(provider=provider, model=model)


@router.get("/llm/errors")
async def llm_recent_errors(
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
) -> list[dict]:
    """Get recent LLM call errors."""
    return await get_recent_errors(limit=limit)


@router.get("/llm/circuit")
async def circuit_breaker_status(
    current_user: CurrentUser,
) -> dict:
    """Get current circuit breaker status for all providers."""
    return await get_circuit_status()


@router.get("/cache")
async def cache_statistics(
    current_user: CurrentUser,
) -> dict:
    """Get LLM response cache statistics."""
    return await get_cache_stats()


@router.delete("/cache")
async def clear_cache(
    current_user: CurrentUser,
    operation: str | None = Query(None, description="Clear specific operation cache"),
    model: str | None = Query(None, description="Clear specific model cache"),
) -> dict:
    """Invalidate LLM response cache entries."""
    count = await invalidate_cache(operation=operation, model=model)
    return {"invalidated": count, "operation": operation, "model": model}


@router.get("/rate-limit")
async def rate_limit_stats(
    current_user: CurrentUser,
) -> dict:
    """Get current rate limit usage statistics."""
    return await get_rate_limit_stats()
