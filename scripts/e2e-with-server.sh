#!/usr/bin/env bash
# scripts/e2e-with-server.sh
# Build the SPA, start ministack, wait for /_ministack/health, run Playwright,
# then tear down the server. Exit code mirrors Playwright.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

make build-frontend

PORT="${MINISTACK_PORT:-4566}"
PY="${PYTHON:-python}"
if [ -x "$REPO_ROOT/.venv/bin/python" ]; then
  PY="$REPO_ROOT/.venv/bin/python"
fi

"$PY" -m uvicorn ministack.app:app --host 127.0.0.1 --port "$PORT" >/tmp/ministack-e2e.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait up to 15s for the health endpoint
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -sf "http://127.0.0.1:${PORT}/_ministack/health" >/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -sf "http://127.0.0.1:${PORT}/_ministack/health" >/dev/null; then
  echo "ERROR: ministack failed to come up on port $PORT" >&2
  cat /tmp/ministack-e2e.log >&2 || true
  exit 1
fi

cd web
npx playwright test
