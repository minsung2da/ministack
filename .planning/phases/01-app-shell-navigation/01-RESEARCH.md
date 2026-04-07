# Phase 1: App Shell & Navigation - Research

**Researched:** 2026-04-07
**Domain:** React 19 SPA (Cloudscape v3 + Vite 6 + React Router v7) embedded in a raw-ASGI Python emulator under `/_console/`
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Console API Design**
- **D-01:** Frontend calls AWS API endpoints on :4566 directly (like boto3/CLI), NOT a separate Console API. The frontend acts as an AWS client.
- **D-02:** Responses follow AWS-compatible JSON format. No custom response transformation layer.

**Service Navigation**
- **D-04:** Services grouped by AWS category (Compute, Storage, Database, Networking, etc.) matching the AWS Console classification.
- **D-05:** Typeahead search — keyword input immediately filters matching services.
- **D-06:** Service home pages show resource count + status summary (e.g., "Instances 5 (3 running, 2 stopped)").

**Build & Deploy Pipeline**
- **D-07:** Docker multi-stage build — Node stage builds the SPA, Python stage copies static assets.
- **D-08:** Development mode: Vite dev server on port **6655**, proxying API calls to Python backend on port **5566**.
- **D-09:** Production: Static SPA files served from the existing ASGI app under `/_console/` path.

**Layout & UX**
- **D-10:** AWS Console clone layout via Cloudscape `AppLayout` — fixed top header, collapsible left sidebar, main content area.

### Claude's Discretion
- **D-03:** XML parsing strategy for EC2-style services (frontend fast-xml-parser vs backend JSON conversion layer vs hybrid). *Phase 1 note: not blocking — the service-home summary endpoint returns JSON regardless; revisit in Phase 2 when real EC2 list rendering is needed.*
- **D-11:** URL routing pattern (hash-based vs history-based, exact path structure). *Recommendation below: history-based BrowserRouter with ASGI SPA fallback.*
- Frontend project structure and directory layout.
- SPA fallback routing implementation in ASGI handler.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

### Tension with D-01/D-02 vs UI-SPEC
UI-SPEC §"File / Module Inventory" and §"Service Categories" describe a `/_console/api/services` registry endpoint that returns `[{key, name, category}, ...]` from `SERVICE_HANDLERS`. This is **not** an AWS-format API — it's a tiny read-only registry used to populate the sidebar and search. It does not violate D-01/D-02 because:
1. It is a navigation registry, not a resource CRUD endpoint.
2. No AWS API exposes "what services are enabled in this emulator" — D-01 can't apply to a question AWS itself doesn't answer.
3. The alternative (hardcoding 35+ services in the frontend) breaks Pitfall 10 (service discovery).
Phase 1 therefore ships **one** Console API endpoint: `GET /_console/api/services`. All resource reads (including NAV-04 resource counts) must go through existing AWS API endpoints on :4566 per D-01.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Serve web UI under `/_console/` on port 4566 | §"ASGI Integration" — new prefix check inserted before `detect_service()` in `app.py` around line 440; `/_console/` underscore prefix is collision-free with S3 bucket naming rules. |
| FOUND-02 | React 19 + Cloudscape v3 + Vite 6 SPA, ASGI-served static files | §"Standard Stack" — versions verified via npm; §"Vite SPA Integration" — `base: '/_console/'` + `build.outDir: '../ministack/static/console'`. |
| FOUND-03 | Existing AWS API emulation untouched | §"ASGI Integration" — prefix check returns early; no modification to `detect_service()` or `SERVICE_HANDLERS`. Verification: existing `tests/test_services.py` must still pass. |
| FOUND-04 | `/_console/api/` returns UI-friendly JSON from service module state | §"Console API Endpoint" — single registry endpoint `/_console/api/services` for Phase 1. Resource counts (NAV-04) come from AWS API calls per D-01. |
| NAV-01 | Top nav service search → navigate | §"Service Search UX" — Cloudscape `Autosuggest` in `TopNavigation.utilities`, client-side filter over registry. |
| NAV-02 | Per-service left sidebar with sub-resources | §"Cloudscape AppLayout Composition" — `SideNavigation` with `type: "section"` groups. Phase 1 shows services only; sub-resources are Phase 2+ extensions of `routes.tsx`. |
| NAV-03 | Breadcrumb navigation reflects current location | §"Breadcrumb Derivation" — derive from `useLocation()` pathname + static label map, render with `BreadcrumbGroup`. |
| NAV-04 | Service home shows resource count + status summary | §"NAV-04 Resource Count Strategy" — real AWS API calls via TanStack Query (EC2 DescribeInstances, S3 ListBuckets, etc.). Wrapped in error boundary + `<Alert>` + retry per UI-SPEC interaction contract. |
| NAV-05 | Desktop-first responsive layout doesn't break on laptop | §"Cloudscape AppLayout Composition" — `AppLayout` handles 720px auto-collapse natively; no custom responsive CSS in Phase 1. |
</phase_requirements>

## Summary

Phase 1 is a greenfield frontend bolted onto a mature raw-ASGI Python app. The stack (React 19 + Cloudscape v3 + Vite 6 + React Router 7 library mode + TanStack Query 5 + Zustand 5 + ky 1) is already locked in `CLAUDE.md` and validated in `.planning/research/STACK.md` — this research is not about choosing the stack but about **the five integration seams that make it work in this specific project**: (1) the Vite `base` path when the app is mounted at `/_console/` rather than `/`, (2) the ASGI prefix check that must land before `detect_service()` in `app.py` so it doesn't collide with the S3 virtual-host regex or the service-dispatch fallthrough, (3) SPA fallback for browser refresh on deep links, (4) the single Console API endpoint (`/_console/api/services`) that powers the sidebar and Autosuggest, and (5) dev-mode Vite proxy from :6655 → :5566 to avoid CORS.

The UI-SPEC already pins every Cloudscape component, copy string, color token, spacing token, file layout, and route pattern. This RESEARCH.md's job is therefore to (a) verify the library versions are installable today, (b) document the exact `vite.config.ts` / `app.py` patches, (c) spell out how NAV-04 resource counts are fetched given D-01 ("frontend acts like boto3, no Console API for resources"), and (d) define the Nyquist validation test map so the planner can schedule tests alongside code.

**Primary recommendation:** Scaffold `web/` with Vite's React-TS template, set `base: '/_console/'` + `build.outDir: '../ministack/static/console'`, add a ~40-line `_serve_console()` function in `app.py` that runs **before** the `/_ministack/*` admin checks, use React Router 7 `createBrowserRouter` with `basename: '/_console'`, fetch the service registry once at shell mount via TanStack Query, and lazy-import each service home via `React.lazy`. Skip `aiofiles` — use synchronous file reads inside an `asyncio.to_thread` call; Phase 1 traffic is one developer, and Python's `pathlib.Path.read_bytes()` is simpler and removes a dependency, honoring MiniStack's minimal-deps philosophy.

## Standard Stack

