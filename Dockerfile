# syntax=docker/dockerfile:1.6

# ---------- Stage 1: frontend build ----------
FROM node:22-alpine AS frontend
WORKDIR /build/web

# Copy manifests first for layer caching
COPY web/package.json web/package-lock.json* ./

# Use `npm ci` when lockfile is present (deterministic install); fall back to
# `npm install` otherwise. This keeps a fresh checkout building before the
# lockfile is committed.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the frontend source
COPY web/ ./

# Vite build emits into ../ministack/static/console per vite.config.ts `build.outDir`.
# We need the parent dir to exist so Vite can write into it.
RUN mkdir -p /build/ministack/static/console && npm run build

# ---------- Stage 2: Python runtime ----------
FROM python:3.12-alpine

LABEL maintainer="MiniStack" \
      description="Local AWS Service Emulator — drop-in LocalStack replacement"

# Upgrade base packages + install nodejs for Lambda runtime emulation.
# (nodejs here is for LAMBDA execution, NOT for building the UI — that happened in Stage 1.)
RUN apk upgrade --no-cache && apk add --no-cache nodejs && rm -f /usr/bin/wget /bin/wget

WORKDIR /opt/ministack

# Install all Python dependencies.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        uvicorn==0.30.6 \
        "cbor2>=5.4.0" \
        "defusedxml>=0.7" \
        "docker>=7.0.0" \
        "pyyaml>=6.0" \
        "cryptography>=41.0"

# Copy the Python package
COPY ministack/ ministack/

# Copy the built SPA from Stage 1 (per D-07)
COPY --from=frontend /build/ministack/static/console/ /opt/ministack/ministack/static/console/

RUN addgroup -S ministack && adduser -S ministack -G ministack
RUN mkdir -p /tmp/ministack-data/s3 && chown -R ministack:ministack /tmp/ministack-data
RUN mkdir -p /docker-entrypoint-initaws.d && chown ministack:ministack /docker-entrypoint-initaws.d
VOLUME /docker-entrypoint-initaws.d

ENV GATEWAY_PORT=4566 \
    LOG_LEVEL=INFO \
    S3_PERSIST=0 \
    S3_DATA_DIR=/tmp/ministack-data/s3 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    RDS_BASE_PORT=15432 \
    ELASTICACHE_BASE_PORT=16379 \
    LAMBDA_EXECUTOR=local \
    PYTHONUNBUFFERED=1

EXPOSE 4566

# Pure Python healthcheck — no curl dependency
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4566/_ministack/health')" || exit 1

ENTRYPOINT ["python", "-m", "uvicorn", "ministack.app:app", "--host", "0.0.0.0", "--port", "4566"]
