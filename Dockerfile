# ==========================================
# MediCareAI-Agent Backend
# Multi-stage production build with BuildKit cache optimization
# ==========================================
# Build:  docker build -t medicareai-backend .
# Cache:  DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t medicareai-backend .
# ==========================================

FROM python:3.12-slim AS builder

WORKDIR /app

# Build-time args for version pinning
ARG PYTHON_VERSION=3.12
ARG POETRY_VERSION=1.8.0

# Install build deps in a single layer (cleaned up)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Dependencies layer (cached unless pyproject.toml changes) ──
COPY backend/pyproject.toml ./pyproject.toml
COPY README.md /README.md

# Create placeholder app package for editable install
RUN mkdir -p /app/app && touch /app/app/__init__.py

# Install Python deps with BuildKit cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ".[dev]" \
    || pip install --no-cache-dir -e "."

# Remove placeholder — real code copied in production stage
RUN rm -rf /app/app

# ── Production stage ──
FROM python:3.12-slim AS production

LABEL org.opencontainers.image.title="MediCareAI Backend"
LABEL org.opencontainers.image.description="Multi-Agent Medical AI System"
LABEL org.opencontainers.image.authors="MediCareAI Team"

WORKDIR /app

# Runtime deps only (minimal)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY backend/app ./app
COPY backend/pyproject.toml .
COPY backend/alembic.ini ./alembic.ini

# Collect static copyright info
RUN python -c "import sys; print(f'Python {sys.version}')" > /app/python-version.txt

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# Healthcheck using internal endpoint (no auth required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8000/health || exit 1

# Use exec form for proper signal handling
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--workers", "4"]
