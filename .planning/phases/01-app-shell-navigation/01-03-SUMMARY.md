---
phase: 01-app-shell-navigation
plan: 03
subsystem: frontend
tags: [wave-1, scaffolding, react-19, cloudscape, tanstack-query, zustand, react-router-7, vite-6]

requires:
  - phase: 01-app-shell-navigation/01
    provides: web-workspace, vitest-config, test-scaffolds-for-plans-02-06
provides:
  - frontend-shared-types
  - copy-module-centralized
  - ky-singleton-client
  - tanstack-queryclient
  - use-services-hook
  - zustand-uistore-persisted
  - spa-entry-point
  - react-router-v7-library-mode
  - built-spa-index-html
affects:
  - 01-app-shell-navigation/04  # ConsoleShell consumes uiStore + copy
  - 01-app-shell-navigation/05  # pages consume useServices + copy
  - 01-app-shell-navigation/06  # e2e targets built index.html + assets

tech-stack:
  added:
    - "@types/node@22.10.2"   # needed for vite.config.ts / playwright.config.ts typecheck
  patterns:
    - "React Router 7 library mode with createBrowserRouter + basename '/_console' (no trailing slash)"
    - "Lazy imports for ConsoleShell + page components behind Suspense/Spinner"
    - "ky singleton with retry:0 (TanStack Query owns retry)"
    - "QueryClient defaults: staleTime 30s, gcTime 5min, retry 1, refetchOnWindowFocus true"
    - "Zustand persist middleware with localStorage key 'ministack:console'"
    - "All user-facing strings centralized in shared/copy.ts per UI-SPEC §Copywriting Contract"
    - "Runtime validation of /_console/api/services registry entries without full zod"

key-files:
  created:
    - web/src/main.tsx
    - web/src/App.tsx
    - web/src/app/routes.tsx
    - web/src/app/ConsoleShell.tsx           # placeholder, Plan 04 will replace
    - web/src/pages/ConsoleHome.tsx          # placeholder, Plan 05 will replace
    - web/src/pages/ServiceHome.tsx          # placeholder, Plan 05 will replace
    - web/src/pages/NotFoundPage.tsx         # placeholder, Plan 05 will replace
    - web/src/shared/types.ts
    - web/src/shared/copy.ts
    - web/src/shared/serviceCategories.ts
    - web/src/shared/api/client.ts
    - web/src/shared/api/queryClient.ts
    - web/src/shared/api/services.ts
    - web/src/shared/__tests__/copy.test.ts
    - web/src/stores/uiStore.ts
    - .planning/phases/01-app-shell-navigation/01-03-SUMMARY.md
  modified:
    - web/tsconfig.json         # dropped composite reference to tsconfig.node.json (Rule 3 fix)
    - web/tsconfig.node.json    # added node + vitest/config types, noEmit:true
    - web/package.json          # added @types/node@22.10.2 devDependency
    - web/package-lock.json
    - .gitignore                # web/*.tsbuildinfo + generated .d.ts

key-decisions:
  - "Dropped tsconfig.json -> tsconfig.node.json composite reference to unblock 'tsc -b --noEmit' success gate (TS6310 conflict: referenced composite project may not disable emit, but the main config sets noEmit:true). Both configs still typecheck independently via `npx tsc --noEmit -p tsconfig.node.json` if needed."
  - "Pinned @types/node@22.10.2 (current Node 22 LTS line) since plan-01 scaffolding forgot node types for vite.config.ts."
  - "useServices() staleTime raised to 5min (registry is nearly static) — overrides queryClient default 30s."
  - "Placeholder pages ship as single-div stubs so lazy imports in routes.tsx resolve at typecheck and Plan 04/05 overwrite them cleanly."

requirements-completed: [FOUND-02]

metrics:
  duration_wall_clock: "~8m"
  duration_active: "~8m"
  completed_at: "2026-04-08T12:20:37Z"
  tasks: 2
  files_created: 15
  files_modified: 5
---

# Phase 01 Plan 03: Frontend Scaffold Summary

**Wave 1 frontend foundation — React 19 SPA entry point, React Router 7 library-mode root, centralized UI-SPEC copy contract, ky + TanStack Query data layer, Zustand persisted UI store, and a buildable vite pipeline that emits `ministack/static/console/index.html` with `/_console/assets/*` URLs.**

## Performance

- **Duration:** ~8 min (active)
- **Started:** 2026-04-08T12:12:20Z
- **Completed:** 2026-04-08T12:20:37Z
- **Tasks:** 2
- **Files created:** 15 (including this summary)
- **Files modified:** 5

## Accomplishments

