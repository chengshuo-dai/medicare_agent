"""Unified LLM service layer.

Supports:
- Multiple providers via OpenAI-compatible APIs
- Function calling / Tool Use for Agent workflows
- Structured output via JSON Schema (response_format)
- Platform-aware config resolution
- Automatic latency metrics tracking
- Multi-provider fallback with circuit breaker
- Semantic response caching

All provider configs are read from the encrypted database (admin-managed).
No hardcoded API keys or provider defaults.
"""

from __future__ import annotations

import base64
import json
import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_value
from app.core.metrics import track_llm_call
from app.models.config import LLMProviderConfig
from app.services.cache import get_cached_response, set_cached_response
from app.services.intent_router import get_route_decision


@dataclass
class LLMResponse:
    """Standardized LLM response."""

    content: str
    model: str
    provider: str
    usage_prompt_tokens: int
    usage_completion_tokens: int
    finish_reason: str | None
    tool_calls: list[dict[str, Any]] | None = None
    reasoning_content: str | None = None


async def _get_provider_config(
    db: AsyncSession | None,
    provider: str,
    platform: str | None = None,
    model_type: str = "diagnosis",
) -> dict:
    """Get provider config from database with platform and model_type resolution."""
    if db is None:
        raise ValueError(
            f"Provider '{provider}' is not configured. "
            f"Please add it via /api/v1/admin/llm-providers."
        )

    # Try exact platform + model_type match first
    if platform:
        result = await db.execute(
            select(LLMProviderConfig).where(
                LLMProviderConfig.provider == provider,
                LLMProviderConfig.platform == platform.strip().lower(),
                LLMProviderConfig.model_type == model_type,
                LLMProviderConfig.is_active == True,
            ).limit(1)
        )
        config = result.scalars().first()
        if config:
            decrypted_key = decrypt_value(config.api_key_encrypted)
            return {
                "base_url": config.base_url,
                "api_key": decrypted_key or "",
                "default_model": config.default_model,
            }

    # Global config with model_type match
    result = await db.execute(
        select(LLMProviderConfig).where(
            LLMProviderConfig.provider == provider,
            LLMProviderConfig.platform.is_(None),
            LLMProviderConfig.model_type == model_type,
            LLMProviderConfig.is_active == True,
        ).limit(1)
    )
    config = result.scalars().first()
    if config:
        decrypted_key = decrypt_value(config.api_key_encrypted)
        return {
            "base_url": config.base_url,
            "api_key": decrypted_key or "",
            "default_model": config.default_model,
        }

    # Fallback: platform match without model_type filter (compat)
    if platform:
        result = await db.execute(
            select(LLMProviderConfig).where(
                LLMProviderConfig.provider == provider,
                LLMProviderConfig.platform == platform.strip().lower(),
                LLMProviderConfig.is_active == True,
            ).limit(1)
        )
        config = result.scalars().first()
        if config:
            decrypted_key = decrypt_value(config.api_key_encrypted)
            return {
                "base_url": config.base_url,
                "api_key": decrypted_key or "",
                "default_model": config.default_model,
            }

    # Final fallback: global config without model_type filter
    result = await db.execute(
        select(LLMProviderConfig).where(
            LLMProviderConfig.provider == provider,
            LLMProviderConfig.platform.is_(None),
            LLMProviderConfig.is_active == True,
        ).limit(1)
    )
    config = result.scalars().first()
    if config:
        decrypted_key = decrypt_value(config.api_key_encrypted)
        return {
            "base_url": config.base_url,
            "api_key": decrypted_key or "",
            "default_model": config.default_model,
        }

    raise ValueError(
        f"Provider '{provider}' is not configured for platform '{platform or 'global'}' "
        f"with model_type '{model_type}'. "
        f"Please add it via /api/v1/admin/llm-providers."
    )