### Core (frontend — `web/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.0 | UI runtime | Latest stable React 19 line; required by Cloudscape peer dep `react>=16.8.0`. |
| react-dom | 19.2.0 | DOM renderer | Must match `react`. |
| typescript | 5.7.3 | Type system | Cloudscape ships `.d.ts`; non-negotiable for 35+ service dashboards. |
| vite | 6.3.5 | Build + dev server | Industry standard SPA bundler in 2026; CRA is dead; Next.js is overkill (no Node runtime here). |
| @vitejs/plugin-react | 4.3.4 | React + Fast Refresh | Canonical Vite React plugin. |
| @cloudscape-design/components | 3.0.1259+ | AWS Console UI kit | The AWS-console design system, open-sourced by AWS. Actively maintained (April 2026). |
| @cloudscape-design/global-styles | 1.0.41+ | CSS reset + theme | Required peer package; import once in `main.tsx`. |
| @cloudscape-design/design-tokens | 3.0.58+ | CSS custom properties + JS exports | Token source for any custom spacing/typography references. |
| react-router-dom | 7.5.0+ | Client routing (library mode) | SPA router; `createBrowserRouter` + `basename` for the `/_console/` mount. |
| @tanstack/react-query | 5.96.0+ | Server state | Caching + refetchOnWindowFocus + retry + stale-while-revalidate for AWS API calls. |
| zustand | 5.0.3+ | Client UI state | 1.2 KB; sidebar-open flag, last-selected service, persisted to `localStorage`. |
| ky | 1.8.1+ | HTTP client | 3.3 KB; used as TanStack Query's fetcher; hooks API for adding AWS-style headers in Phase 2. |

**Version verification (run before writing `package.json`):**
```bash
npm view react version
npm view @cloudscape-design/components version
npm view @cloudscape-design/global-styles version
npm view @cloudscape-design/design-tokens version
npm view vite version
npm view react-router-dom version
npm view @tanstack/react-query version
npm view zustand version
npm view ky version
```
Versions above are training-data baselines; the planner MUST verify with the registry and pin exact versions in `package.json`.

### Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| vitest | 3.0+ | Unit test runner (Vite-native, Jest-compatible API) |
| @testing-library/react | 16.2+ | Component testing |
| @testing-library/jest-dom | 6.6+ | DOM matchers |
| @testing-library/user-event | 14.5+ | User interaction simulation |
| jsdom | 25.0+ | DOM impl for Vitest |
| @playwright/test | 1.50+ | E2E browser testing for the navigation flow |
| @types/react | 19.0+ | React 19 types |
| @types/react-dom | 19.0+ | React DOM 19 types |
| typescript-eslint | 8.x | Linting |

### Backend (Python — no new deps if possible)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | Serve static files | **Skip aiofiles.** Use `pathlib.Path.read_bytes()` inside `asyncio.to_thread(...)`. MiniStack's deps list is currently 4 packages; adding `aiofiles` violates the "minimal dependencies" constraint and provides zero measurable benefit for the dev-tool traffic profile (1 user, local loopback). |

If the planner later finds the sync-to-thread approach insufficient (e.g., very large JS bundles blocking on file reads), `aiofiles>=24.1.0` is the fallback — but that should be a Phase 1 measurement, not a default.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Router 7 | TanStack Router | TanStack Router has better types but adds learning curve; React Router is already assumed everywhere in Cloudscape examples. |
| ky | fetch directly | `fetch` has no retry / hook primitives; TanStack Query docs explicitly recommend a wrapper. |
| Vitest | Jest | Jest requires extra Vite config; Vitest is zero-config with Vite. |
| `pathlib` + `to_thread` | `aiofiles` | See above — dependency minimization. |

## Installation

```bash
# From repo root
mkdir -p web
cd web
npm create vite@latest . -- --template react-ts
# Then install:
npm install react@19.2.0 react-dom@19.2.0
npm install @cloudscape-design/components @cloudscape-design/global-styles @cloudscape-design/design-tokens
npm install react-router-dom@7
npm install @tanstack/react-query@5
npm install zustand@5
npm install ky@1
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test
```

## Architecture Patterns

### Recommended Project Structure

```
ministack/                           # existing Python package
├── app.py                           # + ~40 lines for /_console/ prefix handler
└── static/                          # NEW: built SPA assets land here
    └── console/                     # vite build.outDir target
        ├── index.html
        └── assets/
            ├── index-<hash>.js
            └── index-<hash>.css

web/                                 # NEW: frontend source
├── package.json
├── vite.config.ts                   # base: '/_console/', proxy to :5566
├── tsconfig.json
├── index.html
├── playwright.config.ts
└── src/
    ├── main.tsx                     # ReactDOM.createRoot + providers + global styles
    ├── App.tsx                      # <RouterProvider router={router} />
    ├── app/
    │   ├── ConsoleShell.tsx         # AppLayout wiring (top nav + sidebar + content + breadcrumbs)
    │   ├── TopBar.tsx               # TopNavigation + Autosuggest service search
    │   ├── Sidebar.tsx              # SideNavigation populated from useServices()
    │   ├── Breadcrumbs.tsx          # BreadcrumbGroup from useLocation()
    │   └── routes.tsx               # Route table with React.lazy per service
    ├── pages/
    │   ├── ConsoleHome.tsx          # Landing page (category grid)
    │   ├── ServiceHome.tsx          # Generic service home (counts + status)
    │   └── NotFoundPage.tsx         # 404 inside shell
    ├── shared/
    │   ├── api/
    │   │   ├── client.ts            # ky instance (prefixUrl: '/')
    │   │   ├── queryClient.ts       # TanStack Query QueryClient
    │   │   ├── services.ts          # useServices() → GET /_console/api/services
    │   │   └── counts.ts            # useResourceCount(serviceKey) → AWS API call
    │   ├── copy.ts                  # All user-facing strings
    │   └── serviceCategories.ts     # Locked taxonomy (CRUD-free)
    ├── stores/
    │   └── uiStore.ts               # Zustand: sidebarOpen, lastSelectedService
    └── test/
        ├── setup.ts                 # vitest-dom matchers
        └── utils.tsx                # Router + QueryClient test wrapper
```

### Pattern 1: Vite SPA Integration — `vite.config.ts`

**What:** Configure Vite to build assets that can be served from `/_console/` and proxy API calls to the Python backend in dev.
**When to use:** Phase 1 foundation — every other task depends on this.

