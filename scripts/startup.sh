#!/bin/bash
# Railway startup script — runs DB migrations then starts the server.
set -e

echo "=== MediCareAI Backend Startup ==="
echo "Environment: ${ENVIRONMENT:-production}"
echo "Port: ${PORT:-8000}"

# Run database migrations
echo "Running database migrations..."
cd /app
alembic upgrade head || echo "Warning: Migration may have failed (first deploy?)"

# Start uvicorn
echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers \
  --workers 1 \
  --log-level info
