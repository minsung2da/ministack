---
phase: 01-app-shell-navigation
plan: 01
type: execute
wave: 0
depends_on: []
files_modified:
  - web/package.json
  - web/tsconfig.json
  - web/tsconfig.node.json
  - web/vite.config.ts
  - web/playwright.config.ts
  - web/index.html
  - web/src/test/setup.ts
  - web/src/test/utils.tsx
  - web/src/__tests__/AppShell.test.tsx
  - web/src/__tests__/ServiceSearch.test.tsx
  - web/src/__tests__/ServiceSidebar.test.tsx
  - web/src/__tests__/Breadcrumbs.test.tsx
  - web/src/__tests__/ServiceHome.test.tsx
  - web/src/__tests__/ServiceHomeEc2.test.tsx
  - web/src/__tests__/ServiceHomeError.test.tsx
  - web/e2e/navigation.spec.ts
  - web/e2e/search.spec.ts
  - web/e2e/breadcrumbs.spec.ts
  - web/e2e/layout.spec.ts
  - web/e2e/responsive.spec.ts
  - tests/test_console_serve.py
  - tests/test_existing_aws_apis.py
  - .gitignore
autonomous: false
requirements: [FOUND-02]
user_setup: []

must_haves:
  truths:
    - "Wave 0 regression baseline for existing AWS APIs is green (FOUND-03 gate exists)"
    - "All 11 missing test scaffolds from VALIDATION.md exist on disk"
    - "Cloudscape v3 + React 19 boot smoke has been manually verified via /dev/null render"
    - "Playwright Chromium binary is installed and launches headless on this machine"
  artifacts:
    - path: "web/package.json"
      provides: "Frontend workspace root with locked versions"
      contains: "@cloudscape-design/components"
    - path: "web/vite.config.ts"
      provides: "Vite base + test config"
      contains: "base: '/_console/'"
    - path: "web/playwright.config.ts"
      provides: "E2E runner config"
      contains: "chromium"
    - path: "tests/test_console_serve.py"
      provides: "pytest stubs for backend console routes"
      contains: "def test_"
    - path: "tests/test_existing_aws_apis.py"
      provides: "FOUND-03 regression smoke"
      contains: "def test_"
  key_links:
    - from: "web/vite.config.ts"
      to: "ministack/static/console"
      via: "build.outDir"
      pattern: "ministack/static/console"
    - from: "web/playwright.config.ts"
      to: "http://localhost:4566/_console/"
      via: "baseURL"
      pattern: "baseURL"

threat_model:
  surface: "Frontend build tooling + test runners"
  assets: "None in Wave 0 — scaffolding only, no secrets, no user data"
  adversaries: "Supply-chain attacks via unpinned npm packages"
  mitigations:
    - "Pin exact versions in package.json (no ^ prefix) for Cloudscape, React, Vite core"
    - "Do NOT commit node_modules; add to .gitignore"
    - "Do NOT install aiofiles/starlette/fastapi (violates CLAUDE.md dependency constraint)"
  residual: "npm registry trust — accepted, same as every JS project"
---

<objective>
Create ALL test scaffolding, Vite/Playwright config, and regression baselines BEFORE any implementation lands. This wave exists so every downstream task has a working `<verify>` command that can fail loudly. Also performs the Cloudscape v3 + React 19 runtime smoke test flagged as MEDIUM confidence in RESEARCH.md §Pitfalls #4.

Purpose: Nyquist validation (every subsequent task has an automated verify), FOUND-03 regression safety net, and empirical verification of the one research open question (Cloudscape+React 19 compat).
Output: Empty-but-runnable test suites, web/ workspace initialized, Python regression baseline captured, React 19 + Cloudscape smoke verified.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-app-shell-navigation/01-RESEARCH.md
@.planning/phases/01-app-shell-navigation/01-VALIDATION.md
@.planning/phases/01-app-shell-navigation/01-UI-SPEC.md
@.planning/phases/01-app-shell-navigation/01-CONTEXT.md
@CLAUDE.md
@ministack/app.py
@pyproject.toml