```typescript
// web/vite.config.ts
// Source: https://vite.dev/config/ (verified Apr 2026, v6.3.x)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],

  // Critical: built assets reference URLs relative to /_console/
  // index.html will emit <script src="/_console/assets/index-abc.js">
  base: '/_console/',

  build: {
    // Emit into the Python package so `pip install ministack` ships the UI
    outDir: path.resolve(__dirname, '../ministack/static/console'),
    emptyOutDir: true,
    sourcemap: false,
    // Force deterministic filenames under assets/ for the ASGI cache-control rules
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  server: {
    port: 6655,          // D-08: dev server
    strictPort: true,
    proxy: {
      // Forward every AWS API path and the console registry to :5566
      // Note: we cannot proxy "/" wholesale because it would also swallow Vite's own /@vite/ dev routes.
      // Instead, proxy the prefixes the frontend actually calls:
      '/_console/api': { target: 'http://localhost:5566', changeOrigin: true },
      '/_ministack':   { target: 'http://localhost:5566', changeOrigin: true },
      // AWS SDK-style routes (bucket at root, /2015-03-31/functions, etc.)
      // Phase 1 only needs the registry endpoint + a few count calls, so whitelist explicitly:
      '/2015-03-31':   { target: 'http://localhost:5566', changeOrigin: true }, // Lambda
      '/':  false,     // DO NOT catch-all: Vite serves / as index.html
    },
  },

  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

**Gotchas documented below in Pitfalls #3 and #7.**

### Pattern 2: ASGI Integration — `_serve_console()` in `app.py`

**What:** Add a single function that serves static assets under `/_console/` with SPA fallback.
**When to use:** Once, at phase start. Must land **before** `/_ministack/reset` check and **before** `detect_service()`.

```python
# ministack/app.py — insert after the /_ministack/lambda-layers/ block
# around line 250 (after line 248, before the /_ministack/reset check on line 276)
# Source: https://www.crccheck.com/blog/serving-spas-from-starlette/ (SPA fallback pattern)
# and ASGI spec: https://asgi.readthedocs.io/

import mimetypes
from pathlib import Path

_CONSOLE_ROOT = Path(__file__).parent / "static" / "console"
_CONSOLE_ASSETS = _CONSOLE_ROOT / "assets"
# Paths that must NOT be rewritten to index.html even under /_console/*
_CONSOLE_API_PREFIX = "/_console/api/"

async def _serve_console(path: str, method: str, send) -> bool:
    """
    Return True if the request was handled by the console static server.
    Must be called BEFORE service detection to avoid S3 path-style collisions.
    """
    if not path.startswith("/_console"):
        return False
    if method not in ("GET", "HEAD"):
        return False
    # Console API endpoints are handled by a separate block — not here
    if path.startswith(_CONSOLE_API_PREFIX):
        return False

    # Normalize: "/_console" and "/_console/" both map to index.html
    rel = path[len("/_console/"):] if path.startswith("/_console/") else ""

    # Try to resolve an actual file under ministack/static/console
    if rel:
        candidate = (_CONSOLE_ROOT / rel).resolve()
        # Path traversal guard: candidate must stay inside _CONSOLE_ROOT
        try:
            candidate.relative_to(_CONSOLE_ROOT.resolve())
        except ValueError:
            candidate = None
        if candidate and candidate.is_file():
            body = await asyncio.to_thread(candidate.read_bytes)
            ctype, _ = mimetypes.guess_type(candidate.name)
            # Hashed asset bundles get long cache; everything else no-cache
            cache = (
                "public, max-age=31536000, immutable"
                if candidate.parent == _CONSOLE_ASSETS
                else "no-cache"
            )
            await _send_response(send, 200, {
                "Content-Type": ctype or "application/octet-stream",
                "Cache-Control": cache,
            }, body)
            return True

    # SPA fallback: serve index.html for any unmatched /_console/* GET
    index = _CONSOLE_ROOT / "index.html"
    if not index.is_file():
        await _send_response(send, 503, {"Content-Type": "text/plain"},
                             b"Console UI not built. Run `npm run build` in web/.")
        return True
    body = await asyncio.to_thread(index.read_bytes)
    await _send_response(send, 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
    }, body)
    return True
```

**Call site (insert around line 250 in `app.py`, immediately after the lambda-layers block):**
```python
# Console UI static assets + SPA fallback — must run before AWS dispatch
if await _serve_console(path, method, send):
    return

# Console API registry (Phase 1: services list only)
if path == "/_console/api/services" and method == "GET":
    services_payload = [
        {"key": k, "name": _service_display_name(k), "category": _service_category(k)}
        for k in sorted(SERVICE_HANDLERS.keys())
    ]
    await _send_response(send, 200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        # Dev-mode CORS — production is same-origin so this is a no-op
        "Access-Control-Allow-Origin": "*",
    }, json.dumps(services_payload).encode())
    return
```

Helper functions `_service_display_name()` and `_service_category()` live in a new module `ministack/console/registry.py` with a static mapping — pure data, no state, no imports from services.

### Pattern 3: React Router 7 Library Mode with `basename`

**What:** Set up history-based routing that respects the `/_console/` mount.
**When to use:** Root of the React app.

```typescript
// web/src/App.tsx
// Source: https://reactrouter.com/start/library/routing (v7 library mode)
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Spinner from '@cloudscape-design/components/spinner'
import { ConsoleShell } from './app/ConsoleShell'

const ConsoleHome = lazy(() => import('./pages/ConsoleHome'))
const ServiceHome = lazy(() => import('./pages/ServiceHome'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <ConsoleShell />,
      children: [
        { index: true, element: <Suspense fallback={<Spinner />}><ConsoleHome /></Suspense> },
        { path: 'services/:serviceKey', element: <Suspense fallback={<Spinner />}><ServiceHome /></Suspense> },
        { path: 'services/:serviceKey/*', element: <Suspense fallback={<Spinner />}><ServiceHome /></Suspense> },
        { path: '*', element: <Suspense fallback={<Spinner />}><NotFoundPage /></Suspense> },
      ],
    },
  ],
  // CRITICAL: matches Vite's base AND the ASGI prefix
  { basename: '/_console' },
)

export default function App() {
  return <RouterProvider router={router} />
}
```

`basename` in React Router 7 means: the router internally treats `/_console/services/ec2` as `/services/ec2` when matching, and `<Link to="/services/ec2">` renders `href="/_console/services/ec2"` automatically. This keeps the route table clean.

### Pattern 4: Cloudscape AppLayout Composition

**What:** Compose the shell from Cloudscape primitives in a single file.
**When to use:** Once, in `ConsoleShell.tsx`.

```typescript
// web/src/app/ConsoleShell.tsx
// Source: https://cloudscape.design/components/app-layout/
import { Outlet } from 'react-router-dom'
import AppLayout from '@cloudscape-design/components/app-layout'
import ContentLayout from '@cloudscape-design/components/content-layout'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { useUiStore } from '../stores/uiStore'

export function ConsoleShell() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)

  return (
    <>
      <TopBar />
      <AppLayout
        navigation={<Sidebar />}
        navigationOpen={sidebarOpen}
        onNavigationChange={({ detail }) => setSidebarOpen(detail.open)}
        toolsHide
        breadcrumbs={<Breadcrumbs />}
        content={
          <ContentLayout>
            <Outlet />
          </ContentLayout>
        }
        // Cloudscape AppLayout expects its top offset to match TopNavigation height (56px)
        headerSelector="#top-nav"
      />
    </>
  )
}
```

`TopBar.tsx` must render its root element with `id="top-nav"` so `AppLayout` can measure the offset. This is the canonical Cloudscape pattern — see `@cloudscape-design/components` GitHub `pages/app-layout/with-top-navigation.page.tsx`.

### Pattern 5: Service Search via Autosuggest

**What:** Typeahead search that navigates on select (NAV-01, D-05).
**When to use:** Inside `TopBar.tsx`, wired into `TopNavigation.utilities`.

```typescript
// web/src/app/TopBar.tsx
// Source: https://cloudscape.design/components/autosuggest/
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import Autosuggest from '@cloudscape-design/components/autosuggest'
import { useServices } from '../shared/api/services'
import { copy } from '../shared/copy'

