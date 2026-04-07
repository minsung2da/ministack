---
phase: 01-app-shell-navigation
plan: 06
type: execute
wave: 3
depends_on: ["01-app-shell-navigation/02", "01-app-shell-navigation/03", "01-app-shell-navigation/04", "01-app-shell-navigation/05"]
files_modified:
  - Dockerfile
  - Makefile
  - web/e2e/navigation.spec.ts
  - web/e2e/search.spec.ts
  - web/e2e/breadcrumbs.spec.ts
  - web/e2e/layout.spec.ts
  - web/e2e/responsive.spec.ts
  - web/e2e/counts.spec.ts
  - scripts/e2e-with-server.sh
  - .dockerignore
autonomous: false
requirements: [FOUND-01, FOUND-02, FOUND-03, NAV-01, NAV-02, NAV-03, NAV-04, NAV-05]
user_setup: []

must_haves:
  truths:
    - "Dockerfile is multi-stage (Node build → Python runtime) per D-07"
    - "Final Docker image contains ministack/static/console/index.html and assets/ directory"
    - "Final Docker image does NOT contain node_modules (size gate)"
    - "make build-frontend builds web/ and emits ministack/static/console/"
    - "make dev-frontend starts Vite dev server on :6655"
    - "make dev-backend starts uvicorn on :5566"
    - "Playwright E2E suite is green against a live ministack on :4566 (FOUND-01, NAV-01, NAV-03, NAV-04, NAV-05)"
    - "web/e2e/counts.spec.ts hits /services/dynamodb and /services/lambda against a real backend and asserts a numeric count renders (NAV-04 end-to-end)"
    - "pip install -e . + python -m ministack.app serves /_console/ returning the built SPA"
    - "Python full regression suite still green (FOUND-03 final gate)"
  artifacts:
    - path: "Dockerfile"
      provides: "Multi-stage build: node:22-alpine → python:3.12-alpine"
      contains: "FROM node:"
    - path: "Makefile"
      provides: "build-frontend, dev-frontend, dev-backend, e2e targets"
      contains: "build-frontend"
    - path: ".dockerignore"
      provides: "Excludes web/node_modules, .planning, etc. from docker context"
      contains: "node_modules"
  key_links:
    - from: "Dockerfile Stage 2"
      to: "Stage 1 /build/ministack/static/console"
      via: "COPY --from=frontend"
      pattern: "COPY --from="
    - from: "Playwright baseURL"
      to: "http://localhost:4566/_console/"
      via: "playwright.config.ts"
      pattern: "baseURL"

threat_model:
  surface: "Docker build pipeline and E2E test harness"
  assets: "Docker image (distributed artifact)"
  adversaries: "Supply-chain risk via npm install at build time"
  mitigations:
    - "Use `npm ci` (not `npm install`) in Stage 1 to enforce package-lock.json determinism"
    - ".dockerignore excludes .git, .planning, web/node_modules, tests/ to minimize context size and prevent accidental leak"
    - "Stage 2 runs as unprivileged user `ministack` (existing)"
    - "Stage 1 artifacts are copied by path — no shell expansion, no wildcard traversal"
  residual: "npm registry trust — same as every Node project; mitigated by package-lock.json commit"
---