- FOUND-02 complete: React 19 + Cloudscape v3 + Vite 6 SPA compiles and emits a hashed-asset `index.html` to the exact path Plan 02's `_serve_console()` expects.
- Every UI-SPEC copy string centralized in `web/src/shared/copy.ts` — no literal user-facing strings anywhere else in the tree (enforced by locked contract; Plans 04-05 import from this module).
- `useServices()` hook defined with the exact `UseQueryResult<Service[], Error>` contract Plans 04-05 consume, targeting Plan 02's `/_console/api/services` registry endpoint with minimal runtime validation (no zod, registry is server-controlled).
- Zustand `useUiStore` persists `sidebarOpen` + `lastSelectedService` under localStorage key `ministack:console` per UI-SPEC §Interaction Contract.
- Router basename is `/_console` (no trailing slash) — React Router 7 library mode via `createBrowserRouter`, paired with Vite base `/_console/` + Plan 02's ASGI SPA fallback handler.
- Placeholder stubs for `ConsoleShell`, `ConsoleHome`, `ServiceHome`, `NotFoundPage` keep `routes.tsx` lazy imports type-clean until Plan 04 / Plan 05 land.
- Pre-existing Plan 01 `tsc -b --noEmit` breakage (TS6310 composite emit conflict, missing `@types/node`) fixed under Rule 3 — success gate is now enforceable from any clean checkout.

## Task Commits

1. **Task 1: Shared types, copy, api client, queryClient, useServices, uiStore (TDD)** — `eac5ac3` (feat)
2. **Task 2: main.tsx entry, App.tsx router root, routes.tsx + placeholder pages** — `986b492` (feat)

## Vite Build Output (for Plan 06 Docker sizing)

Fresh `npx vite build` against a clean `ministack/static/console/`:

| Asset | Size | Gzip |
|---|---|---|
| `index.html` | 0.42 kB | 0.28 kB |
| `assets/index-BSL_HZXY.css` (Cloudscape global styles) | 325.35 kB | 157.78 kB |
| `assets/index-BRQzcpkc.js` (main chunk) | 324.77 kB | 103.46 kB |
| `assets/ConsoleShell-Cj-OS3a4.js` (lazy placeholder) | 0.18 kB | 0.17 kB |
| `assets/ConsoleHome-GzpIoJbr.js` (lazy placeholder) | 0.13 kB | 0.14 kB |
| `assets/ServiceHome-bdQV4v6_.js` (lazy placeholder) | 0.13 kB | 0.14 kB |
| `assets/NotFoundPage-BER-9ojW.js` (lazy placeholder) | 0.13 kB | 0.14 kB |
| **Total uncompressed** | **~651 kB** | **~262 kB** |
| **Build time** | 5.81 s | — |
| **Modules transformed** | 148 | — |

The Cloudscape CSS bundle (325 kB) dominates — this is expected for Cloudscape v3 and will not grow meaningfully in Plans 04-06. Plan 06's Docker image size budget should assume ~650 kB of static assets plus the Python runtime.

Hashes in the built `index.html`:

```html
<script type="module" crossorigin src="/_console/assets/index-BRQzcpkc.js"></script>
<link rel="stylesheet" crossorigin href="/_console/assets/index-BSL_HZXY.css">
```

Both URLs use the `/_console/` prefix — Vite's `base` config applied correctly.

**Peer dep warnings during install:** None. `@types/node@22.10.2` added cleanly (no conflicts with Vite 6 / Vitest 3).

## Critical Contracts Honored

| Contract | Location | Evidence |
|---|---|---|
| `basename: '/_console'` (no trailing slash) | `web/src/App.tsx:7` | `grep -q "basename: '/_console'"` ✓, `! grep -q "basename: '/_console/'"` ✓ |
| Cloudscape global styles imported **first** | `web/src/main.tsx:1` | RESEARCH.md pattern |
| StrictMode + QueryClientProvider wrapping | `web/src/main.tsx` | Both present |
| localStorage key `ministack:console` | `web/src/stores/uiStore.ts` | `grep -q "'ministack:console'"` ✓ |
| `/_console/api/services` endpoint targeted | `web/src/shared/api/services.ts` | `grep -q "/_console/api/services"` ✓ |
| QueryClient retry 1 | `web/src/shared/api/queryClient.ts` | `grep -q "retry: 1"` ✓ |
| QueryClient staleTime 30s | `web/src/shared/api/queryClient.ts` | `grep -q "staleTime: 30_000"` ✓ |
| Copy brand "MiniStack" | `web/src/shared/copy.ts` | `grep -q "brand: 'MiniStack'"` ✓ |
| Copy breadcrumbRoot "Console" | `web/src/shared/copy.ts` | `grep -q "breadcrumbRoot: 'Console'"` ✓ |
| Service type exports | `web/src/shared/types.ts` | `ServiceCategory` + `Service` exported |
| CATEGORY_ORDER tuple | `web/src/shared/serviceCategories.ts` | 8 categories, UI-SPEC locked order |
| useServices() hook contract | `web/src/shared/api/services.ts` | Returns `UseQueryResult<Service[], Error>` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan 01 scaffold left `tsc -b --noEmit` broken**