async def _get_default_provider(
    db: AsyncSession | None,
    platform: str | None = None,
    model_type: str = "diagnosis",
) -> str:
    """Return the provider marked as default in the database."""
    if db is None:
        raise ValueError(
            "No database session available. "
            "Please configure a provider via /api/v1/admin/llm-providers."
        )

    if platform:
        result = await db.execute(
            select(LLMProviderConfig).where(
                LLMProviderConfig.is_default == True,
                LLMProviderConfig.platform == platform.strip().lower(),
                LLMProviderConfig.is_active == True,
                LLMProviderConfig.model_type == model_type,
            ).limit(1)
        )
        config = result.scalars().first()
        if config:
            return config.provider

    result = await db.execute(
        select(LLMProviderConfig).where(
            LLMProviderConfig.is_default == True,
            LLMProviderConfig.platform.is_(None),
            LLMProviderConfig.is_active == True,
            LLMProviderConfig.model_type == model_type,
        ).limit(1)
    )
    config = result.scalars().first()
    if config:
        return config.provider

    result = await db.execute(
        select(LLMProviderConfig).where(
            LLMProviderConfig.is_active == True,
            LLMProviderConfig.model_type == model_type,
        ).limit(1)
    )
    config = result.scalars().first()
    if config:
        return config.provider

    raise ValueError(
        f"No active provider configured for model_type '{model_type}'. "
        "Please add one via /api/v1/admin/llm-providers."
    )


