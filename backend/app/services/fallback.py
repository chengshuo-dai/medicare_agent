"""Multi-model fallback with circuit breaker pattern.

Provides:
- Circuit breaker: stops calling a failing provider after threshold errors
- Fallback chain: automatically tries backup providers when primary fails
- Retry with exponential backoff + jitter
- Health tracking per provider

Architecture:
    Primary (DeepSeek) → Fallback 1 (OpenAI) → Fallback 2 (Moonshot) → Error

Each provider has an independent circuit breaker. After `failure_threshold`
consecutive failures, the circuit opens and skips that provider for
`recovery_timeout` seconds before trying again (half-open state).
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from app.db.redis_client import get_redis

logger = logging.getLogger("fallback")

# Redis key for circuit breaker state
CIRCUIT_KEY = "circuit_breaker:state"


class CircuitState(str, Enum):
    CLOSED = "closed"        # Normal operation, calls pass through
    OPEN = "open"            # Failing, calls are rejected immediately
    HALF_OPEN = "half_open"  # Testing if provider has recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker behavior."""
    failure_threshold: int = 5         # Consecutive failures to open circuit
    recovery_timeout: float = 30.0     # Seconds to wait before trying half-open
    half_open_max_requests: int = 1    # Max requests in half-open state
    success_threshold: int = 2         # Consecutive successes to close circuit


@dataclass
class FallbackConfig:
    """Configuration for the fallback chain."""
    providers: list[str] = field(default_factory=lambda: ["deepseek", "openai", "moonshot"])
    base_delay: float = 1.0       # Base retry delay in seconds
    max_delay: float = 30.0       # Max retry delay
    max_retries_per_provider: int = 2  # Retries per provider before moving to next
    total_timeout: float = 60.0   # Total timeout for entire fallback chain


class CircuitBreaker:
    """Per-provider circuit breaker backed by Redis."""

    def __init__(
        self,
        provider: str,
        config: CircuitBreakerConfig | None = None,
    ) -> None:
        self.provider = provider
        self.config = config or CircuitBreakerConfig()
        self._local_failures: int = 0
        self._local_successes: int = 0
        self._state: CircuitState = CircuitState.CLOSED
        self._opened_at: float = 0.0

    @property
    def state(self) -> CircuitState:
        return self._state

    async def _load_state(self) -> None:
        """Load circuit state from Redis (shared across workers)."""
        try:
            redis = get_redis()
            data = await redis.hget(CIRCUIT_KEY, self.provider)
            if data:
                import json
                state_data = json.loads(data)
                self._state = CircuitState(state_data.get("state", "closed"))
                self._local_failures = state_data.get("failures", 0)
                self._opened_at = state_data.get("opened_at", 0)
        except Exception:
            pass  # Use local state if Redis unavailable

    async def _save_state(self) -> None:
        """Persist circuit state to Redis."""
        try:
            redis = get_redis()
            import json
            await redis.hset(CIRCUIT_KEY, self.provider, json.dumps({
                "state": self._state.value,
                "failures": self._local_failures,
                "opened_at": self._opened_at,
                "updated_at": time.time(),
            }))
        except Exception:
            pass

    async def before_call(self) -> bool:
        """Check if call is allowed. Returns True if allowed, False if circuit is open."""
        await self._load_state()

        if self._state == CircuitState.CLOSED:
            return True

        if self._state == CircuitState.OPEN:
            # Check recovery timeout
            if time.time() - self._opened_at >= self.config.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                self._local_successes = 0
                await self._save_state()
                logger.info(
                    "[CIRCUIT] provider=%s transitioned to half_open",
                    self.provider,
                )
                return True
            logger.warning(
                "[CIRCUIT] provider=%s circuit OPEN, rejecting call (opened %.1fs ago)",
                self.provider, time.time() - self._opened_at,
            )
            return False

        # HALF_OPEN: allow limited requests
        return True

    async def on_success(self) -> None:
        """Report a successful call."""
        if self._state == CircuitState.HALF_OPEN:
            self._local_successes += 1
            if self._local_successes >= self.config.success_threshold:
                self._state = CircuitState.CLOSED
                self._local_failures = 0
                logger.info(
                    "[CIRCUIT] provider=%s recovered, circuit CLOSED",
                    self.provider,
                )
        else:
            self._local_failures = 0  # Reset failure count on success
        await self._save_state()

    async def on_failure(self) -> None:
        """Report a failed call."""
        self._local_failures += 1
        logger.warning(
            "[CIRCUIT] provider=%s failure %d/%d",
            self.provider, self._local_failures, self.config.failure_threshold,
        )

        if self._local_failures >= self.config.failure_threshold:
            self._state = CircuitState.OPEN
            self._opened_at = time.time()
            logger.error(
                "[CIRCUIT] provider=%s circuit OPENED after %d failures",
                self.provider, self._local_failures,
            )
        await self._save_state()