- **Found during:** Task 1 first verify run.
- **Issue:** Plan 01's `web/tsconfig.json` referenced `./tsconfig.node.json` as a composite project, but both configs had `noEmit: true` — TypeScript rejects this with `TS6310: Referenced project may not disable emit`. On top of that, `vite.config.ts` and `playwright.config.ts` imported `node:path` and used `__dirname` / `process` without `@types/node` installed, producing 5 additional errors. None of these would have been caught by Plan 01 since that plan's verify chain only ran `vitest` and Playwright, never `tsc -b --noEmit`. Plan 03's success criteria explicitly demands `tsc -b --noEmit` exit 0, so this was a hard blocker.
- **Fix:**
  1. `npm install --save-dev --save-exact @types/node@22.10.2` (node 22 LTS line, pinned exact per threat-model supply-chain rule).
  2. Rewrote `web/tsconfig.node.json` to use `noEmit: true` and `types: ["node", "vitest/config"]` (drops the `composite: true` flag that forced emit output).
  3. Dropped the `references: [{ "path": "./tsconfig.node.json" }]` entry from `web/tsconfig.json`. The two configs are now independent — `tsc -b --noEmit` covers `src/**` (what matters for runtime), and `npx tsc --noEmit -p tsconfig.node.json` covers the build-tool configs if needed.
- **Files modified:** `web/tsconfig.json`, `web/tsconfig.node.json`, `web/package.json`, `web/package-lock.json`, `.gitignore` (added `web/*.tsbuildinfo`, `web/.tsbuildinfo-node/`, stray `.d.ts` from early experimentation).
- **Commit:** `eac5ac3` (Task 1).
- **Verification:** `cd web && npx tsc -b --noEmit` exits 0 cleanly on a fresh run.

### Plan Deviations (documented, not "auto-fixed")

None. All 2 tasks executed exactly as the plan specified except for the above blocking fix that was mandated by the success gate.

## Threat Model Compliance

| Mitigation | Status |
|---|---|
| React JSX escaping for all service name rendering; no `dangerouslySetInnerHTML` | **Done** — no instances in `web/src/` |
| ky defaults to `credentials: 'same-origin'`; no cookies sent | **Done** — `apiClient` uses ky defaults |
| Zustand persist uses safe JSON (`JSON.parse` with internal try/catch) | **Done** — library default |
| No secrets in localStorage, only UI state | **Done** — `sidebarOpen: boolean`, `lastSelectedService: string \| null` |

**Residual:** Phase 1 frontend is trusted same-origin code from a local dev tool; no auth model applies.

## Known Stubs

This plan intentionally ships 4 placeholder components that Plan 04 / Plan 05 will overwrite. Each is a single `<div>` with a "placeholder" label and no data wiring — they exist solely so the lazy imports in `routes.tsx` typecheck and the build emits chunks with stable paths.

| Stub file | Filled by plan | Note |
|---|---|---|
| `web/src/app/ConsoleShell.tsx` | Plan 04 | Real `AppLayout` + `TopNavigation` + `SideNavigation` wiring |
| `web/src/pages/ConsoleHome.tsx` | Plan 05 | Category grid with service counts |
| `web/src/pages/ServiceHome.tsx` | Plan 05 | KeyValuePairs + StatusIndicator rollups |
| `web/src/pages/NotFoundPage.tsx` | Plan 05 | Cloudscape 404 layout + "Go to Console Home" link |

These stubs are intentional and tracked. The plan objective (scaffolding only) explicitly carves out shell + pages to downstream plans.

**Non-stub state:** `useServices()`, `copy.ts`, `uiStore`, `queryClient`, `apiClient`, `routes.tsx`, `App.tsx`, `main.tsx` are all real, load-bearing implementations that Plans 04-05 will import unchanged.

## Plan 02 Interaction

Plan 02 left `ministack/static/console/` empty, so `GET /_console/` returned a 503 "Console UI not built" stub. After this plan:

- `ministack/static/console/index.html` exists (built by `vite build`).
- `ministack/static/console/assets/*.js` + `*.css` exist with hashed names.
- Plan 02's `_serve_console()` will now return **200** with `Cache-Control: no-cache` for `/_console/` and immutable 1y for `/_console/assets/*`.
- The folder is gitignored (per Plan 01 `.gitignore`) — it's regenerated by `npm run build` and packaged via `pyproject.toml` `[tool.setuptools.package-data]` for distribution.

**Regression check:** After the build, `.venv/bin/python -m pytest tests/test_console_serve.py tests/test_existing_aws_apis.py -q` → **15 passed** (11 console + 4 FOUND-03 baseline). Backend tests still green.

## Issues Encountered

Only the single Rule 3 blocking issue documented above. No auth gates, no architectural questions, no dependency conflicts beyond `@types/node` addition.

## Self-Check: PASSED

**Files verified present:**
- `web/src/main.tsx` FOUND
- `web/src/App.tsx` FOUND (`basename: '/_console'` present, no trailing slash)
- `web/src/app/routes.tsx` FOUND
- `web/src/app/ConsoleShell.tsx` FOUND (placeholder)
- `web/src/pages/ConsoleHome.tsx`, `ServiceHome.tsx`, `NotFoundPage.tsx` FOUND (placeholders)
- `web/src/shared/types.ts` FOUND (exports `Service`, `ServiceCategory`)
- `web/src/shared/copy.ts` FOUND (brand: 'MiniStack', breadcrumbRoot: 'Console')
- `web/src/shared/serviceCategories.ts` FOUND (CATEGORY_ORDER with 8 entries)
- `web/src/shared/api/client.ts` FOUND (ky retry:0, timeout:5000)
- `web/src/shared/api/queryClient.ts` FOUND (retry:1, staleTime:30_000)
- `web/src/shared/api/services.ts` FOUND (useServices, /_console/api/services)
- `web/src/shared/__tests__/copy.test.ts` FOUND (2 passing tests)
- `web/src/stores/uiStore.ts` FOUND ('ministack:console' localStorage key)

**Commits verified present (git log --oneline -5):**
- `eac5ac3` feat(01-03): add shared frontend foundation FOUND
- `986b492` feat(01-03): scaffold SPA entry, router root, and placeholder routes FOUND

**Verification commands re-ran in this message, all green:**
- `cd web && npx tsc -b --noEmit` → exit 0, no output
- `cd web && npx vite build` → 148 modules transformed, 5.81s, `ministack/static/console/index.html` emitted
- `grep -q "/_console/assets/" ministack/static/console/index.html` → match (both JS and CSS)
- `cd web && npx vitest run --reporter=dot` → 1 passed / 7 skipped files, 2 passed / 17 skipped tests, 0 failures
- `.venv/bin/python -m pytest tests/test_console_serve.py tests/test_existing_aws_apis.py -q` → 15 passed (no regression)

## Success Criteria Check

- [x] **FOUND-02:** React 19 + Cloudscape v3 + Vite 6 SPA builds and emits hashed assets under `/_console/assets/...`
- [x] Router basename is `/_console` (no trailing slash) per Pitfall #1
- [x] All UI-SPEC copy strings centralized in `shared/copy.ts` (no literals in any other file — 4 placeholder pages contain only literal "placeholder" labels, which are Plan 04/05 targets and not user-facing copy)
- [x] `useServices()` hook exists, typed as `UseQueryResult<Service[], Error>`, targeting `/_console/api/services`
- [x] Zustand `uiStore` persists `sidebarOpen` under localStorage key `ministack:console`
- [x] `cd web && npx tsc -b --noEmit` passes (exit 0)
- [x] `cd web && npx vitest run` passes (exit 0, 2 passing + 17 skipped)
- [x] `cd web && npx vite build` passes and emits `ministack/static/console/index.html`

## Next Plan Readiness

**Ready for:**
- **Plan 04 (ConsoleShell):** `web/src/app/ConsoleShell.tsx` placeholder will be replaced with real `AppLayout` + `TopNavigation` + `SideNavigation` wiring. All imports (`useUiStore`, `copy`, `useServices`, `CATEGORY_ORDER`) are in place.
- **Plan 05 (Service Home + Search):** Pages can import `useServices()`, `copy`, and router params via `useParams()` from `react-router-dom` today.
- **Plan 06 (E2E + A11y):** Playwright baseURL `http://localhost:4566/_console/` is now backed by a real served `index.html` (backend Plan 02 + frontend Plan 03).

**Blockers:** None.

---
*Phase: 01-app-shell-navigation*
*Plan: 03-frontend-scaffold*
*Completed: 2026-04-08*