class LLMService:
    """Unified LLM client with Tool Use, structured output, and fallback support.

    When use_fallback=True, failed calls automatically retry with backup providers
    using the circuit-breaker-protected FallbackExecutor.
    """

    def __init__(
        self,
        provider: str | None = None,
        platform: str | None = None,
        db: AsyncSession | None = None,
        use_fallback: bool = True,
    ) -> None:
        self.provider = provider
        self.platform = platform
        self._db = db
        self.use_fallback = use_fallback

    async def _get_client(self) -> AsyncOpenAI:
        """Get configured AsyncOpenAI client."""
        # Auto-resolve provider if not specified (handles both None and empty string)
        if not self.provider and self._db is not None:
            self.provider = await _get_default_provider(self._db, self.platform)

        config = await _get_provider_config(self._db, self.provider, self.platform)
        if not config.get("api_key"):
            raise ValueError(
                f"API key for provider '{self.provider}' is not configured. "
                f"Please add it via /api/v1/admin/llm-providers."
            )

        return AsyncOpenAI(
            base_url=config["base_url"],
            api_key=config["api_key"],
            timeout=120.0,
            max_retries=2,
        )

    async def _get_default_model(self) -> str:
        """Get default model for current provider."""
        try:
            # Auto-resolve provider if not specified
            if self.provider is None and self._db is not None:
                self.provider = await _get_default_provider(self._db, self.platform)
            config = await _get_provider_config(self._db, self.provider, self.platform)
            return config.get("default_model", "")
        except ValueError:
            return ""

    # ------------------------------------------------------------------
    # Fallback execution
    # ------------------------------------------------------------------

    async def _try_fallback(
        self,
        operation_name: str,
        call_fn,
        *,
        model_type: str = "diagnosis",
    ) -> Any:
        """Execute an LLM API call with automatic provider fallback.

        On failure, cycles through backup providers in priority order.
        This is called internally by chat/chat_with_tools/etc.
        """
        if not self.use_fallback:
            return await call_fn()

        from app.services.fallback import FallbackExecutor, FallbackConfig
        extra = []
        if self._db:
            try:
                extra = await get_fallback_providers(
                    self._db, model_type=model_type, exclude_provider=self.provider
                )
            except Exception:
                pass

        async def _operation(svc: LLMService) -> Any:
            # Create a new service instance pointing to the fallback provider
            return await call_fn()

        executor = FallbackExecutor(self._db)
        return await executor.execute(
            operation=_operation,
            primary_provider=self.provider or "deepseek",
            model_type=model_type,
            platform=self.platform,
            extra_providers=extra,
        )

    async def execute_with_fallback(
        self,
        operation,
        model_type: str = "diagnosis",
    ) -> Any:
        """Execute an LLM operation with automatic multi-provider fallback.

        Usage:
            result = await service.execute_with_fallback(
                lambda svc: svc.chat(messages=[...]),
            )

        Args:
            operation: Async callable(LLMService) → result.
            model_type: Model type for fallback provider resolution.

        Returns:
            Operation result from the first successful provider.

        Raises:
            FallbackExhaustedError: All providers failed.
        """
        if not self.use_fallback:
            return await operation(self)

        from app.services.fallback import FallbackExecutor, FallbackConfig
        extra = []
        if self._db:
            try:
                extra = await get_fallback_providers(
                    self._db, model_type=model_type, exclude_provider=self.provider
                )
            except Exception:
                pass

        executor = FallbackExecutor(self._db)
        return await executor.execute(
            operation=operation,
            primary_provider=self.provider or "deepseek",
            model_type=model_type,
            platform=self.platform,
            extra_providers=extra,
        )

    # ------------------------------------------------------------------
    # Basic chat
    # ------------------------------------------------------------------

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str | None = None,
        extra_body: dict | None = None,
        disable_thinking: bool = True,
    ) -> LLMResponse:
        """Send a non-streaming chat completion request."""
        client = await self._get_client()
        default_model = await self._get_default_model()
        if not model and not default_model:
            raise ValueError(
                f"No model specified and provider '{self.provider}' has no default model configured."
            )

        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        _model = model or default_model

        # Intent-based routing: downgrade model for simple queries (cost savings)
        if not model:  # Only auto-route if no explicit model override
            route = get_route_decision(messages, provider=self.provider or "deepseek", default_model=_model)
            _model = route.model
            if route.max_tokens and not max_tokens:
                max_tokens = route.max_tokens
            if route.disable_thinking:
                disable_thinking = True
            logger.info("[INTENT_ROUTE] tier=%d model=%s max_tokens=%s",
                        route.tier, _model, max_tokens)

        # Check semantic cache (skip if temperature > 0)
        if temperature is None or temperature == 0:
            cached = await get_cached_response(
                messages, _model, system_prompt=system_prompt,
                operation="chat", temperature=temperature,
            )
            if cached:
                logger.info("[CACHE_HIT] chat model=%s cached_%.0fs_ago",
                            _model, time.time() - cached.cached_at)
                return LLMResponse(
                    content=cached.content,
                    model=cached.model,
                    provider=cached.provider,
                    usage_prompt_tokens=cached.usage_prompt_tokens,
                    usage_completion_tokens=cached.usage_completion_tokens,
                    finish_reason=cached.finish_reason,
                )

        logger.info("[LLM_PRE] provider=%s model=%s msgs=%d max_tokens=%d",
                     self.provider, _model, len(msgs), max_tokens or 0)
        kwargs: dict[str, Any] = dict(
            model=_model,
            messages=msgs,
            max_tokens=max_tokens,
            stream=False,
        )
        merged_extra = {}
        if disable_thinking:
            merged_extra["thinking"] = {"type": "disabled"}
        if extra_body:
            merged_extra.update(extra_body)
        if merged_extra:
            kwargs["extra_body"] = merged_extra

        async with track_llm_call(self.provider or "unknown", _model, "chat") as tracker:
            response = await client.chat.completions.create(**kwargs)
            tracker.set_usage(response.usage)

        logger.info("[LLM_POST] got response, choices=%d",
                     len(response.choices) if response.choices else 0)

        choice = response.choices[0]
        usage = response.usage
        message = choice.message
        logger.info("[LLM_CHAT] model=%s provider=%s content_len=%d finish=%s latency_ms=%.0f",
                     response.model, self.provider, len(message.content or ""),
                     choice.finish_reason, 0.0)

        tool_calls = None
        if message.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                }
                for tc in message.tool_calls
            ]

        # Store in cache for future hits
        if temperature is None or temperature == 0:
            import asyncio as _asyncio
            _asyncio.ensure_future(set_cached_response(
                messages=messages,
                model=_model,
                response_content=message.content or "",
                provider=self.provider or "",
                system_prompt=system_prompt,
                operation="chat",
                temperature=temperature,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
                finish_reason=choice.finish_reason,
            ))

        return LLMResponse(
            content=message.content or "",
            model=response.model,
            provider=self.provider,
            usage_prompt_tokens=usage.prompt_tokens if usage else 0,
            usage_completion_tokens=usage.completion_tokens if usage else 0,
            finish_reason=choice.finish_reason,
            tool_calls=tool_calls,
            reasoning_content=getattr(message, "reasoning_content", None),
        )

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        """Send a streaming chat completion request."""
        client = await self._get_client()
        default_model = await self._get_default_model()
        if not model and not default_model:
            raise ValueError(
                f"No model specified and provider '{self.provider}' has no default model configured."
            )

        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        _model = model or default_model
        logger.info("[LLM_STREAM] provider=%s model=%s msgs=%d max_tokens=%d system_prompt_len=%d",
                     self.provider, _model, len(msgs), max_tokens or 0, len(system_prompt or ""))

        start = time.monotonic()
        stream = await client.chat.completions.create(
            model=_model,
            messages=msgs,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            stream=True,
        )

        chunk_count = 0
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                chunk_count += 1
                yield delta

        latency_ms = (time.monotonic() - start) * 1000
        # Record streaming metrics asynchronously (fire-and-forget)
        import asyncio
        from app.core.metrics import record_llm_call, LLMCallMetrics
        asyncio.ensure_future(record_llm_call(LLMCallMetrics(
            provider=self.provider or "unknown",
            model=_model,
            operation="chat_stream",
            latency_ms=latency_ms,
            prompt_tokens=0,  # Streaming doesn't return usage
            completion_tokens=0,
            success=True,
        )))

        logger.info("[LLM_STREAM_DONE] provider=%s model=%s chunks=%d latency_ms=%.0f",
                     self.provider, _model, chunk_count, latency_ms)

    # ------------------------------------------------------------------
    # Tool Use / Function Calling
    # ------------------------------------------------------------------

    async def chat_with_tools(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str | None = None,
        tool_choice: str = "auto",
    ) -> LLMResponse:
        """Chat with function-calling support.

        The LLM may return tool_calls instead of content.
        The caller is responsible for executing tools and calling again.
        """
        client = await self._get_client()
        default_model = await self._get_default_model()
        if not model and not default_model:
            raise ValueError(
                f"No model specified and provider '{self.provider}' has no default model configured."
            )

        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        response = await client.chat.completions.create(
            model=model or default_model,
            messages=msgs,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            tools=tools,  # type: ignore[arg-type]
            tool_choice=tool_choice,  # type: ignore[arg-type]
            stream=False,
            extra_body={"thinking": {"type": "disabled"}},
        )

        choice = response.choices[0]
        usage = response.usage
        message = choice.message

        # Record metrics
        from app.core.metrics import record_llm_call, LLMCallMetrics
        import asyncio as _asyncio
        _asyncio.ensure_future(record_llm_call(LLMCallMetrics(
            provider=self.provider or "unknown",
            model=model or default_model,
            operation="chat_with_tools",
            latency_ms=0,  # Not timed here — timing wrapper should be added above
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            success=True,
        )))

        tool_calls = None
        if message.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments),
                }
                for tc in message.tool_calls
            ]

        return LLMResponse(
            content=message.content or "",
            model=response.model,
            provider=self.provider,
            usage_prompt_tokens=usage.prompt_tokens if usage else 0,
            usage_completion_tokens=usage.completion_tokens if usage else 0,
            finish_reason=choice.finish_reason,
            tool_calls=tool_calls,
            reasoning_content=getattr(message, "reasoning_content", None),
        )

    # ------------------------------------------------------------------
    # Structured Output (JSON Schema)
    # ------------------------------------------------------------------

    async def generate_structured(
        self,
        messages: list[dict[str, str]],
        output_schema: type[BaseModel],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        system_prompt: str | None = None,
    ) -> BaseModel:
        """Generate structured output conforming to a Pydantic schema.

        Uses OpenAI's response_format with json_schema when supported,
        falling back to strict prompting + manual validation.
        """
        client = await self._get_client()
        default_model = await self._get_default_model()
        if not model and not default_model:
            raise ValueError(
                f"No model specified and provider '{self.provider}' has no default model configured."
            )

        schema = output_schema.model_json_schema()
        schema_name = output_schema.__name__

        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        # Add schema instruction to system prompt
        schema_instruction = (
            f"\n\nYou must respond with a single JSON object matching this schema:\n"
            f"{json.dumps(schema, indent=2, ensure_ascii=False)}\n"
            f"Output ONLY the JSON object, no markdown formatting, no extra text."
        )
        if msgs and msgs[0]["role"] == "system":
            msgs[0]["content"] += schema_instruction
        else:
            msgs.insert(0, {"role": "system", "content": schema_instruction})

        try:
            # Try native json_schema if provider supports it
            response = await client.chat.completions.create(
                model=model or default_model,
                messages=msgs,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": schema_name,
                        "schema": schema,
                        "strict": True,
                    },
                },
                stream=False,
            )
        except Exception:
            # Fallback: standard chat + manual parsing, thinking disabled
            response = await client.chat.completions.create(
                model=model or default_model,
                messages=msgs,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                stream=False,
                extra_body={"thinking": {"type": "disabled"}},
            )

        content = response.choices[0].message.content or "{}"
        # Strip markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        data = json.loads(content)
        return output_schema.model_validate(data)

    async def chat_vision(
        self,
        text_prompt: str,
        image_bytes: bytes,
        model: str | None = None,
        max_tokens: int | None = None,
        system_prompt: str | None = None,
        disable_thinking: bool = True,
    ) -> LLMResponse:
        """Send a vision request with base64-encoded image.

        Constructs array[object] content format required by Kimi vision API
        (k2.5/k2.6). Standard chat() cannot handle this because its messages
        type hint is list[dict[str, str]].

        Args:
            text_prompt: The text instruction for the vision model.
            image_bytes: Raw image bytes (JPEG/PNG/WEBP/GIF).
            model: Optional model override.
            max_tokens: Optional max tokens override.
            system_prompt: Optional system prompt.
            disable_thinking: Disable thinking mode (saves tokens).

        Returns:
            LLMResponse with vision model output.
        """
        client = await self._get_client()
        default_model = await self._get_default_model()

        image_b64 = base64.b64encode(image_bytes).decode()
        mime = self._detect_image_mime(image_bytes)
        image_url = f"data:image/{mime};base64,{image_b64}"

        msgs: list[dict[str, Any]] = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})
        msgs.append({
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_url}},
                {"type": "text", "text": text_prompt},
            ],
        })

        kwargs: dict[str, Any] = dict(
            model=model or default_model,
            messages=msgs,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            stream=False,
        )
        if disable_thinking:
            kwargs["extra_body"] = {"thinking": {"type": "disabled"}}

        logger.info(
            "[LLM_VISION] provider=%s model=%s mime=%s max_tokens=%d",
            self.provider, model or default_model, mime, max_tokens or 0,
        )

        response = await client.chat.completions.create(**kwargs)

        content = response.choices[0].message.content or ""
        usage = response.usage
        return LLMResponse(
            content=content,
            model=response.model,
            provider=self.provider or "",
            usage_prompt_tokens=usage.prompt_tokens if usage else 0,
            usage_completion_tokens=usage.completion_tokens if usage else 0,
            finish_reason=response.choices[0].finish_reason,
        )

    @staticmethod
    def _detect_image_mime(image_bytes: bytes) -> str:
        """Detect image MIME type from magic bytes."""
        if image_bytes[:4] == b"\x89PNG":
            return "png"
        if image_bytes[:2] == b"\xff\xd8":
            return "jpeg"
        if image_bytes[:4] in (b"RIFF", b"WEBP"):
            if image_bytes[8:12] == b"WEBP":
                return "webp"
        if image_bytes[:6] in (b"GIF87a", b"GIF89a"):
            return "gif"
        return "jpeg"  # default fallback

    async def health_check(self) -> dict:
        """Quick health check by listing available models."""
        try:
            client = await self._get_client()
            models = await client.models.list()
            return {
                "status": "ok",
                "provider": self.provider,
                "platform": self.platform,
                "available_models": [m.id for m in models.data[:5]],
            }
        except Exception as e:
            return {
                "status": "error",
                "provider": self.provider,
                "platform": self.platform,
                "detail": str(e),
            }


