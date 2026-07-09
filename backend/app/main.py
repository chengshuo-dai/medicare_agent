"""FastAPI application entry point.

Bootstrap order:
1. Load settings from environment
2. Configure structured logging
3. Initialize Sentry (production only)
4. Register routers & middleware
"""

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from sqlalchemy import select

from app.api.v1 import router as v1_router
from app.core.config import get_settings
from app.core.cors import WildcardCORSMiddleware
from app.core.http_metrics import HTTPMetricsMiddleware
from app.core.logging import configure_logging
from app.core.rate_limiter import RateLimitMiddleware
from app.core.security import get_password_hash
from app.db.redis_client import get_redis
from app.db.session import AsyncSessionLocal, get_db
from app.models.user import User, UserRole, UserStatus

settings = get_settings()

# Logging first
configure_logging(debug=settings.debug)

# Sentry in production
if settings.is_production and settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.05,
    )


async def _ensure_default_admin() -> None:
    """Create a default admin user if no admin exists."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN).limit(1))
        if result.scalar_one_or_none():
            return  # Admin already exists

        admin_email = settings.default_admin_email
        admin_password = settings.default_admin_password

        if not admin_password:
            return

        admin = User(
            email=admin_email,
            hashed_password=get_password_hash(admin_password.get_secret_value()),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            password_change_required=True,
        )
        db.add(admin)
        await db.commit()


async def _ensure_default_llm_provider() -> None:
    """Seed LLM provider from DEEPSEEK_API_KEY env var on first deploy."""
    import os
    from app.core.encryption import encrypt_value
    from app.models.config import LLMProviderConfig

    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not deepseek_key:
        return

    # Need API_KEY_MASTER_KEY for encryption — skip if not set
    master_key = os.getenv("API_KEY_MASTER_KEY", "").strip()
    if not master_key:
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(LLMProviderConfig).where(LLMProviderConfig.is_active == True).limit(1)
        )
        if result.scalar_one_or_none():
            return

        try:
            config = LLMProviderConfig(
                provider="deepseek",
                name="DeepSeek (auto-configured)",
                base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
                api_key_encrypted=encrypt_value(deepseek_key),
                default_model="deepseek-chat",
                model_type="diagnosis",
                is_active=True,
                is_default=True,
                priority=0,
            )
            db.add(config)
            await db.commit()
        except Exception:
            pass  # Encryption failed — admin can configure via UI later


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await _ensure_default_admin()
    await _ensure_default_llm_provider()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Multi-Agent Autonomous Medical Collaboration System",
    debug=settings.debug,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# CORS with fnmatch wildcard support (e.g. https://*.vercel.app)
app.add_middleware(
    WildcardCORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP request latency tracking
app.add_middleware(HTTPMetricsMiddleware)

# Rate limiting (Redis-backed sliding window)
app.add_middleware(RateLimitMiddleware)

# Trust X-Forwarded-Proto from Nginx so FastAPI generates https:// redirect URLs
app.add_middleware(
    ProxyHeadersMiddleware,
    trusted_hosts=["openmedicareagent.online", "www.openmedicareagent.online", "*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health", tags=["System"])
async def health_check() -> dict:
    """Liveness probe."""
    return {"status": "ok", "version": settings.app_version, "env": settings.environment}


@app.get("/ready", tags=["System"])
async def readiness_check() -> dict:
    """Readiness probe — checks DB & Redis connectivity."""
    checks: dict[str, str] = {}

    # Check DB connectivity
    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import text
            await db.execute(text("SELECT 1"))
            checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"unavailable: {type(e).__name__}"

    # Check Redis connectivity
    try:
        redis_client = get_redis()
        await redis_client.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"unavailable: {type(e).__name__}"

    all_ok = all(v == "ok" for v in checks.values())
    return {
        "status": "ready" if all_ok else "not_ready",
        "checks": checks,
    }