<objective>
Close Phase 1 by wiring the build pipeline and running the E2E suite end-to-end. Converts `Dockerfile` to multi-stage per D-07, adds Makefile convenience targets (researcher's recommendation #2), writes real Playwright specs replacing the Wave 0 skipped stubs (including a new counts.spec.ts that proves NAV-04 against a real backend), and runs the full regression + E2E gate to prove every Phase 1 requirement is green.

This is the only Wave 3 plan — depends on Plans 02, 03, 04, and 05 all being landed. Contains the final human-verification checkpoint (Phase 1 sign-off).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-app-shell-navigation/01-RESEARCH.md
@.planning/phases/01-app-shell-navigation/01-UI-SPEC.md
@.planning/phases/01-app-shell-navigation/01-CONTEXT.md
@Dockerfile
@pyproject.toml
@web/playwright.config.ts
@web/e2e/navigation.spec.ts

<interfaces>
<!-- Contract recap for the E2E environment -->

Backend ports:
  - Production default: 4566 (uvicorn)
  - Dev: 5566 (uvicorn with GATEWAY_PORT=5566)

Frontend ports:
  - Dev: 6655 (Vite HMR)
  - Prod: served by ministack on 4566 under /_console/

Playwright baseURL (from Plan 01 playwright.config.ts):
  http://localhost:4566/_console/

E2E tests expect a LIVE ministack instance on :4566 with `ministack/static/console/index.html` built.

Regression Python suite (all must pass):
  pytest tests/test_services.py tests/test_existing_aws_apis.py tests/test_console_serve.py -q

Dockerfile current state (Plan 00): single stage, python:3.12-alpine, installs nodejs (for Lambda runtime), installs python deps via pip, copies ministack/, runs uvicorn.

Docker image size target: < 300 MB for Stage 2 final image (Stage 1 discarded).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert Dockerfile to multi-stage build + add .dockerignore + Makefile convenience targets</name>
  <files>
    Dockerfile,
    .dockerignore,
    Makefile,
    scripts/e2e-with-server.sh
  </files>
  <read_first>
    Dockerfile (current single-stage),
    .dockerignore (if exists),
    Makefile (if exists),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§Pitfall #5 for multi-stage gotchas, §Open Question 2 for Makefile targets),
    .planning/phases/01-app-shell-navigation/01-CONTEXT.md (D-07, D-08, D-09),
    pyproject.toml
  </read_first>
  <action>
**Step A — Write new `Dockerfile`** (multi-stage, preserve existing Stage 2 behavior verbatim except the added COPY for built SPA):

```dockerfile
# syntax=docker/dockerfile:1.6

# ---------- Stage 1: frontend build ----------
FROM node:22-alpine AS frontend
WORKDIR /build/web

# Copy manifests first for layer caching
COPY web/package.json web/package-lock.json* ./

# Use `npm ci` when lockfile is present (deterministic install); fall back to `npm install` otherwise.
# This keeps the first build of a fresh checkout working before a lockfile is committed.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the frontend source
COPY web/ ./

# Vite build emits into ../ministack/static/console per vite.config.ts `build.outDir`.
# We need a relative parent dir for Vite to write into — create it.
RUN mkdir -p /build/ministack/static/console && npm run build

# ---------- Stage 2: Python runtime ----------
FROM python:3.12-alpine

LABEL maintainer="MiniStack" \
      description="Local AWS Service Emulator — drop-in LocalStack replacement"

# Upgrade base packages + install nodejs for Lambda runtime emulation
# (nodejs here is for LAMBDA execution, NOT for building the UI — that happened in Stage 1)
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

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:4566/_ministack/health')" || exit 1

ENTRYPOINT ["python", "-m", "uvicorn", "ministack.app:app", "--host", "0.0.0.0", "--port", "4566"]
```

**Step B — Write `.dockerignore`** (create if absent; append otherwise):
```
.git
.gitignore
.planning
*.md
tests/
web/node_modules
web/dist
web/.vite
web/playwright-report
web/test-results
web/playwright/.cache
ministack/__pycache__
ministack/**/__pycache__
**/*.pyc
.pytest_cache
.ruff_cache
.venv
venv
```

Note: we INCLUDE web/src and web/package.json — they're needed for Stage 1. We EXCLUDE node_modules — Stage 1 runs `npm ci` to install fresh.

**Step C — Write/extend `Makefile`** (idempotent; only add new targets if file exists):
```makefile
.PHONY: build-frontend dev-frontend dev-backend test-backend test-frontend e2e docker-build

# --- Phase 1 convenience targets ---

build-frontend:
	cd web && npm ci && npm run build

dev-frontend:
	cd web && npm run dev

dev-backend:
	GATEWAY_PORT=5566 python -m uvicorn ministack.app:app --host 0.0.0.0 --port 5566 --reload

test-backend:
	python -m pytest tests/ -q

test-frontend:
	cd web && npx vitest run --reporter=dot

e2e:
	cd web && npx playwright test

docker-build:
	docker build -t ministack:phase1 .
```

If a Makefile already exists, prepend these targets; do not overwrite existing ones.

**Step C.5 — Create `scripts/e2e-with-server.sh`** — single-source helper for "build SPA, boot ministack, run Playwright, kill server" (reused by both Task 2 and Task 3 verify blocks):
```bash
#!/usr/bin/env bash
# scripts/e2e-with-server.sh
# Build the SPA, start ministack, wait for /_ministack/health, run Playwright,
# then tear down the server. Exit code mirrors Playwright.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

make build-frontend

PORT="${MINISTACK_PORT:-4566}"
python -m uvicorn ministack.app:app --host 127.0.0.1 --port "$PORT" >/tmp/ministack-e2e.log 2>&1 &
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
```

Make it executable: `chmod +x scripts/e2e-with-server.sh`. Verify the `scripts/` directory exists at repo root (create with `mkdir -p scripts` first).

**Step D — Verify the Docker build succeeds locally:**
```bash
docker build -t ministack:phase1-test .
```
Expected: build completes, final image exists.

**Step E — Verify the final image contains the SPA and NOT node_modules:**
```bash
docker run --rm ministack:phase1-test sh -c "ls /opt/ministack/ministack/static/console/index.html && ! ls /opt/ministack/web/node_modules 2>/dev/null"
```

**Step F — Verify image size is reasonable:**
```bash
docker image inspect ministack:phase1-test --format '{{.Size}}' | awk '{print $1/1024/1024 " MB"}'
```
Target: < 300 MB. If > 500 MB, investigate (Pitfall #5).
  </action>
  <acceptance_criteria>
    - `grep -q "FROM node:22-alpine AS frontend" Dockerfile`
    - `grep -q "COPY --from=frontend" Dockerfile`
    - `grep -q "npm ci\|npm install" Dockerfile`
    - `grep -q "ministack/static/console" Dockerfile`
    - `test -f .dockerignore && grep -q "node_modules" .dockerignore && grep -q ".planning" .dockerignore`
    - `test -f Makefile && grep -q "build-frontend:" Makefile && grep -q "dev-frontend:" Makefile && grep -q "dev-backend:" Makefile`
    - `test -x scripts/e2e-with-server.sh` (script exists and is executable)
    - `grep -q "trap cleanup" scripts/e2e-with-server.sh` (cleanup handler present)
    - `grep -q "_ministack/health" scripts/e2e-with-server.sh` (health-wait loop present)
    - `docker build -t ministack:phase1-test .` exits 0
    - `docker run --rm ministack:phase1-test sh -c "test -f /opt/ministack/ministack/static/console/index.html"` exits 0
    - `docker run --rm ministack:phase1-test sh -c "test ! -d /opt/ministack/web/node_modules"` exits 0
    - Image size < 500 MB (log actual size)
    - `make build-frontend` (from repo root) exits 0 and creates `ministack/static/console/index.html`
  </acceptance_criteria>
  <verify>
    <automated>docker build -t ministack:phase1-test . && docker run --rm ministack:phase1-test sh -c "test -f /opt/ministack/ministack/static/console/index.html && test ! -d /opt/ministack/web/node_modules" && make build-frontend && test -f ministack/static/console/index.html</automated>
  </verify>
  <done>Multi-stage Dockerfile ships the built SPA without node_modules, Makefile provides convenience targets, .dockerignore excludes build cruft, image is under size gate.</done>
</task>

<task type="auto">
  <name>Task 2: Write real Playwright E2E specs + run against a live ministack instance</name>
  <files>
    web/e2e/navigation.spec.ts,
    web/e2e/search.spec.ts,
    web/e2e/breadcrumbs.spec.ts,
    web/e2e/layout.spec.ts,
    web/e2e/responsive.spec.ts,
    web/e2e/counts.spec.ts
  </files>
  <read_first>
    web/e2e/navigation.spec.ts (Plan 01 stub),
    web/playwright.config.ts (Plan 01 config),
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (§Routing Contract, §Copywriting Contract, §Interaction Contract),
    web/src/shared/copy.ts
  </read_first>
  <action>
Replace the five Wave 0 stubs with real Playwright tests. These tests require a live ministack on :4566 with the built SPA. Launch that BEFORE running the tests.

**Step A — Start ministack in background** (for this task's verification):
```bash
make build-frontend
python -m uvicorn ministack.app:app --host 0.0.0.0 --port 4566 &
MINISTACK_PID=$!
# Wait for health
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf http://localhost:4566/_ministack/health >/dev/null && break
  sleep 1
done
```

**Step B — Real E2E specs:**

**`web/e2e/navigation.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Console navigation end-to-end', () => {
  test('opens /_console/ and renders the app shell', async ({ page }) => {
    await page.goto('/')
    // TopBar brand
    await expect(page.getByText('MiniStack', { exact: true })).toBeVisible()
    // Sidebar header
    await expect(page.getByText('Services', { exact: true })).toBeVisible()
    // Breadcrumb root
    await expect(page.getByText('Console', { exact: true }).first()).toBeVisible()
  })

  test('deep link /services/dynamodb renders without a reload', async ({ page }) => {
    await page.goto('/')
    await page.goto('/services/dynamodb')
    // ServiceHome header
    await expect(page.getByRole('heading', { name: /DynamoDB/i })).toBeVisible({ timeout: 10_000 })
  })

  test('SPA fallback: hard-refresh a deep link returns the app', async ({ page }) => {
    await page.goto('/services/ec2')
    await page.reload()
    await expect(page.getByRole('heading', { name: /EC2/i })).toBeVisible({ timeout: 10_000 })
  })
})
```

**`web/e2e/search.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test('typing "dyn" finds DynamoDB and navigates on select', async ({ page }) => {
  await page.goto('/')
  const search = page.getByPlaceholder('Search services')
  await search.click()
  await search.fill('dyn')
  const option = page.getByRole('option', { name: /DynamoDB/i })
  await expect(option).toBeVisible()
  await option.click()
  await expect(page).toHaveURL(/\/services\/dynamodb$/)
})
```

**`web/e2e/breadcrumbs.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test('clicking Console breadcrumb returns to /_console/', async ({ page }) => {
  await page.goto('/services/ec2')
  const crumb = page.getByRole('link', { name: 'Console' })
  await crumb.click()
  await expect(page).toHaveURL(/\/_console\/?$/)
})
```

**`web/e2e/layout.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test('no horizontal scroll at 1366×768 (NAV-05)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalScroll).toBe(false)
})
```

**`web/e2e/responsive.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test('sidebar still reachable at narrow laptop width (NAV-05)', async ({ page }) => {
  // Below 720px main-content min, Cloudscape auto-collapses the sidebar.
  // We just verify the shell does not crash and the sidebar toggle is reachable.
  await page.setViewportSize({ width: 900, height: 720 })
  await page.goto('/')
  await expect(page.getByText('MiniStack', { exact: true })).toBeVisible()
  // Sidebar toggle button exists (Cloudscape AppLayout renders it regardless of state)
  const toggle = page.getByRole('button', { name: /navigation/i })
  await expect(toggle).toBeVisible()
})
```

**`web/e2e/counts.spec.ts`** (NAV-04 end-to-end):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Service home resource counts (NAV-04 E2E)', () => {
  test('DynamoDB service home renders a numeric count from real ListTables', async ({ page }) => {
    await page.goto('/services/dynamodb')
    // Wait for either a real count line ("0 tables", "3 tables") or the empty-state body.
    // The ServiceHome KeyValuePairs component renders text like "0 tables" / "5 tables"
    // for services with a counter. Empty state shows the same line plus the empty heading.
    await expect(
      page.getByText(/^\d+\s+tables$/),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('Lambda service home renders a numeric function count', async ({ page }) => {
    await page.goto('/services/lambda')
    await expect(
      page.getByText(/^\d+\s+functions$/),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('S3 service home shows the "not available in Phase 1" message (no counter)', async ({ page }) => {
    await page.goto('/services/s3')
    await expect(
      page.getByText(/not available in Phase 1/i),
    ).toBeVisible({ timeout: 10_000 })
  })
})
```

**Step C — Run the E2E suite:**
```bash
cd web && npx playwright test
```

**Step D — Clean up the background ministack:**
```bash
kill $MINISTACK_PID 2>/dev/null || true
wait 2>/dev/null || true
```
  </action>
  <acceptance_criteria>
    - All 6 E2E spec files (including web/e2e/counts.spec.ts) have NO `test.skip` markers
    - `test -f web/e2e/counts.spec.ts && grep -q "services/dynamodb" web/e2e/counts.spec.ts && grep -q "services/lambda" web/e2e/counts.spec.ts`
    - `grep -c "await page.goto" web/e2e/navigation.spec.ts` returns ≥ 3
    - ministack can be booted against the built SPA (`make build-frontend && curl -sf http://localhost:4566/_console/` returns HTML containing `<div id="root">`)
    - `curl -sf http://localhost:4566/_console/api/services | python -c "import sys, json; data = json.load(sys.stdin); assert len(data) >= 30; assert 'cognito' in {e['key'] for e in data}"` exits 0
    - `cd web && npx playwright test` exits 0 (5/5 E2E tests pass) with ministack running on :4566
    - No E2E spec is quarantined, skipped, or marked `.only`
  </acceptance_criteria>
  <verify>
    <automated>bash scripts/e2e-with-server.sh</automated>
  </verify>
  <done>All 5 E2E specs pass against a live ministack serving the built SPA. NAV-01, NAV-03, NAV-05 verified end-to-end. FOUND-01 verified via SPA-fallback reload.</done>
</task>

<task type="auto">
  <name>Task 3: Run the full Phase 1 regression gate (Python + frontend unit + E2E + FOUND-03 proof)</name>
  <files></files>
  <read_first>
    tests/test_services.py,
    tests/test_existing_aws_apis.py,
    tests/test_console_serve.py,
    .planning/phases/01-app-shell-navigation/01-VALIDATION.md
  </read_first>
  <action>
Run every test layer in sequence. If ANY layer fails, STOP and diagnose — do not proceed to the human checkpoint.

```bash
# Backend — full Python suite (FOUND-03 final gate)
python -m pytest tests/ -q

# Frontend unit — all vitest
cd web && npx vitest run --reporter=dot
cd ..

# Frontend typecheck + build
cd web && npx tsc -b --noEmit && npx vite build
cd ..

# Boot ministack and run E2E
make build-frontend
python -m uvicorn ministack.app:app --host 127.0.0.1 --port 4566 &
SERVER_PID=$!
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf http://127.0.0.1:4566/_ministack/health >/dev/null && break
  sleep 1
done
(cd web && npx playwright test)
E2E_RET=$?
kill $SERVER_PID
wait 2>/dev/null
[ $E2E_RET -eq 0 ] || exit 1

# Sanity: can curl the services registry end-to-end?
python -m uvicorn ministack.app:app --host 127.0.0.1 --port 4566 &
SERVER_PID=$!
sleep 2
curl -sf http://127.0.0.1:4566/_console/ -o /tmp/index.html
grep -q '<div id="root">' /tmp/index.html || { kill $SERVER_PID; exit 1; }
curl -sf http://127.0.0.1:4566/_console/api/services -o /tmp/services.json
python -c "import json; d = json.load(open('/tmp/services.json')); assert len(d) >= 30" || { kill $SERVER_PID; exit 1; }
kill $SERVER_PID
wait 2>/dev/null
```

If all layers are green, mark `.planning/phases/01-app-shell-navigation/01-VALIDATION.md` frontmatter `nyquist_compliant: true` and `wave_0_complete: true` (single edit — just flip those two fields to true).
  </action>
  <acceptance_criteria>
    - `python -m pytest tests/ -q` exits 0
    - `cd web && npx vitest run --reporter=dot` exits 0
    - `cd web && npx tsc -b --noEmit` exits 0
    - `cd web && npx vite build` exits 0
    - `cd web && npx playwright test` exits 0 with a running ministack
    - `curl -sf http://127.0.0.1:4566/_console/` returns HTML with `<div id="root">`
    - `curl -sf http://127.0.0.1:4566/_console/api/services` returns JSON array length ≥ 30
    - `grep -q "nyquist_compliant: true" .planning/phases/01-app-shell-navigation/01-VALIDATION.md`
    - `grep -q "wave_0_complete: true" .planning/phases/01-app-shell-navigation/01-VALIDATION.md`
  </acceptance_criteria>
  <verify>
    <automated>python -m pytest tests/ -q && (cd web && npx tsc -b --noEmit && npx vitest run --reporter=dot && npx vite build) && bash scripts/e2e-with-server.sh && grep -q "nyquist_compliant: true" .planning/phases/01-app-shell-navigation/01-VALIDATION.md && grep -q "wave_0_complete: true" .planning/phases/01-app-shell-navigation/01-VALIDATION.md</automated>
  </verify>
  <done>Full Phase 1 regression green. FOUND-03 verified (existing AWS API suite untouched). VALIDATION.md flags flipped to nyquist_compliant and wave_0_complete.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Phase 1 visual sign-off — manual browser walkthrough</name>
  <what-built>
Complete Phase 1: /_console/ serves a React + Cloudscape SPA from ministack on port 4566 with working sidebar, service search, breadcrumbs, and service-home resource counts. Backend registry endpoint at /_console/api/services. All automated tests green. Docker multi-stage build produces a runnable image.
  </what-built>
  <how-to-verify>
1. Start ministack locally (not Docker — faster):
```bash
make build-frontend
python -m uvicorn ministack.app:app --host 0.0.0.0 --port 4566
```

2. Open `http://localhost:4566/_console/` in a real browser (Chrome/Firefox).

3. Check each of the following against 01-UI-SPEC.md:

   **AppLayout skeleton:**
   - [ ] TopNavigation bar visible at top with "MiniStack" brand and "us-east-1" region dropdown
   - [ ] Sidebar on the left with "Services" header and category groups
   - [ ] Main content area shows "Console Home" heading
   - [ ] Breadcrumb shows "Console"
   - [ ] No layout overflow at 1366x768

   **NAV-01 — Search:**
   - [ ] Type "dyn" in the search bar — DynamoDB appears as a filtered option
   - [ ] Click DynamoDB — URL becomes `/services/dynamodb` and page updates
   - [ ] Breadcrumb now shows "Console > DynamoDB"
   - [ ] ServiceHome shows either "0 tables" (empty state) or a real count

   **NAV-02 — Sidebar:**
   - [ ] Sidebar shows Compute, Storage, Database, Application Integration categories at minimum
   - [ ] Services are sorted alphabetically within each category
   - [ ] Clicking a service link navigates to that service's home

   **NAV-03 — Breadcrumbs:**
   - [ ] Click "Console" breadcrumb — returns to /_console/
   - [ ] Navigate to /services/ec2 — breadcrumb shows "Console > EC2"

   **NAV-04 — Resource counts:**
   - [ ] DynamoDB service home shows a count (likely "0 tables")
   - [ ] EC2 service home shows instances count + running/stopped rollup IF any instances exist (or "0 instances" if none)
   - [ ] Lambda service home shows function count
   - [ ] S3/SQS/SNS/KMS etc show "Not available in Phase 1" or "—"

   **NAV-05 — Layout:**
   - [ ] Resize browser to ~900px wide — sidebar collapses to hamburger, no horizontal scrollbar
   - [ ] Resize back to 1366px — sidebar expands again

   **FOUND-03 — AWS API unaffected:**
   - [ ] In another terminal, run: `aws --endpoint-url http://localhost:4566 s3 ls` — should return empty/existing buckets (not an error)
   - [ ] Run: `curl http://localhost:4566/_ministack/health` — should return the usual health JSON

   **Cache-Control (Pitfall #7):**
   - [ ] `curl -I http://localhost:4566/_console/` — Cache-Control should be `no-cache`
   - [ ] Find an asset file in the HTML source (e.g., /_console/assets/index-*.js) and curl its headers — should show `max-age=31536000, immutable`

   **Docker build:**
   - [ ] `docker build -t ministack:phase1 .` completes
   - [ ] `docker run -p 4566:4566 ministack:phase1` — open browser to `http://localhost:4566/_console/` and verify the same shell appears

4. Report any visual regressions, console errors, or behaviors that don't match the UI-SPEC.
  </how-to-verify>
  <acceptance_criteria>
    - User confirms all checklist items above pass
    - User reports no console errors in browser DevTools
    - User confirms Docker image runs and serves the console
  </acceptance_criteria>
  <resume-signal>Type "approved" when all checklist items pass. Describe any issues if you find regressions — Phase 1 does not close until they are fixed.</resume-signal>
</task>

</tasks>

<verification>
Phase 1 exit gate (run before closing):
```bash
python -m pytest tests/ -q
cd web && npx tsc -b --noEmit && npx vitest run --reporter=dot && npx vite build
# E2E requires a running ministack (see Task 3)
docker build -t ministack:phase1 .
```
All four must pass. Human checkpoint (Task 4) must return "approved".
</verification>

<success_criteria>
- D-07 delivered: multi-stage Docker build
- D-08 partially: Makefile exposes dev-frontend (Vite :6655) and dev-backend (uvicorn :5566)
- D-09 delivered: Production serves /_console/ from the ASGI app on :4566
- FOUND-01 through FOUND-04 all verified by automated + manual checks
- NAV-01 through NAV-05 all verified by automated + manual checks
- Full Python regression suite (including tests/test_services.py) green — FOUND-03 PROVED
- Phase 1 visually matches 01-UI-SPEC.md
</success_criteria>

<output>
Create `.planning/phases/01-app-shell-navigation/01-06-SUMMARY.md` documenting: final Docker image size, full test count (backend + frontend unit + E2E), any visual regressions found during checkpoint, confirmation that nyquist_compliant and wave_0_complete flags are set in VALIDATION.md.

Also update `.planning/STATE.md`:
- `status: executing` → `status: ready-for-next-phase`
- `stopped_at: "Phase 1 UI-SPEC approved"` → `stopped_at: "Phase 1 complete — app shell + navigation shipped"`
- `progress.completed_phases: 0` → `1`
- `progress.completed_plans: 0` → `6`
</output>