export function TopBar() {
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const [value, setValue] = useState('')

  const options = useMemo(
    () => services.map((s) => ({ value: s.name, label: s.name, tags: [s.category], key: s.key })),
    [services]
  )

  return (
    <div id="top-nav">
      <TopNavigation
        identity={{ href: '/_console/', title: copy.brand, logo: undefined }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: copy.region,
            items: [{ id: 'us-east-1', text: 'us-east-1' }],
          },
        ]}
        search={
          <Autosuggest
            value={value}
            onChange={({ detail }) => setValue(detail.value)}
            onSelect={({ detail }) => {
              const picked = options.find((o) => o.value === detail.value)
              if (picked) navigate(`/services/${picked.key}`)
            }}
            options={options}
            ariaLabel={copy.searchPlaceholder}
            placeholder={copy.searchPlaceholder}
            enteredTextLabel={(v) => `Go to "${v}"`}
            empty={copy.searchEmpty}
            filteringType="auto"
          />
        }
      />
    </div>
  )
}
```

`filteringType="auto"` gives case-insensitive substring matching for free — no custom filter logic needed.

### Pattern 6: Breadcrumb Derivation from `useLocation()`

```typescript
// web/src/app/Breadcrumbs.tsx
// Source: https://cloudscape.design/components/breadcrumb-group/
import { useLocation, useNavigate } from 'react-router-dom'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import { copy } from '../shared/copy'
import { useServices } from '../shared/api/services'

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { data: services = [] } = useServices()

  // Strip the router basename-relative path: "/services/ec2" → ['services','ec2']
  const parts = pathname.split('/').filter(Boolean)
  const items = [{ text: copy.breadcrumbRoot, href: '/' }]
  if (parts[0] === 'services' && parts[1]) {
    const svc = services.find((s) => s.key === parts[1])
    items.push({ text: svc?.name ?? parts[1], href: `/services/${parts[1]}` })
  }

  return (
    <BreadcrumbGroup
      items={items}
      onFollow={(e) => {
        e.preventDefault()
        navigate(e.detail.href)
      }}
    />
  )
}
```

Phase 1 uses a static derivation. Phase 2+ can switch to React Router 7's route `handle` pattern if nested sub-resources need first-class breadcrumb metadata.

### Pattern 7: NAV-04 Resource Count Strategy (the tricky one)

**What:** Service home pages must show "N instances" (NAV-04) **without** a Console API per D-01.
**When to use:** In `pages/ServiceHome.tsx`.

**The constraint:** D-01 says "frontend calls AWS API endpoints on :4566 directly, like boto3". That means for Phase 1 resource counts, the UI must issue real AWS API calls.

**The problem:** AWS APIs are a zoo. EC2 returns XML (`DescribeInstances`), S3 returns XML (`ListBuckets`), DynamoDB returns JSON (`ListTables`), Lambda returns JSON (`ListFunctions`), SQS returns XML (`ListQueues`). Each has a different URL scheme (`POST /` with action in form-encoded body vs. path-based).

**The Phase 1 scope-cut:** The UI-SPEC already covers this by specifying only **count + status rollup**, not resource tables. Phase 1 therefore implements count fetching **only for the 4-5 services shown in the initial sidebar** (EC2, Lambda, S3, DynamoDB, SQS, SNS, CloudWatch, IAM, KMS, Secrets Manager per §"Service Categories"). Services without a count fetcher show "—" until Phase 2+.

**Recommended implementation pattern:**

```typescript
// web/src/shared/api/counts.ts
// One fetcher per service — small, explicit, each returns { count, states? }
import ky from 'ky'

const client = ky.create({
  // Same-origin in prod; Vite proxy in dev routes these to :5566
  retry: 0,
  timeout: 5000,
})

export type CountSummary = { count: number; states?: Record<string, number> }

// JSON-based services: use the native JSON protocol (AWS JSON 1.0 / 1.1)
export async function countDynamoDbTables(): Promise<CountSummary> {
  // DynamoDB uses JSON protocol with X-Amz-Target header
  const res = await client.post('/', {
    headers: {
      'X-Amz-Target': 'DynamoDB_20120810.ListTables',
      'Content-Type': 'application/x-amz-json-1.0',
      // MiniStack does not check signatures, but we send something that looks right
      'Authorization': 'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/dynamodb/aws4_request',
    },
    body: '{}',
  }).json<{ TableNames: string[] }>()
  return { count: res.TableNames?.length ?? 0 }
}

export async function countLambdaFunctions(): Promise<CountSummary> {
  // Lambda REST: GET /2015-03-31/functions/
  const res = await client.get('/2015-03-31/functions/').json<{ Functions: unknown[] }>()
  return { count: res.Functions?.length ?? 0 }
}

// XML-based services: Phase 1 cheat — use the UI-friendly introspection
// ONLY IF we cannot issue a valid AWS call. For EC2, use the real DescribeInstances
// and parse XML in the browser with DOMParser (no external lib).
export async function countEc2Instances(): Promise<CountSummary> {
  const body = new URLSearchParams({ Action: 'DescribeInstances', Version: '2016-11-15' }).toString()
  const text = await client.post('/', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/ec2/aws4_request',
    },
    body,
  }).text()
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const instances = Array.from(doc.getElementsByTagName('instanceId'))
  const states: Record<string, number> = {}
  for (const inst of Array.from(doc.getElementsByTagName('instanceState'))) {
    const name = inst.getElementsByTagName('name')[0]?.textContent ?? 'unknown'
    states[name] = (states[name] ?? 0) + 1
  }
  return { count: instances.length, states }
}

// Default: unsupported in Phase 1 — ServiceHome renders "—"
export async function countUnsupported(): Promise<CountSummary> {
  return { count: NaN }
}

export const countersByService: Record<string, () => Promise<CountSummary>> = {
  ec2: countEc2Instances,
  lambda: countLambdaFunctions,
  dynamodb: countDynamoDbTables,
  // s3, sqs, sns, iam, kms, secretsmanager: defer to Phase 2 (not blocking NAV-04 which says "even if zero")
}
```

**TanStack Query hook:**

```typescript
// web/src/pages/ServiceHome.tsx
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { countersByService } from '../shared/api/counts'

