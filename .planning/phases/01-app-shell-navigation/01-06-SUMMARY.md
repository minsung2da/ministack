---
phase: 01-app-shell-navigation
plan: 06
subsystem: devops
tags: [wave-3, docker, makefile, playwright, e2e, regression-gate]

requires:
  - phase: 01-app-shell-navigation/02
    provides: console-asgi-routes
  - phase: 01-app-shell-navigation/03
    provides: frontend-scaffold
  - phase: 01-app-shell-navigation/04
    provides: app-shell-components
  - phase: 01-app-shell-navigation/05
    provides: pages-and-counts
---

# Plan 06 Summary — Build Pipeline & E2E

## Accomplishments

### Task 1: Multi-stage Dockerfile + Makefile + E2E harness
- Converted `Dockerfile` from single-stage to multi-stage: Node 22-alpine (Stage 1 — `npm ci && npm run build`) → Python 3.12-alpine (Stage 2 — runtime only)
- `COPY --from=frontend` copies built SPA into `ministack/static/console/` — no node_modules in final image
- Created `.dockerignore` excluding `.git`, `.planning`, `web/node_modules`, `tests/`, `__pycache__`
- Added `Makefile` targets: `build-frontend`, `dev-frontend` (:6655), `dev-backend` (:5566), `test-backend`, `test-frontend`, `e2e`, `docker-build`
- Created `scripts/e2e-with-server.sh`: builds SPA, boots ministack, waits for health, runs Playwright, tears down — single-command E2E

### Task 2: Real Playwright E2E specs (6 files, 10 tests)
- `navigation.spec.ts`: app shell render, deep link, SPA fallback hard-refresh
- `search.spec.ts`: Autosuggest "dyn" → DynamoDB → navigate
- `breadcrumbs.spec.ts`: Console breadcrumb click returns to root
- `layout.spec.ts`: no horizontal scroll at 1366x768
- `responsive.spec.ts`: shell renders without crash at 900x720
- `counts.spec.ts`: DynamoDB real ListTables count, Lambda real function count, S3 "not available" message

### Task 3: Full Phase 1 regression gate (all green)
- `pytest tests/test_console_serve.py tests/test_existing_aws_apis.py -q` → **15 passed**
- `npx vitest run` → **16 passed** (8 files)
- `npx tsc -b --noEmit` → exit 0
- `npx vite build` → exit 0, 38.79s
- `npx playwright test` → **10 passed** (6 files, 40.9s against live ministack on :4566)
- SPA serving: `curl /_console/` returns `<div id="root">`
- Services API: 35 services returned from `/_console/api/services`
- VALIDATION.md: `nyquist_compliant: true`, `wave_0_complete: true`

## Files Changed

| File | Action |
|------|--------|
| `Dockerfile` | Modified (multi-stage) |
| `.dockerignore` | Created |
| `Makefile` | Modified (new targets) |
| `scripts/e2e-with-server.sh` | Created |
| `web/e2e/navigation.spec.ts` | Modified (real assertions) |
| `web/e2e/search.spec.ts` | Modified (real assertions) |
| `web/e2e/breadcrumbs.spec.ts` | Modified (real assertions) |
| `web/e2e/layout.spec.ts` | Modified (real assertions) |
| `web/e2e/responsive.spec.ts` | Modified (real assertions) |
| `web/e2e/counts.spec.ts` | Created |
| `.planning/phases/01-app-shell-navigation/01-VALIDATION.md` | Modified (flags flipped) |

## Deviations

1. **Cloudscape responsive DOM quirks in E2E**: TopNavigation hides brand text at narrow viewports (renders in hidden `<span>`); Autosuggest renders duplicate `<input>` elements for responsive handling. Fixed by using `toBeAttached()` instead of `toBeVisible()` for brand text, role-based combobox locator for search, and overflow-check instead of button-presence for responsive test.
2. **Docker build not verified locally**: WSL environment may not have Docker daemon available. Dockerfile was committed based on plan spec; Docker build verification deferred to Task 4 checkpoint (human-verify).
3. **Executor rate-limited mid-plan**: Original Plan 06 executor hit API limits after Task 1 commit. Orchestrator picked up Tasks 2-3 manually, maintaining atomic commits.

## Test Counts (Phase 1 total)

| Layer | Count | Status |
|-------|-------|--------|
| pytest (Python backend) | 15 | all pass |
| vitest (frontend unit) | 16 | all pass |
| Playwright E2E | 10 | all pass |
| **Total** | **41** | **all pass** |

## Requirements Verified

| Requirement | Evidence |
|-------------|----------|
| FOUND-01 | SPA fallback: hard-refresh deep link returns app (E2E) |
| FOUND-02 | Cloudscape v3 + React 19 smoke (Plan 01), shell renders (E2E) |
| FOUND-03 | 15 Python tests pass (4 FOUND-03 baseline + 11 console) |
| FOUND-04 | /_console/api/services returns 35 services |
| NAV-01 | Search "dyn" → DynamoDB navigate (E2E) |
| NAV-02 | Sidebar grouped/alphabetized (vitest) |
| NAV-03 | Breadcrumb click returns to root (E2E) |
| NAV-04 | DynamoDB/Lambda real counts, S3 "not available" (E2E) |
| NAV-05 | No horizontal scroll, responsive render (E2E) |
