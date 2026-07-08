# ==========================================
# MediCareAI-Agent Frontend
# Multi-stage build: Vite → Nginx with gzip/cache optimization
# ==========================================
# Build:  docker build -t medicareai-frontend -f frontend/Dockerfile frontend/
# ==========================================

# ── Build stage ──
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (layer caching — only re-runs when package*.json changes)
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# Copy source and build
COPY . .
RUN --mount=type=cache,target=/root/.npm \
    npx vite build --mode production

# ── Production stage ──
FROM nginx:alpine AS production

LABEL org.opencontainers.image.title="MediCareAI Frontend"
LABEL org.opencontainers.image.description="MediCareAI Patient/Doctor/Admin Portal"
LABEL org.opencontainers.image.authors="MediCareAI Team"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config with gzip, caching, SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add version file for health checks
RUN date -u +%Y%m%d-%H%M > /usr/share/nginx/html/version.txt

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/version.txt || exit 1

USER nginx
CMD ["nginx", "-g", "daemon off;"]