<interfaces>
<!-- Key constraints the executor MUST honor from research -->
- Vite base: '/_console/' WITH trailing slash
- React Router basename: '/_console' WITHOUT trailing slash (Pitfall #1)
- Vite build.outDir: path.resolve(__dirname, '../ministack/static/console')
- Vite dev server port: 6655 (D-08)
- Python dev port: 5566 (D-08), prod port 4566
- Proxy rules in dev: whitelist /_console/api, /_ministack, /2015-03-31 only. Do NOT catch-all '/' (Pitfall #3)
- No new Python deps. Use pathlib + mimetypes + asyncio.to_thread. Do NOT install aiofiles.
- Cloudscape v3.0.1259+ required (earlier versions use findDOMNode and break on React 19)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Initialize web/ workspace with pinned versions, configs, and .gitignore entry</name>
  <files>
    web/package.json,
    web/tsconfig.json,
    web/tsconfig.node.json,
    web/index.html,
    web/vite.config.ts,
    web/playwright.config.ts,
    web/src/test/setup.ts,
    web/src/test/utils.tsx,
    .gitignore
  </files>
  <read_first>
    CLAUDE.md (locked stack),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (Standard Stack + Installation + vite.config.ts pattern),
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (File Inventory section),
    pyproject.toml,
    .gitignore (if it exists)
  </read_first>
  <action>
Step 1. Create `web/` directory at repo root. Do NOT run `npm create vite@latest` — write files directly per the exact content below (scaffolding is opinionated and must match RESEARCH.md).

Step 2. Resolve current package versions by running (record output in summary):
```
npm view react version
npm view react-dom version
npm view @cloudscape-design/components version
npm view @cloudscape-design/global-styles version
npm view @cloudscape-design/design-tokens version
npm view vite version
npm view @vitejs/plugin-react version
npm view react-router-dom version
npm view @tanstack/react-query version
npm view zustand version
npm view ky version
npm view vitest version
npm view @testing-library/react version
npm view @testing-library/jest-dom version
npm view @testing-library/user-event version
npm view jsdom version
npm view @playwright/test version
npm view msw version
npm view typescript version
npm view @types/react version
npm view @types/react-dom version
```
Pin EXACT versions (no `^`, no `~`). For Cloudscape components, the version MUST be >= 3.0.1259 per Pitfall #4; if `npm view` reports lower, FAIL this task and raise blocker.

Step 3. Create `web/package.json`:
```json
{
  "name": "ministack-console",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run --reporter=dot",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "react": "<EXACT>",
    "react-dom": "<EXACT>",
    "@cloudscape-design/components": "<EXACT>",
    "@cloudscape-design/global-styles": "<EXACT>",
    "@cloudscape-design/design-tokens": "<EXACT>",
    "react-router-dom": "<EXACT>",
    "@tanstack/react-query": "<EXACT>",
    "zustand": "<EXACT>",
    "ky": "<EXACT>"
  },
  "devDependencies": {
    "typescript": "<EXACT>",
    "vite": "<EXACT>",
    "@vitejs/plugin-react": "<EXACT>",
    "@types/react": "<EXACT>",
    "@types/react-dom": "<EXACT>",
    "vitest": "<EXACT>",
    "@testing-library/react": "<EXACT>",
    "@testing-library/jest-dom": "<EXACT>",
    "@testing-library/user-event": "<EXACT>",
    "jsdom": "<EXACT>",
    "@playwright/test": "<EXACT>",
    "msw": "<EXACT>"
  }
}
```

Step 4. Create `web/tsconfig.json` (strict, ESNext, bundler resolution, React JSX automatic):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "src/**/*.ts", "src/**/*.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Step 5. Create `web/tsconfig.node.json` for vite/playwright configs:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "playwright.config.ts"]
}
```

Step 6. Create `web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MiniStack Console</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Step 7. Create `web/vite.config.ts` — copy EXACTLY the pattern from RESEARCH.md §"Pattern 1":
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: '/_console/',
  build: {
    outDir: path.resolve(__dirname, '../ministack/static/console'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 6655,
    strictPort: true,
    proxy: {
      '/_console/api': { target: 'http://localhost:5566', changeOrigin: true },
      '/_ministack':   { target: 'http://localhost:5566', changeOrigin: true },
      '/2015-03-31':   { target: 'http://localhost:5566', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    // jsdom default URL is http://localhost:3000/ — override so MSW handlers in Plan 05
    // can register against http://localhost/ (matches ky's resolution of bare '/' paths).
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
})
```

Step 8. Create `web/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4566/_console/',
    trace: 'retain-on-failure',
    viewport: { width: 1366, height: 768 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

Step 9. Create `web/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

Step 10. Create `web/src/test/utils.tsx`:
```typescript
import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
}

export function renderWithProviders(
  ui: ReactNode,
  opts: { route?: string } & RenderOptions = {}
) {
  const { route = '/', ...rest } = opts
  const client = makeTestQueryClient()
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} basename="/_console">
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
    rest,
  )
}
```

Step 11. Edit repo-root `.gitignore` and append (create file if missing):
```
# Frontend
web/node_modules/
web/dist/
web/.vite/
web/playwright-report/
web/test-results/
web/playwright/.cache/

# Built SPA output (shipped by pip via package-data)
ministack/static/console/
```
Note: `ministack/static/console/` is gitignored because it's a build artifact; pyproject.toml package-data (added in Plan 02) ships it in the wheel.

Step 12. Run `cd web && npm install` to bootstrap. If it fails with a peer dep error involving React 19 + Cloudscape, IMMEDIATELY STOP and escalate — do not downgrade React without checkpoint approval.

Step 13. Run `cd web && npx playwright install chromium` to fetch browser binary.
  </action>
  <acceptance_criteria>
    - `test -f web/package.json && test -f web/tsconfig.json && test -f web/vite.config.ts && test -f web/playwright.config.ts && test -f web/index.html && test -f web/src/test/setup.ts && test -f web/src/test/utils.tsx` all succeed
    - `grep -q "base: '/_console/'" web/vite.config.ts` matches
    - `grep -q "outDir:.*ministack/static/console" web/vite.config.ts` matches
    - `grep -q "port: 6655" web/vite.config.ts` matches
    - `grep -q "url: 'http://localhost/'" web/vite.config.ts` matches (jsdom origin override for MSW — required by Plan 05)
    - `grep -q "localhost:5566" web/vite.config.ts` matches
    - `grep -q "baseURL: 'http://localhost:4566/_console/'" web/playwright.config.ts` matches
    - `grep -qE '"@cloudscape-design/components":\s*"[0-9]' web/package.json` (exact version, not ^)
    - `grep -q "ministack/static/console" .gitignore` matches
    - `grep -q "web/node_modules" .gitignore` matches
    - `cd web && npm ls react >/dev/null 2>&1` (exit 0 — install succeeded)
    - `cd web && test -d node_modules/@cloudscape-design/components`
    - `cd web && npx playwright --version` exits 0
    - `ls ~/.cache/ms-playwright/chromium*` OR `ls web/playwright/.cache/chromium*` returns at least one match (browser installed)
  </acceptance_criteria>
  <verify>
    <automated>cd web && npm ls @cloudscape-design/components react react-dom vite @tanstack/react-query zustand ky react-router-dom && test -f vite.config.ts && test -f playwright.config.ts && npx playwright --version</automated>
  </verify>
  <done>web/ workspace bootstrapped with exact-pinned deps, Vite/Playwright/Vitest configured per RESEARCH.md patterns, browser binary installed, gitignore updated.</done>
</task>

<task type="auto">
  <name>Task 2: Write empty-but-runnable test stubs (frontend Vitest, Python pytest, Playwright E2E) + regression baseline</name>
  <files>
    web/src/__tests__/AppShell.test.tsx,
    web/src/__tests__/ServiceSearch.test.tsx,
    web/src/__tests__/ServiceSidebar.test.tsx,
    web/src/__tests__/Breadcrumbs.test.tsx,
    web/src/__tests__/ServiceHome.test.tsx,
    web/src/__tests__/ServiceHomeEc2.test.tsx,
    web/src/__tests__/ServiceHomeError.test.tsx,
    web/e2e/navigation.spec.ts,
    web/e2e/search.spec.ts,
    web/e2e/breadcrumbs.spec.ts,
    web/e2e/layout.spec.ts,
    web/e2e/responsive.spec.ts,
    tests/test_console_serve.py,
    tests/test_existing_aws_apis.py
  </files>
  <read_first>
    .planning/phases/01-app-shell-navigation/01-VALIDATION.md (Wave 0 Requirements list),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (Phase Requirements → Test Map table),
    tests/test_services.py (existing test style),
    tests/conftest.py,
    ministack/app.py (lines 90-300 for SERVICE_HANDLERS and route dispatch)
  </read_first>
  <action>
Create ONE test stub file for each entry in VALIDATION.md §"Wave 0 Requirements". Every test MUST be a `skip` or a trivial passing assertion so the runner reports green — downstream plans fill in real assertions. This ensures Nyquist sampling: every task in later waves has an existing `<verify>` command.

--- Frontend Vitest stubs ---

`web/src/__tests__/AppShell.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('ConsoleShell (Plan 04)', () => {
  it.skip('renders AppLayout with TopBar, Sidebar, Breadcrumbs and Outlet', () => {})
  it.skip('wires sidebarOpen from useUiStore to AppLayout navigationOpen', () => {})
  it.skip('sets id="top-nav" on TopBar container for AppLayout headerSelector', () => {})
})
```

`web/src/__tests__/ServiceSearch.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('TopBar service search (NAV-01)', () => {
  it.skip('filters services case-insensitive substring on type', () => {})
  it.skip('navigates to /services/:key when an option is selected', () => {})
  it.skip('shows copy.searchEmpty when query matches nothing', () => {})
})
```

`web/src/__tests__/ServiceSidebar.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('Sidebar (NAV-02)', () => {
  it.skip('renders services grouped by category from useServices()', () => {})
  it.skip('hides empty categories', () => {})
  it.skip('sorts service items alphabetically within a category', () => {})
})
```

`web/src/__tests__/Breadcrumbs.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('Breadcrumbs (NAV-03)', () => {
  it.skip('shows Console root at /', () => {})
  it.skip('shows Console › EC2 at /services/ec2', () => {})
  it.skip('calls navigate on breadcrumb click', () => {})
})
```

`web/src/__tests__/ServiceHome.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('ServiceHome (NAV-04) — DynamoDB', () => {
  it.skip('shows "0 tables" when API returns empty list', () => {})
  it.skip('shows spinner while loading', () => {})
})
```

`web/src/__tests__/ServiceHomeEc2.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('ServiceHome (NAV-04) — EC2 rollup', () => {
  it.skip('parses DescribeInstances XML and shows count + running/stopped rollup', () => {})
})
```

`web/src/__tests__/ServiceHomeError.test.tsx`:
```typescript
import { describe, it } from 'vitest'

describe('ServiceHome error state (NAV-04)', () => {
  it.skip('renders Alert with retry button on API error', () => {})
  it.skip('calls refetch when "Try Again" is clicked', () => {})
})
```

--- Playwright E2E stubs ---

`web/e2e/navigation.spec.ts`:
```typescript
import { test } from '@playwright/test'

test.describe('Console navigation end-to-end (Plan 06)', () => {
  test.skip('opens /_console/ and sees app shell with top nav and sidebar', async () => {})
  test.skip('deep link /_console/services/ec2 renders without page reload', async () => {})
})
```

`web/e2e/search.spec.ts`:
```typescript
import { test } from '@playwright/test'

test.describe('Service search (NAV-01 E2E)', () => {
  test.skip('typing "ec" shows EC2 and navigates on select', async () => {})
})
```

`web/e2e/breadcrumbs.spec.ts`:
```typescript
import { test } from '@playwright/test'

test.describe('Breadcrumbs (NAV-03 E2E)', () => {
  test.skip('clicking Console breadcrumb returns to /_console/', async () => {})
})
```

`web/e2e/layout.spec.ts`:
```typescript
import { test } from '@playwright/test'

test.describe('Layout (NAV-05 E2E)', () => {
  test.skip('no horizontal scroll at 1366×768', async () => {})
})
```

`web/e2e/responsive.spec.ts`:
```typescript
import { test } from '@playwright/test'

test.describe('Responsive (NAV-05 E2E)', () => {
  test.skip('sidebar auto-collapses below 720px main width', async () => {})
})
```

--- Python pytest stubs ---

`tests/test_console_serve.py`:
```python
"""Phase 1 console-serving integration tests. Stubs created in Wave 0, filled in Plan 02/06."""
import pytest


@pytest.mark.skip(reason="filled in Plan 02")
def test_root_returns_index():
    """GET /_console/ returns 200 with text/html and Cache-Control: no-cache."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_spa_fallback():
    """GET /_console/services/ec2 (deep link) returns index.html."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_missing_asset_404():
    """GET /_console/assets/nonexistent.js returns 404, not index.html."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_health_unaffected():
    """GET /_ministack/health still returns edition JSON."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_services_registry():
    """GET /_console/api/services returns [{key, name, category}, ...]."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_services_covers_handlers():
    """Registry endpoint enumerates every SERVICE_HANDLERS key (canonicalized)."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_path_traversal_blocked():
    """GET /_console/../etc/passwd does NOT escape ministack/static/console."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_index_html_cache_no_cache():
    """index.html Cache-Control is no-cache (Pitfall #7)."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_hashed_asset_cache_immutable():
    """assets/*.js Cache-Control is public, max-age=31536000, immutable."""
    pass
```

`tests/test_existing_aws_apis.py`:
```python
"""FOUND-03 regression gate. Ensures adding /_console/ routes does not break existing AWS API dispatch.

Wave 0 baseline: records current passing behavior. Wave 5 re-runs to prove untouched.
"""
import asyncio
import json
import pytest

from ministack.app import app


async def _call(method: str, path: str, headers: dict | None = None, body: bytes = b"") -> tuple[int, dict, bytes]:
    """Minimal ASGI invocation helper (mirrors tests/test_services.py style)."""
    scope = {
        "type": "http",
        "method": method,
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
    }
    status = {}
    out_headers: list[tuple[bytes, bytes]] = []
    out_body = bytearray()
    sent_body = False

    async def receive():
        nonlocal sent_body
        if sent_body:
            return {"type": "http.disconnect"}
        sent_body = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            status["code"] = message["status"]
            out_headers.extend(message.get("headers", []))
        elif message["type"] == "http.response.body":
            out_body.extend(message.get("body", b""))

    await app(scope, receive, send)
    hdrs = {k.decode(): v.decode() for k, v in out_headers}
    return status["code"], hdrs, bytes(out_body)


def test_health_endpoint_baseline():
    status, _hdrs, body = asyncio.run(_call("GET", "/_ministack/health"))
    assert status == 200
    data = json.loads(body)
    assert "edition" in data or "status" in data


def test_s3_list_buckets_baseline():
    """Empty S3 ListBuckets returns 200 XML with ListAllMyBucketsResult."""
    status, _hdrs, body = asyncio.run(
        _call("GET", "/", headers={"host": "localhost:4566", "authorization": "AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/s3/aws4_request"})
    )
    assert status == 200
    assert b"ListAllMyBucketsResult" in body


def test_dynamodb_list_tables_baseline():
    status, _hdrs, body = asyncio.run(
        _call(
            "POST",
            "/",
            headers={
                "host": "localhost:4566",
                "x-amz-target": "DynamoDB_20120810.ListTables",
                "content-type": "application/x-amz-json-1.0",
                "authorization": "AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/dynamodb/aws4_request",
            },
            body=b"{}",
        )
    )
    assert status == 200
    data = json.loads(body)
    assert "TableNames" in data


def test_lambda_list_functions_baseline():
    status, _hdrs, body = asyncio.run(
        _call("GET", "/2015-03-31/functions/", headers={"host": "localhost:4566"})
    )
    assert status == 200
    data = json.loads(body)
    assert "Functions" in data
```

NOTE: if any of the four regression tests fail on this baseline, DO NOT "fix" ministack — the test was written to match current behavior. Adjust the assertion to match what ministack actually returns today, then commit. This captures the pre-console truth for FOUND-03.
  </action>
  <acceptance_criteria>
    - All 7 frontend vitest stub files exist under `web/src/__tests__/`
    - All 5 Playwright e2e stub files exist under `web/e2e/`
    - `tests/test_console_serve.py` exists with ≥9 skipped test functions
    - `tests/test_existing_aws_apis.py` exists with 4 non-skipped test functions
    - `cd web && npx vitest run --reporter=dot` exits 0 with all tests passing or skipped (0 failures)
    - `cd web && npx playwright test --list` exits 0 and lists the skipped specs
    - `python -m pytest tests/test_console_serve.py -q` exits 0 (all skipped)
    - `python -m pytest tests/test_existing_aws_apis.py -q` exits 0 (4 passed)
    - `python -m pytest tests/test_services.py -q` still exits 0 (existing regression baseline intact)
    - `grep -c "it.skip\|test.skip\|@pytest.mark.skip" web/src/__tests__/*.tsx web/e2e/*.ts tests/test_console_serve.py | wc -l` confirms skipped markers present
  </acceptance_criteria>
  <verify>
    <automated>cd web && npx vitest run --reporter=dot && npx playwright test --list && cd .. && python -m pytest tests/test_console_serve.py tests/test_existing_aws_apis.py tests/test_services.py -q</automated>
  </verify>
  <done>All 11 Wave 0 test scaffolds exist, run green (pass or skip), and the FOUND-03 regression baseline captures current AWS API behavior so Plan 02 can prove non-regression.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Cloudscape v3 + React 19 runtime compatibility smoke check</name>
  <what-built>
Wave 0 bootstrap + test scaffolds per Tasks 1-2. The one RESEARCH.md-flagged MEDIUM-confidence item is Cloudscape v3 + React 19 runtime compatibility (Pitfall #4). Before committing Plan 01 and unblocking Plans 02-06, we need a 30-second human-visible smoke.
  </what-built>
  <how-to-verify>
1. Create a TEMPORARY file `web/src/smoke.tsx` (DO NOT commit this file):
```tsx
import '@cloudscape-design/global-styles/index.css'
import { createRoot } from 'react-dom/client'
import AppLayout from '@cloudscape-design/components/app-layout'
import TopNavigation from '@cloudscape-design/components/top-navigation'

createRoot(document.getElementById('root')!).render(
  <>
    <div id="top-nav">
      <TopNavigation identity={{ href: '#', title: 'MiniStack Smoke' }} />
    </div>
    <AppLayout toolsHide content={<div>Smoke OK</div>} headerSelector="#top-nav" />
  </>
)
```
2. Temporarily replace the `<script>` src in `web/index.html` with `/src/smoke.tsx`.
3. Run `cd web && npm run dev` (starts Vite on :6655).
4. Open `http://localhost:6655/_console/` in a browser.
5. Verify: TopNavigation bar renders at top, AppLayout content area shows "Smoke OK", NO red console errors mentioning `findDOMNode`, `Cannot read properties of null`, or hydration warnings.
6. Kill Vite (Ctrl+C), DELETE `web/src/smoke.tsx`, and revert `web/index.html` back to `/src/main.tsx`.
7. Report result.

**Pass criteria:** No runtime errors. AppLayout + TopNavigation render.

**Fail criteria:** Any `findDOMNode is not a function` error OR any blank page. If fail, STOP Phase 1 and open a blocker in STATE.md — do NOT downgrade React 19 without explicit user approval.
  </how-to-verify>
  <acceptance_criteria>
    - User confirms Cloudscape AppLayout + TopNavigation render in browser without console errors
    - `web/src/smoke.tsx` is deleted (does not ship to Plan 03)
    - `web/index.html` points back at `/src/main.tsx`
  </acceptance_criteria>
  <resume-signal>Type "approved" if smoke passed and smoke.tsx was deleted. Describe errors if failed — Phase 1 pauses until resolved.</resume-signal>
</task>

</tasks>

<verification>
Wave 0 exit gate:
```bash
cd web && npx vitest run --reporter=dot
cd web && npx playwright test --list
python -m pytest tests/test_console_serve.py tests/test_existing_aws_apis.py tests/test_services.py -q
test ! -f web/src/smoke.tsx
```
All four must succeed.
</verification>

<success_criteria>
- FOUND-02 scaffold exists (package.json pinned, configs written)
- Every downstream task in Plans 02-06 has an existing test file to reference in its `<verify>`
- FOUND-03 regression baseline (`tests/test_existing_aws_apis.py` + `tests/test_services.py`) is green BEFORE any backend changes land
- Cloudscape v3 + React 19 runtime compatibility is empirically verified
</success_criteria>

<output>
Create `.planning/phases/01-app-shell-navigation/01-01-SUMMARY.md` documenting: exact pinned versions, smoke result, any peer-dep warnings, and confirmation that `ministack/static/console/` is gitignored.
</output>