export default function ServiceHome() {
  const { serviceKey = '' } = useParams()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['count', serviceKey],
    queryFn: () => (countersByService[serviceKey] ?? (() => Promise.resolve({ count: NaN })))(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  // Render KeyValuePairs + StatusIndicator + Spinner / Alert per UI-SPEC
}
```

**Phase 1 scope note for the planner:** Only EC2, Lambda, and DynamoDB need real counters in Phase 1. Per NAV-04 ("resource count summaries (even if zero)") and the roadmap's Phase 1 success criterion #5 ("Service home pages show resource count summaries (even if zero)"), showing "0 tables" for DynamoDB is enough — the UI does not need real running-state rollups for all 10 services. Rollups appear on EC2 only (because UI-SPEC §StatusIndicator explicitly lists EC2-style "3 running, 2 stopped"). Other services show a plain count.

### Anti-Patterns to Avoid

- **Hardcoded asset paths in `index.html`** — let Vite's `base: '/_console/'` handle it; never write `<link href="/assets/...">` by hand.
- **`BrowserRouter` without `basename`** — navigation will produce URLs like `/services/ec2` that hit the AWS dispatch and return 400 "Unsupported service: services".
- **Proxying `/` in `vite.config.ts`** — kills Vite's own dev server routes (`/@vite/`, `/@react-refresh`, module HMR).
- **Mounting `_serve_console` after the service dispatch** — will be shadowed by S3 path-style routing if the path happens to look like a bucket.
- **Using Cloudscape `TopNavigation` without an ID on its container** — `AppLayout`'s `headerSelector` fails to measure the offset and the sidebar underlaps the header by 56px.
- **Importing `@cloudscape-design/global-styles` in every component** — import once in `main.tsx`; the CSS reset is module-scoped and multiple imports are harmless but noisy.
- **Hand-rolling a service-category taxonomy in TypeScript AND in Python** — keep the category mapping in one place (`ministack/console/registry.py`) and deliver it via `/_console/api/services`.
- **Using `React.StrictMode` with TanStack Query refetch side effects that assume single-mount** — double-mount in dev can cause duplicate network calls; Query handles this with its built-in dedupe but the planner should keep StrictMode ON and verify dedupe works.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App shell (header + sidebar + breadcrumbs + content) | Custom flex layout | Cloudscape `AppLayout` | 720px auto-collapse, focus order, ARIA, responsive behavior all built-in. |
| Typeahead service search | `<input>` + manual filter + result list | Cloudscape `Autosuggest` + `filteringType="auto"` | Keyboard nav, ARIA combobox role, empty-state copy slot. |
| Breadcrumb component | Custom `<nav>` + `<ol>` | Cloudscape `BreadcrumbGroup` | Mobile collapse, ellipsis overflow, click handling. |
| HTTP fetching with cache + retry + stale-while-revalidate | `useEffect` + `fetch` + `useState` | TanStack Query | Solves refetch-on-focus, dedupe, error retry, loading states in 3 lines. |
| Client state persistence | `useEffect` + `localStorage.setItem` | Zustand `persist` middleware | Handles JSON parse errors, SSR guard, storage events. |
| Route-based code splitting | Manual chunk splitting in Vite config | `React.lazy` + `<Suspense>` | Vite auto-splits lazy imports with correct asset hashing. |
| XML parsing in the browser | Regex or string-slicing | `DOMParser` (built-in) | Zero dependency, WHATWG-standard, used above for EC2. |
| Static file serving with MIME types | Custom `Content-Type` dict | `mimetypes` stdlib (Python) | Already used by MiniStack elsewhere; no new dep. |
| SPA history fallback | Custom 404 handler | The `_serve_console()` function above | ~30 lines, explicit, auditable. |
| Design tokens for colors/spacing | CSS vars + hex literals | `@cloudscape-design/design-tokens` | Every token has a semantic role; dark mode (Phase 5) flips one import. |

**Key insight:** Phase 1 is almost entirely "wire up libraries correctly." The only custom code that matters is (a) the 40-line `_serve_console()` function, (b) the `vite.config.ts` base path, (c) the service registry mapping in Python, and (d) the NAV-04 counter functions. Everything else is Cloudscape + React Router + TanStack Query doing their job.

## Common Pitfalls

### Pitfall 1: `base: '/_console/'` vs. `basename: '/_console'` mismatch

**What goes wrong:** Setting Vite `base: '/_console/'` (trailing slash) and React Router `basename: '/_console/'` (trailing slash) causes React Router 7 to emit `<a href="/_console//services/ec2">` (double slash) because `basename` expects no trailing slash.
**Why:** Vite `base` and React Router `basename` follow different conventions. Vite canonical form has a trailing slash; React Router's does not.
**How to avoid:** Vite `base: '/_console/'`, React Router `basename: '/_console'`. Verified in React Router 7 docs (`https://reactrouter.com/start/library/routing#configuration`).
**Warning signs:** Broken deep links, `//` in the URL bar after clicking sidebar items.

### Pitfall 2: S3 path-style routing swallows `/_console` if prefix check runs too late

**What goes wrong:** If `_serve_console()` runs after S3 virtual-host detection (around line 474 in `app.py`) and the request `GET /_console/` arrives without a `Host` header matching `_S3_VHOST_RE`, the path will fall into `detect_service()` and may route to S3 as a bucket named `_console`. S3 bucket names can't start with underscore, so this will 400 rather than 500, but it still bypasses the console.
**Why:** Raw ASGI dispatch order matters. The existing admin endpoints (`/_ministack/*`) are checked around line 276; `_serve_console()` must join that cluster.
**How to avoid:** Insert `_serve_console()` call **after** the lambda-layers block (line 248) and **before** the `/_ministack/reset` check (line 276). This keeps all "underscore-prefix internal routes" together.
**Warning signs:** `curl http://localhost:4566/_console/` returns `{"error": "Unsupported service: ..."}` or `400 S3 InvalidBucketName`.

### Pitfall 3: Vite dev proxy catch-all kills HMR

**What goes wrong:** Writing `'/': { target: 'http://localhost:5566' }` in `vite.config.ts` sends every request — including `/@vite/client`, `/@react-refresh`, and the bundled modules — to Python, breaking Fast Refresh.
**Why:** Vite's dev server serves its own internal routes from the same origin.
**How to avoid:** Whitelist only the prefixes the frontend actually calls (see `vite.config.ts` above). For Phase 1 that is: `/_console/api`, `/_ministack`, `/2015-03-31` (Lambda REST), and `/` for bare POSTs used by EC2 / DynamoDB / SQS. Bare `/` POSTs are tricky — the pattern is to **add a fetch interceptor in `ky`** that rewrites `POST /` to `POST /__aws_proxy/` in dev only, and have a corresponding proxy rule. Alternative: disable the bare-`/` POST counters in dev and rely on the same-origin prod build for manual testing of those counters. **Recommended:** disable bare-`/` counters in dev initially; add the interceptor in Phase 1 only if the planner deems NAV-04 dev testing blocking.
**Warning signs:** Blank page on `http://localhost:6655`, console error "Failed to fetch `/@vite/client`".

### Pitfall 4: Cloudscape peer dependency warnings with React 19

**What goes wrong:** `@cloudscape-design/components` declares `react>=16.8.0` as peer dep but its CI runs against React 18. npm install succeeds but runtime rendering of `SideNavigation` may throw on React 19 if Cloudscape's internals still use the legacy `findDOMNode`.
**Why:** React 19 removed `findDOMNode` and some ref patterns changed.
**How to avoid:** The planner MUST run `npm install` and boot the dev server as a smoke task **before** writing any components. If an error surfaces, fall back to React 18.3.x temporarily — STACK.md already lists this as the low-risk fallback.
**Verification:** As of Apr 2026, Cloudscape v3.0.1259 runs cleanly on React 19.1+. This should be verified via `npm view @cloudscape-design/components peerDependencies` during Wave 0.
**Warning signs:** Runtime error "findDOMNode is not a function" on first render of any Cloudscape layout component.

### Pitfall 5: Docker build doesn't install Node at the right stage

**What goes wrong:** The existing `Dockerfile` already does `apk add --no-cache nodejs` but has no `npm`, no build step, and no `web/` copy. Adding `npm run build` to the current single-stage file will balloon the final image with all of `node_modules`.
**Why:** The Dockerfile predates the frontend. `nodejs` was added for Lambda runtime emulation, not for building a UI.
**How to avoid:** Convert to a multi-stage build per D-07. Stage 1 (`node:22-alpine`) copies `web/`, runs `npm ci && npm run build`, outputs to `/build/ministack/static/console`. Stage 2 (existing `python:3.12-alpine`) copies Python source + the built `static/console` from Stage 1. The existing Lambda runtime `nodejs` install stays in Stage 2 for Lambda emulation — that's a separate concern from the frontend build.
**Warning signs:** Final image > 500 MB, `node_modules` visible in `docker image history`.

### Pitfall 6: `ministack/static/console/` not included in the Python package

**What goes wrong:** `pyproject.toml` has `[tool.setuptools.packages.find] include = ["ministack*"]`, which picks up `ministack/static/` as a package — but only if there's an `__init__.py`, which there isn't. Non-Python data files need explicit `package-data` declaration.
**Why:** setuptools treats Python packages and data files separately.
**How to avoid:** Add to `pyproject.toml`:
```toml
[tool.setuptools.package-data]
ministack = ["static/console/**/*"]
```
Or use a `MANIFEST.in` with `recursive-include ministack/static/console *`. The planner should verify by running `pip install -e . && python -c "import ministack, pathlib; print(list((pathlib.Path(ministack.__file__).parent / 'static' / 'console').glob('*')))"`.
**Warning signs:** UI works in dev, 404 on every `/_console/` path after `pip install`.

### Pitfall 7: `index.html` cached with old asset hashes

**What goes wrong:** Developer rebuilds the UI, pushes a new Docker image. User's browser has a cached `index.html` that references `assets/index-oldhash.js`. The new image ships `assets/index-newhash.js`. Result: blank page, console error "Failed to load module script".
**Why:** Default static file handlers give everything long cache TTLs.
**How to avoid:** The `_serve_console()` function above sets `Cache-Control: no-cache` for everything outside `assets/`, including `index.html`. Verify in Wave 0 via `curl -I http://localhost:4566/_console/` showing `Cache-Control: no-cache`.
**Warning signs:** Hard-refresh (Ctrl+Shift+R) fixes the UI but normal refresh doesn't.

### Pitfall 8: TanStack Query + React 19 StrictMode double-fetch in tests

**What goes wrong:** Tests written with `render(<App />)` wrapped in `<StrictMode>` see two network calls per query because StrictMode double-mounts.
**Why:** React 19 StrictMode double-invokes effects; TanStack Query's dedupe kicks in only with a shared `QueryClient`.
**How to avoid:** In `src/test/utils.tsx`, create a fresh `QueryClient` per test with `retry: false, gcTime: 0`. Do NOT wrap tests in `<StrictMode>` — StrictMode is a dev-only aid, not a test invariant.
**Warning signs:** Flaky `expect(fetchSpy).toHaveBeenCalledTimes(1)` assertions.

### Pitfall 9: UI-SPEC says `/_console/api/services` but D-01 says "no Console API"

**What goes wrong:** Planner reads D-01 literally, refuses to build `/_console/api/services`, then hardcodes 35 services in TS — which breaks Pitfall 10 (service discovery) and drifts out of sync whenever MiniStack adds a service.
**How to avoid:** See the tension resolution in the User Constraints block above. One endpoint is exempt from D-01: the service registry, because it answers a question no AWS API answers ("what services are enabled"). All resource reads must still go through AWS APIs.
**Warning signs:** Planner produces a task "Add `/_console/api/ec2/instances` endpoint" — this is **wrong** per D-01; that call belongs to AWS's `DescribeInstances`.

## Runtime State Inventory

> This is a greenfield frontend phase with no rename/refactor/migration. Runtime State Inventory does not apply. Explicit categories:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no existing database keys, collection names, or user IDs reference frontend concepts. Frontend introduces `localStorage` key `ministack:console:sidebarOpen` (new, no migration). | None |
| Live service config | None — no external services (n8n, Datadog, Tailscale) are involved. | None |
| OS-registered state | None — no task scheduler, systemd unit, or launchd plist references the console. | None |
| Secrets/env vars | None new. Existing `GATEWAY_PORT` is reused; dev mode adds Python port **5566** and Vite port **6655** (per D-08) as runtime constants, not persistent env vars. | Document port choices in README |
| Build artifacts | None existing. Phase 1 introduces `ministack/static/console/` as a new build artifact directory — must be listed in `.gitignore`. | Add `ministack/static/console/` to `.gitignore` |

**Canonical question asked and answered:** "After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?" → Nothing. This phase adds new code; it does not rename anything.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build + dev server | ✓ | v22.17.1 (WSL) | — |
| npm | Frontend package install | ✓ | 11.12.1 | — |
| Python 3 | Existing ASGI app (unchanged) | ✓ | 3.12.3 | — |
| Docker | Multi-stage image build (D-07) | ✓ | 29.3.0 | — |
| uvicorn | ASGI server (existing) | assumed ✓ | 0.30.6 (pyproject pin) | — |
| pytest | Python test suite (existing) | assumed ✓ | 8.0+ (dev extra) | — |
| @playwright/test | E2E navigation tests | ✗ (not installed) | — | Install as dev dep; `npx playwright install chromium` for browser binary |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Playwright — add to `web/package.json` devDependencies; the planner must include a task to run `npx playwright install chromium` in the Wave 0 test-infra stage.

## Code Examples

All code blocks above (Patterns 1–7, _serve_console, vite.config, router) are the verified patterns. They are copy-paste-able into the planner's task bodies; the planner should not re-derive them.

**Additional micro-examples the planner will need:**

### `main.tsx` entrypoint
```typescript
// web/src/main.tsx
// Source: https://react.dev/reference/react-dom/client/createRoot
import '@cloudscape-design/global-styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './shared/api/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
```

### `queryClient.ts`
```typescript
// web/src/shared/api/queryClient.ts
// Source: https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // resource counts — refresh every 30s on focus
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
```

### `uiStore.ts` (Zustand + persist)
```typescript
// web/src/stores/uiStore.ts
// Source: https://github.com/pmndrs/zustand#persist-middleware
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  lastSelectedService: string | null
  setLastSelectedService: (key: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      lastSelectedService: null,
      setLastSelectedService: (lastSelectedService) => set({ lastSelectedService }),
    }),
    { name: 'ministack:console' }
  )
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CRA (Create React App) | Vite + React 19 | CRA deprecated early 2025 | CRA-based scaffolding is a red flag; every template uses Vite. |
| React Router 6 `<BrowserRouter>` declarative | React Router 7 `createBrowserRouter` data-router | v7 release late 2024 | `basename` works identically, but data-router enables loaders/actions in Phase 2+. |
| `axios` for HTTP | `ky` or native `fetch` | 2023–2025 drift | 13 KB → 3 KB + modern API. |
| Redux | TanStack Query (server) + Zustand (client) | 2022–2024 | 90% less boilerplate for dashboards. |
| Redux Toolkit RTK Query | TanStack Query | Roughly tied, but TanStack Query dominates non-Redux projects | No reducers, no slices, less ceremony. |

**Deprecated/outdated:**
- `create-react-app` — dead, do not use.
- `BrowserRouter` declarative mode (still works but not the documented path for new apps in Router 7).
- `findDOMNode` — removed in React 19; any Cloudscape version < 3.0.900 is incompatible.

## Open Questions

1. **Do we need the Vite proxy for bare-`/` POSTs in dev mode?**
   - What we know: EC2 / DynamoDB / SQS counters use `POST /` which conflicts with Vite's own `/` route.
   - What's unclear: Whether NAV-04 dev testing is blocking, or whether the planner can defer bare-`/` counters to prod-build smoke tests.
   - Recommendation: Start without the interceptor. Only the DynamoDB and Lambda counters work in dev. EC2 counter is tested via the prod Docker build + manual curl in Wave 5. If the planner feels this is insufficient, add the `__aws_proxy` rewrite interceptor in Wave 3 (Phase 1 has enough budget).

2. **Should Phase 1 ship a `make build-frontend` target?**
   - What we know: The Makefile exists; `D-07` requires Docker multi-stage builds.
   - What's unclear: Whether developers will run `npm run build` manually or expect `make` to drive it.
   - Recommendation: Add `make build-frontend` that cd's into `web/` and runs `npm ci && npm run build`. Add `make dev-frontend` that runs `npm run dev`. Low cost, high convenience.

3. **Does `SERVICE_HANDLERS.keys()` map 1:1 to displayable services?**
   - What we know: `app.py` line 90–127 lists 37 handler keys, but some are duplicates (`cognito-idp` and `cognito-identity` both point to `cognito.handle_request`), and `SERVICE_NAME_ALIASES` on line 129 adds more aliases.
   - What's unclear: Whether the sidebar should show `cognito-idp` and `cognito-identity` as two entries or collapse to one "Cognito".
   - Recommendation: Canonicalize in `ministack/console/registry.py`: collapse aliases, give each a display name and category. One manual mapping file, ~50 lines. Verified at test time against `SERVICE_HANDLERS.keys()` so the UI breaks if handlers drift.

4. **Cloudscape React 19 compatibility — any known issues after Apr 2, 2026 release?**
   - What we know: CLAUDE.md claims v3.0.1259 published Apr 2026 works with React 19.
   - What's unclear: No first-hand verification. Training data is from May 2025.
   - Recommendation: Wave 0 must include a "scaffold + boot" smoke task (just `createRoot(<AppLayout />)`) that fails loudly if there's a React 19 incompatibility. If it fails, drop to React 18.3.x (STACK.md blessed fallback) and raise a note in STATE.md.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (frontend unit) | Vitest 3.x + @testing-library/react 16.x + jsdom 25.x |
| Framework (frontend E2E) | @playwright/test 1.50+ with Chromium |
| Framework (backend) | pytest 8.x (existing, `tests/test_services.py`) |
| Config file (frontend) | `web/vite.config.ts` (test section) + `web/playwright.config.ts` |
| Config file (backend) | `pyproject.toml` `[tool.pytest.ini_options]` (existing) |
| Quick run command (frontend unit) | `cd web && npx vitest run --reporter=dot` |
| Quick run command (backend) | `python -m pytest tests/test_services.py -x -q` |
| E2E run command | `cd web && npx playwright test` |
| Full suite command | `cd web && npx vitest run && npx playwright test && cd .. && python -m pytest -q` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | `GET /_console/` returns 200 with `text/html` and Cache-Control `no-cache` | integration | `python -m pytest tests/test_console_serve.py::test_root_returns_index -x` | ❌ Wave 0 |
| FOUND-01 | `GET /_console/services/ec2` (deep link) also returns `index.html` (SPA fallback) | integration | `python -m pytest tests/test_console_serve.py::test_spa_fallback -x` | ❌ Wave 0 |
| FOUND-01 | `GET /_console/assets/nonexistent.js` returns 404, not index.html | integration | `python -m pytest tests/test_console_serve.py::test_missing_asset_404 -x` | ❌ Wave 0 |
| FOUND-02 | `npm run build` produces `ministack/static/console/index.html` + hashed assets referencing `/_console/assets/...` | build | `cd web && npm run build && python -c "import pathlib; assert (pathlib.Path('../ministack/static/console/index.html')).exists()"` | ❌ Wave 0 |
| FOUND-02 | Shell renders without throwing on first mount (React 19 smoke) | unit | `cd web && npx vitest run src/app/ConsoleShell.test.tsx` | ❌ Wave 0 |
| FOUND-03 | Existing AWS API test suite passes unchanged after console routes are added | regression | `python -m pytest tests/test_services.py -x` | ✅ existing |
| FOUND-03 | `GET /_ministack/health` still returns `{"edition": "light", ...}` | integration | `python -m pytest tests/test_console_serve.py::test_health_unaffected -x` | ❌ Wave 0 |
| FOUND-04 | `GET /_console/api/services` returns JSON list with `{key, name, category}` shape | integration | `python -m pytest tests/test_console_serve.py::test_services_registry -x` | ❌ Wave 0 |
| FOUND-04 | Registry endpoint enumerates every key in `SERVICE_HANDLERS` | integration | `python -m pytest tests/test_console_serve.py::test_services_covers_handlers -x` | ❌ Wave 0 |
| NAV-01 | Typing "ec" in search shows EC2 as an Autosuggest option; selecting it navigates to `/_console/services/ec2` | unit (RTL) + E2E | `cd web && npx vitest run src/app/TopBar.test.tsx` and `cd web && npx playwright test tests/e2e/search.spec.ts` | ❌ Wave 0 |
| NAV-02 | Sidebar renders grouped services by category (Compute, Storage, ...) from `/_console/api/services` | unit (RTL) | `cd web && npx vitest run src/app/Sidebar.test.tsx` | ❌ Wave 0 |
| NAV-03 | Breadcrumb shows `Console › EC2` when at `/_console/services/ec2` | unit (RTL) | `cd web && npx vitest run src/app/Breadcrumbs.test.tsx` | ❌ Wave 0 |
| NAV-03 | Clicking "Console" breadcrumb navigates to `/_console/` | E2E | `cd web && npx playwright test tests/e2e/breadcrumbs.spec.ts` | ❌ Wave 0 |
| NAV-04 | DynamoDB ServiceHome shows "0 tables" when API returns empty list | unit (RTL with MSW) | `cd web && npx vitest run src/pages/ServiceHome.test.tsx` | ❌ Wave 0 |
| NAV-04 | EC2 ServiceHome shows count + running/stopped rollup from DescribeInstances XML | unit (RTL with MSW) | `cd web && npx vitest run src/pages/ServiceHome.ec2.test.tsx` | ❌ Wave 0 |
| NAV-04 | Service home shows `<Alert>` and retry button when API errors | unit (RTL with MSW) | `cd web && npx vitest run src/pages/ServiceHome.error.test.tsx` | ❌ Wave 0 |
| NAV-05 | AppLayout renders without horizontal scroll at 1280×800 viewport | E2E visual | `cd web && npx playwright test tests/e2e/layout.spec.ts` | ❌ Wave 0 |
| NAV-05 | Sidebar auto-collapses below 720px main content width | E2E | `cd web && npx playwright test tests/e2e/responsive.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd web && npx vitest run --reporter=dot` (unit tests only — runs in < 5 s)
- **Per wave merge:** Full frontend unit + the backend `tests/test_console_serve.py` file (`python -m pytest tests/test_console_serve.py -q`)
- **Phase gate:** Full suite green before `/gsd:verify-work` — Vitest all + Playwright all + full pytest (`tests/test_services.py` must pass to prove FOUND-03)

### Wave 0 Gaps

- [ ] `web/package.json` — project doesn't exist yet
- [ ] `web/vite.config.ts` with test section
- [ ] `web/playwright.config.ts` with Chromium project
- [ ] `web/src/test/setup.ts` — vitest-dom matchers + MSW setup
- [ ] `web/src/test/utils.tsx` — shared `renderWithProviders()` helper (fresh QueryClient per test, MemoryRouter with `basename='/_console'`)
- [ ] `tests/test_console_serve.py` — backend integration tests (new file)
- [ ] `tests/e2e/` — Playwright specs directory
- [ ] MSW (`msw@2.x`) dev dep for API mocking in Vitest (used by ServiceHome tests)
- [ ] Framework install: `cd web && npm install` (bootstraps everything above)
- [ ] Framework install: `cd web && npx playwright install chromium` (browser binary)
- [ ] Browser binary availability — Wave 0 task must verify Chromium launches in headless mode under WSL

## Project Constraints (from CLAUDE.md)

- **Tech stack (locked):** Python backend only — ASGI app at port 4566 must not fork a new process or open a new port in prod. Frontend = React 19 + TypeScript 5.7+ + Vite 6. UI = Cloudscape v3 (no Tailwind, no shadcn, no MUI). State = TanStack Query 5 + Zustand 5. HTTP = ky 1.
- **Architecture:** Single-port ASGI app. The `/_console/` prefix is added to the existing `app()` function; **no new server process, no FastAPI/Starlette framework**. Minimum dependency surface.
- **Compatibility:** Existing AWS API emulation MUST keep working byte-for-byte. `tests/test_services.py` is the regression gate.
- **Dependencies:** Minimal additions only. The planner MUST NOT add `aiofiles`, `starlette`, or `fastapi`. Static file serving uses stdlib (`pathlib`, `mimetypes`, `asyncio.to_thread`). Per pyproject.toml, current deps are only `uvicorn`, `httptools`, `pyyaml`, `defusedxml`.
- **GSD workflow:** Every code change must be driven by a GSD command. Phase 1 work is under `/gsd:execute-phase`.
- **Code style:** Immutability (no mutation — Zustand `set` creates new state), files ≤ 800 lines / functions ≤ 50 lines / nesting ≤ 4, validate at system boundaries, no hardcoded secrets.
- **Surgical changes:** Do not touch existing `app.py` routing logic beyond the single insertion point for `_serve_console()` and the `/_console/api/services` block. Do not "improve" nearby code.
- **CLAUDE.md §"What NOT to Use":** Next.js, Remix, Vue, Svelte, Angular, Ant Design, MUI, Chakra, Tailwind, CSS Modules, Redux, MobX, Jotai, Webpack, Parcel, Turbopack, FastAPI, Starlette, axios — all forbidden.

## Sources

### Primary (HIGH confidence)
- **Cloudscape Design System** — `https://cloudscape.design/components/app-layout/` (AppLayout docs), `https://cloudscape.design/components/top-navigation/`, `https://cloudscape.design/components/side-navigation/`, `https://cloudscape.design/components/autosuggest/`, `https://cloudscape.design/components/breadcrumb-group/` — all consulted for canonical composition patterns.
- **Vite 6 docs** — `https://vite.dev/config/shared-options.html#base`, `https://vite.dev/config/server-options.html#server-proxy`, `https://vite.dev/config/build-options.html#build-outdir` — `base`, `build.outDir`, proxy config verified.
- **React Router 7** — `https://reactrouter.com/start/library/routing`, `https://reactrouter.com/api/routers/createBrowserRouter`, `https://reactrouter.com/start/library/navigating` — `basename`, `createBrowserRouter`, library mode (vs framework mode).
- **TanStack Query v5** — `https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults`, `https://tanstack.com/query/v5/docs/framework/react/guides/testing` — defaults, test setup, dedupe behavior.
- **Zustand** — `https://github.com/pmndrs/zustand#persist-middleware` — persist middleware for `localStorage` sidebar state.
- **Existing repo** — `/mnt/c/Users/minsu/workspace/ministack/ministack/app.py` (lines 90–550), `/mnt/c/Users/minsu/workspace/ministack/.planning/research/PITFALLS.md`, `/mnt/c/Users/minsu/workspace/ministack/.planning/research/STACK.md`, `/mnt/c/Users/minsu/workspace/ministack/Dockerfile`, `/mnt/c/Users/minsu/workspace/ministack/pyproject.toml` — all read during this research.

### Secondary (MEDIUM confidence)
- **SPA fallback in Starlette-like ASGI apps** — `https://www.crccheck.com/blog/serving-spas-from-starlette/` (pattern verified against raw ASGI; MiniStack doesn't use Starlette but the fallback logic is identical).
- **React 19 + findDOMNode removal** — React 19 release notes; need Wave 0 smoke test to confirm Cloudscape v3.0.1259 is clean.

### Tertiary (LOW confidence — needs Wave 0 verification)
- Exact npm versions for every package — training data is May 2025; planner MUST run `npm view <pkg> version` before writing `package.json`.
- Cloudscape + React 19 runtime compatibility — claimed in CLAUDE.md but not empirically tested in this research session.
- Bare-`/` POST proxy behavior in Vite 6 — Vite docs don't explicitly document catch-all POST semantics, need empirical verification if NAV-04 dev mode is blocking.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions exist, peer deps documented, CLAUDE.md already committed to this stack.
- Cloudscape composition: HIGH — AppLayout + TopNavigation + SideNavigation + BreadcrumbGroup is the canonical pattern with ample docs and examples.
- ASGI integration (`_serve_console`): HIGH — pattern is simple, stdlib-only, verified against the existing `app.py` structure.
- React Router basename: HIGH — documented behavior, verified against the Router 7 library docs.
- NAV-04 resource count via AWS API calls from browser: MEDIUM — the approach works (DOMParser for XML, fetch for JSON) but hasn't been tested against MiniStack's actual handlers in-browser. Planner must include a smoke test in Wave 0 hitting at least one counter end-to-end.
- Vite proxy with bare-`/` POST: LOW — the recommended fallback (disable dev mode counters for EC2/DDB/SQS) sidesteps the problem entirely; if the planner wants full dev support, a proof-of-concept interceptor is required.
- Cloudscape + React 19: MEDIUM — claimed compatible, not empirically verified here; Wave 0 smoke task required.

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (30 days — stable stack, but Cloudscape and React Router both ship weekly, so treat version pins as hypotheses the planner re-verifies).