class FallbackExecutor:
    """Executes LLM calls with automatic fallback across providers.

    Usage:
        executor = FallbackExecutor(db_session)
        result = await executor.execute(
            primary_provider="deepseek",
            operation=lambda svc: svc.chat(messages=msgs),
        )
    """

    def __init__(
        self,
        db,
        fallback_config: FallbackConfig | None = None,
        circuit_config: CircuitBreakerConfig | None = None,
    ) -> None:
        self.db = db
        self.fallback_config = fallback_config or FallbackConfig()
        self.circuit_config = circuit_config or CircuitBreakerConfig()
        self._breakers: dict[str, CircuitBreaker] = {}

    def _get_breaker(self, provider: str) -> CircuitBreaker:
        if provider not in self._breakers:
            self._breakers[provider] = CircuitBreaker(provider, self.circuit_config)
        return self._breakers[provider]

    async def execute(
        self,
        operation,
        primary_provider: str = "deepseek",
        model_type: str = "diagnosis",
        platform: str | None = None,
        extra_providers: list[str] | None = None,
    ) -> Any:
        """Execute an LLM operation with automatic fallback.

        Args:
            operation: Async callable that takes (LLMService) and returns result.
            primary_provider: Preferred provider to try first.
            model_type: Model type for provider resolution.
            platform: Platform context.
            extra_providers: Additional fallback providers to try.

        Returns:
            The result from the first successful provider.

        Raises:
            FallbackExhaustedError: All providers failed.
        """
        from app.services.llm import LLMService

        # Build fallback chain: primary → config providers → extra
        chain = [primary_provider]
        for p in self.fallback_config.providers:
            if p not in chain:
                chain.append(p)
        if extra_providers:
            for p in extra_providers:
                if p not in chain:
                    chain.append(p)

        errors: list[dict[str, str]] = []
        deadline = time.monotonic() + self.fallback_config.total_timeout

        for provider in chain:
            if time.monotonic() > deadline:
                break

            breaker = self._get_breaker(provider)

            # Check circuit breaker
            if not await breaker.before_call():
                errors.append({
                    "provider": provider,
                    "error": "Circuit breaker open",
                })
                continue

            # Try with retries
            for attempt in range(self.fallback_config.max_retries_per_provider):
                if time.monotonic() > deadline:
                    break

                try:
                    service = LLMService(provider=provider, platform=platform, db=self.db)
                    result = await operation(service)
                    await breaker.on_success()
                    logger.info(
                        "[FALLBACK] provider=%s succeeded (attempt %d/%d)",
                        provider, attempt + 1, self.fallback_config.max_retries_per_provider,
                    )
                    return result

                except Exception as e:
                    error_msg = f"{type(e).__name__}: {str(e)[:200]}"
                    logger.warning(
                        "[FALLBACK] provider=%s attempt=%d/%d failed: %s",
                        provider, attempt + 1, self.fallback_config.max_retries_per_provider, error_msg,
                    )

                    if attempt < self.fallback_config.max_retries_per_provider - 1:
                        # Exponential backoff with jitter
                        delay = min(
                            self.fallback_config.base_delay * (2 ** attempt),
                            self.fallback_config.max_delay,
                        )
                        jitter = random.uniform(0, delay * 0.3)
                        await asyncio.sleep(delay + jitter)

            # All retries exhausted for this provider
            await breaker.on_failure()
            errors.append({
                "provider": provider,
                "error": error_msg if 'error_msg' in dir() else "All retries exhausted",
            })

        raise FallbackExhaustedError(
            f"All {len(chain)} providers failed. Errors: {json.dumps(errors)}",
            errors=errors,
        )


class FallbackExhaustedError(Exception):
    """Raised when all providers in the fallback chain have failed."""

    def __init__(self, message: str, errors: list[dict[str, str]] | None = None) -> None:
        super().__init__(message)
        self.errors = errors or []


# For JSON serialization in the error message
import json


async def get_circuit_status() -> dict[str, dict[str, Any]]:
    """Get current circuit breaker status for all providers."""
    try:
        redis = get_redis()
        data = await redis.hgetall(CIRCUIT_KEY)
        result = {}
        for provider, state_json in data.items():
            result[provider] = json.loads(state_json)
        return result
    except Exception:
        return {}