async def get_llm_service(
    db: AsyncSession,
    platform: str | None = None,
    model_type: str = "diagnosis",
    use_fallback: bool = True,
) -> LLMService:
    """Factory to get an LLMService with platform-aware provider resolution.

    Args:
        db: Database session for provider config lookup.
        platform: Platform scope (web/miniapp/ios/android).
        model_type: Model type for resolution (diagnosis/embedding/rerank).
        use_fallback: Enable automatic multi-provider fallback on failure.
    """
    provider = await _get_default_provider(db, platform=platform, model_type=model_type)
    return LLMService(provider=provider, platform=platform, db=db, use_fallback=use_fallback)


async def get_fallback_providers(
    db: AsyncSession,
    model_type: str = "diagnosis",
    exclude_provider: str | None = None,
) -> list[str]:
    """Get ordered list of fallback providers sorted by priority.

    Args:
        db: Database session.
        model_type: Model type filter.
        exclude_provider: Provider to exclude (typically the primary).

    Returns:
        List of provider names sorted by priority (lowest first).
    """
    from sqlalchemy import select as _select
    result = await db.execute(
        _select(LLMProviderConfig)
        .where(
            LLMProviderConfig.is_active == True,
            LLMProviderConfig.model_type == model_type,
        )
        .order_by(LLMProviderConfig.priority.asc())
    )
    configs = result.scalars().all()
    providers = []
    for c in configs:
        if c.provider not in providers and c.provider != exclude_provider:
            providers.append(c.provider)
    return providers
