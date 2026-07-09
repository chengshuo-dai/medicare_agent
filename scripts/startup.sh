#!/bin/bash
# Railway startup script
echo "=== MediCareAI Backend Startup ==="
echo "Environment: ${ENVIRONMENT:-production}"
echo "Port: ${PORT:-8000}"

# Wait for PostgreSQL (Railway starts services in parallel)
echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  python -c "
import os, asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
async def check():
    url = os.getenv('DATABASE_URL','')
    if not url: return
    try:
        engine = create_async_engine(url, echo=False)
        async with engine.begin() as conn:
            await conn.execute(text('SELECT 1'))
        await engine.dispose()
    except Exception:
        pass
asyncio.run(check())
" 2>/dev/null && echo "  DB ready (attempt $i)" && break
  echo "  DB wait $i/30..."
  sleep 2
done

# Run migrations (non-fatal — first deploy may have empty DB)
echo "Running migrations..."
cd /app
python -m alembic upgrade head 2>&1 || echo "  Migration skipped (OK on first deploy)"

# Start
echo "Starting on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --workers 1 --log-level info
