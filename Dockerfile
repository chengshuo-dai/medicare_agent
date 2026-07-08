# ==========================================
# MediCareAI-Agent Backend
# Multi-stage production build for Railway / Docker Compose
# ==========================================

FROM python:3.12-slim AS builder

WORKDIR /app

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Dependencies layer (cached unless pyproject.toml changes)
COPY backend/pyproject.toml ./pyproject.toml
COPY README.md /README.md

RUN mkdir -p /app/app && touch /app/app/__init__.py

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ".[dev]" \
    || pip install --no-cache-dir -e "."

RUN rm -rf /app/app

# ── Production stage ──
FROM python:3.12-slim AS production

LABEL org.opencontainers.image.title="MediCareAI Backend"
LABEL org.opencontainers.image.description="Multi-Agent Medical AI System"

WORKDIR /app

# Runtime deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code and config
COPY backend/app ./app
COPY backend/pyproject.toml .
COPY backend/alembic.ini ./alembic.ini

# Copy startup script
COPY scripts/startup.sh ./scripts/startup.sh
RUN chmod +x ./scripts/startup.sh

# Non-root user (but allow binding to $PORT)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:${PORT:-8000}/health || exit 1

# Startup script handles migrations + uvicorn
CMD ["bash", "scripts/startup.sh"]
