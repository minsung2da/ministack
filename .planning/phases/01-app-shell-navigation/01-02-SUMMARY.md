---
phase: 01-app-shell-navigation
plan: 02
subsystem: backend
tags: [asgi, console-serve, spa-fallback, path-traversal, service-registry, cache-control, pyproject, package-data]

requires:
  - phase: 01-app-shell-navigation/01
    provides: test-scaffolds-for-plans-02-06, found-03-regression-baseline
provides:
  - console-spa-static-serving
  - console-services-registry-endpoint
  - console-path-traversal-mitigation
  - pyproject-package-data-static-console
  - ministack-console-package
affects:
  - 01-app-shell-navigation/03  # consumes /_console/api/services for sidebar
  - 01-app-shell-navigation/04  # consumes SPA serve route for ConsoleShell delivery
  - 01-app-shell-navigation/05  # consumes SPA fallback for deep-link routing
  - 01-app-shell-navigation/06  # e2e relies on served index.html + cache headers

tech-stack:
  added: []  # stdlib-only (mimetypes, pathlib) — CLAUDE.md "minimal dependencies" honored
  patterns:
    - "Console static serving as a short-circuit branch BEFORE detect_service() / S3 vhost / CORS (Pitfall #2)"
    - "Path.resolve().relative_to(_CONSOLE_ROOT.resolve()) for path-traversal rejection"
    - "Cache-Control policy: assets/* immutable 1y, everything else no-cache (Pitfall #7)"
    - "Assets-404 check runs even when ministack/static/console/ does not exist yet (prevents stale-hash 503)"
    - "Service taxonomy is a single source of truth collapsing SERVICE_HANDLERS aliases (cognito-idp + cognito-identity -> cognito)"
    - "In-process ASGI _call() helper with lowercased header keys for case-insensitive test assertions"

key-files:
  created:
    - ministack/console/__init__.py
    - ministack/console/registry.py
    - .planning/phases/01-app-shell-navigation/01-02-SUMMARY.md
  modified:
    - ministack/app.py
    - pyproject.toml
    - tests/test_console_serve.py

key-decisions:
  - "Insert _serve_console() call site at line 283 of ministack/app.py, between the lambda-layers block (line ~255) and the /_ministack/reset block (line ~297 post-insert) — keeps all internal underscore-prefix routes clustered and guarantees /_console never reaches detect_service() or the S3 vhost regex"
  - "Place the _serve_console() function definition at line 578, immediately after _send_response() so helpers stay adjacent"
  - "HANDLER_TO_CANONICAL contains only {cognito-idp -> cognito, cognito-identity -> cognito}; no other SERVICE_HANDLERS keys required collapsing"
  - "Move the /_console/assets/* 404 check OUT of the 'if root_resolved is not None' guard so missing hashed assets return 404 even on a fresh checkout where ministack/static/console/ does not yet exist (prevents fooling the browser with a 503 stub in place of a cached asset)"
  - "Test _call() helper lowercases response header keys; ASGI preserves original casing (Cache-Control, Content-Type) which would otherwise make case-sensitive .get('cache-control') fail"

patterns-established:
  - "Console routes cluster: all /_console/* dispatch lives in a single adjacent block between lambda-layers and /_ministack/reset — new Console API endpoints (Phase 2+) MUST land in this cluster"
  - "Service taxonomy as the single boundary between SERVICE_HANDLERS (backend identity) and UI sidebar/search (frontend view) — frontend never enumerates handlers directly"

requirements-completed: [FOUND-01, FOUND-03, FOUND-04]

duration: ~5min (active)
completed: 2026-04-08
---

# Phase 01 Plan 02: Backend ASGI Integration Summary

**/_console/ SPA route + services registry endpoint wired into the existing raw-ASGI ministack handler with path-traversal protection, SPA deep-link fallback, Pitfall #7 cache headers, and zero regression to the 35-service AWS dispatch.**

## Performance

- **Duration:** ~5 min (active)
- **Started:** 2026-04-08T12:03:00Z
- **Completed:** 2026-04-08T12:08:31Z
- **Tasks:** 3
- **Files created:** 3 (including this summary)
- **Files modified:** 3

## Accomplishments

- Phase 1 backend surface complete: `GET /_console/`, `GET /_console/{anything}` (SPA fallback), `GET /_console/assets/*` (with 404 for missing hashed assets), `GET /_console/api/services` (35-entry registry) all land on the existing :4566 ASGI handler.
- Security mitigation live and automatically tested: `GET /_console/../app.py` cannot leak repo source (path traversal assertion explicitly checks the response body does not contain `_serve_console` or `SERVICE_HANDLERS`).
- FOUND-03 zero-regression verified: the 4-test baseline in `tests/test_existing_aws_apis.py` (health, S3 ListBuckets, DynamoDB ListTables, Lambda ListFunctions) stays 4/4 passing after all app.py edits.
- `tests/test_console_serve.py` moved from 9 `@pytest.mark.skip` stubs to **11 real passing tests** (+2 beyond the stub count — added `test_post_to_console_root_does_not_return_html` for method-filter coverage and `test_services_registry_aliases_collapsed` for explicit alias proof).
- `pyproject.toml` `[tool.setuptools.package-data]` ships `ministack/static/console/**/*` in the wheel so `pip install ministack` lands the built SPA automatically.

## Task Commits

Each task committed atomically:

1. **Task 1: Create ministack/console/ registry package** — `f1b8a1b` (feat)
2. **Task 2: _serve_console() + /_console/api/services dispatch + pyproject package-data** — `4611782` (feat)
3. **Task 3: Fill tests/test_console_serve.py + fix assets-404 edge case** — `54c3c83` (test + fix)

## Files Created/Modified

- `ministack/console/__init__.py` — package marker
- `ministack/console/registry.py` — `SERVICE_TAXONOMY`, `CATEGORY_ORDER`, `HANDLER_TO_CANONICAL`, `canonical_key()`, `display_name()`, `category()`, `build_registry()`. Single source of truth for sidebar + search.
- `ministack/app.py` — new stdlib imports (`mimetypes`, `pathlib.Path`); three module constants (`_CONSOLE_ROOT`, `_CONSOLE_ASSETS`, `_CONSOLE_API_PREFIX`); new `async def _serve_console()` at line 578; two new dispatch blocks at line 283 (`if await _serve_console(...)` and `if path == "/_console/api/services" and method == "GET"`).
- `pyproject.toml` — new `[tool.setuptools.package-data]` table with `ministack = ["static/console/**/*"]`.
- `tests/test_console_serve.py` — 9 skip stubs replaced with 11 real tests; self-contained in-process `_call()` helper that lowercases response header keys.

## Exact Insertion Points (as promised by plan output spec)

| What | File | Line |
|---|---|---|
| `if await _serve_console(path, method, send)` call site | `ministack/app.py` | **283** |
| `async def _serve_console(path, method, send) -> bool:` definition | `ministack/app.py` | **578** |

Order verified: `lambda_end` (line ~250) < `console_call` (line 283) < `reset_line` (line ~300), so `/_console` never reaches `detect_service()` or the S3 vhost regex.

## Registry Shape

`build_registry(list(SERVICE_HANDLERS.keys()))` returns **35 entries** covering every handler after alias collapse. `HANDLER_TO_CANONICAL` contains only:

```python
{
    "cognito-idp":      "cognito",
    "cognito-identity": "cognito",
}
```

No other aliases were added beyond the two cognito entries — every other `SERVICE_HANDLERS` key is already canonical (matches the URL slug the sidebar uses).

## test_console_serve.py Final Count

- Total `def test_*`: **11** (plan §`<behavior>` asked for 9 specific behaviors; added `test_post_to_console_root_does_not_return_html` for GET/HEAD-only method enforcement and `test_services_registry_aliases_collapsed` for an explicit positive assertion on alias collapse).
- Total `@pytest.mark.skip`: **0**.
- All 11 tests pass under `.venv/bin/python -m pytest tests/test_console_serve.py -q`.

## tests/test_services.py Untouched Confirmation

```
git diff b1ca29c..HEAD -- tests/test_services.py | wc -l
0
```

Zero lines changed since the pre-plan baseline (`b1ca29c`). Per Plan 01's documented deviation B, `tests/test_services.py` requires a live :4566 boto3 endpoint and is out-of-scope for in-process verification; it stays byte-identical to the pre-console baseline.

## Decisions Made

- **Function placement (line 578):** `_serve_console()` lives immediately after `_send_response()` so all ASGI response helpers are adjacent. Call site at line 283 keeps all `/_ministack/*` and `/_console/*` internal routes visually clustered between the lambda-layers return and the reset/config admin endpoints.
- **Assets-404 hoisting (Task 3 fix):** Moved the `rel.startswith("assets/")` check outside the `if rel and root_resolved is not None:` guard. Before the fix, if `ministack/static/console/` did not exist (which it currently doesn't — Plans 04–05 will populate it), a request for `/_console/assets/app-abc123.js` would fall through to the SPA fallback and return the 503 "not built" stub. After the fix it returns 404, which is correct for cache-busting.
- **No `aiofiles` dependency:** Plan explicitly chose `asyncio.to_thread(candidate.read_bytes)` over `aiofiles` — matches CLAUDE.md minimal-deps stance, avoids a new runtime dep, and is fine for dev-tool traffic volumes.
- **No CORS in `_serve_console`:** Static asset responses are same-origin (browser fetches them under `:4566/_console/...`). Only the `/_console/api/services` JSON response sets `Access-Control-Allow-Origin: *` to ease Vite dev-server proxy use cases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Missing /_console/assets/* requests returned 503 instead of 404 on a fresh checkout**

- **Found during:** Task 3 first verify run (`tests/test_console_serve.py::test_missing_asset_returns_404_not_index` → `assert 503 == 404`).
- **Issue:** The plan's `_serve_console()` spec nested the `if rel.startswith("assets/"):` 404 branch inside `if rel and root_resolved is not None:`. On a clean checkout (or any machine that has never run `npm run build`), `_CONSOLE_ROOT.exists()` is False, so `root_resolved` is None, the entire guarded block is skipped, and the code falls through to the SPA fallback which emits a 503 "not built" stub. Browsers would then receive a 503 for a hashed asset URL, which is wrong: a missing hashed asset MUST be 404 so cache machinery behaves correctly.
- **Fix:** Hoisted the `rel.startswith("assets/")` 404 check to run regardless of whether the static root exists.
- **Files modified:** `ministack/app.py` (within `_serve_console`)
- **Verification:** `test_missing_asset_returns_404_not_index` now passes; `test_hashed_asset_served_with_immutable_cache` (which uses `monkeypatch` to point `_CONSOLE_ROOT` at a tmp dir with a real file) still passes — confirming the fix does not block the happy path.
- **Committed in:** `54c3c83` (Task 3 commit)

**2. [Rule 1 — Bug] Test helper did not lowercase response header keys**

- **Found during:** Task 3 first verify run (multiple `hdrs.get("cache-control")` and `hdrs.get("content-type")` lookups returning `None` despite the headers being present as `Cache-Control` / `Content-Type`).
- **Issue:** The plan's `_call()` helper returns `{k.decode(): v.decode() for k, v in out_headers}` without lowercasing. ASGI preserves the original casing that `_send_response` emitted, and our handler passes `Cache-Control` / `Content-Type` with canonical capitalization. The tests use lowercased keys for HTTP-standard case-insensitive lookup, producing false failures.
- **Fix:** Changed the helper to `{k.decode().lower(): v.decode() for k, v in out_headers}`.
- **Files modified:** `tests/test_console_serve.py`
- **Verification:** All 11 tests now pass.
- **Committed in:** `54c3c83` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — one in backend code, one in test helper).
**Impact on plan:** Both fixes necessary for correctness. No scope creep. The assets-404 fix is the only production-behavior change from the plan's literal spec; it strictly improves safety by making missing-hash responses unambiguous.

## Issues Encountered

- None beyond the two deviations above. No architectural questions, no auth gates, no dependency installs needed (all work was stdlib + existing `.venv`).

## Self-Check: PASSED

**Files verified present:**
- `ministack/console/__init__.py` FOUND
- `ministack/console/registry.py` FOUND (contains `SERVICE_TAXONOMY`, `build_registry`, `canonical_key`, 35 entries)
- `ministack/app.py` contains `import mimetypes`, `from pathlib import Path`, `_CONSOLE_ROOT = Path`, `async def _serve_console`, `if await _serve_console`, `/_console/api/services`, `from ministack.console.registry import build_registry` FOUND
- `pyproject.toml` contains `[tool.setuptools.package-data]` + `static/console/**/*` FOUND
- `tests/test_console_serve.py` has 11 `def test_*` entries, 0 `@pytest.mark.skip` FOUND

**Commits verified present (git log --oneline -5):**
- `f1b8a1b` feat(01-02): add console service taxonomy registry FOUND
- `4611782` feat(01-02): wire /_console/ SPA serving + services registry into ASGI app FOUND
- `54c3c83` test(01-02): fill console serving tests and fix missing-asset 404 path FOUND

**Verification commands re-ran in this message, all green:**
- `.venv/bin/python -m pytest tests/test_console_serve.py tests/test_existing_aws_apis.py -v` → **15 passed in 1.43s** (11 console + 4 baseline)
- `.venv/bin/python -c "import ministack.app; assert hasattr(ministack.app, '_serve_console'); from ministack.console.registry import build_registry"` → **module exports OK**
- `grep -q 'static/console' pyproject.toml` → **pyproject package-data OK**
- `python -c "... assert lambda_end < console_call < reset_line"` → **call-site order OK**
- `git diff b1ca29c..HEAD -- tests/test_services.py | wc -l` → **0** (untouched)

## Success Criteria Check

- [x] **FOUND-01:** `GET /_console/` returns 503 stub HTML (since SPA not yet built — Plans 04–05 will populate `ministack/static/console/`). `test_index_served_with_no_cache` proves that when a real `index.html` exists, it returns 200 `text/html` with `Cache-Control: no-cache`.
- [x] **FOUND-01:** `GET /_console/services/ec2` (deep link) returns the same body as `GET /_console/` (SPA fallback verified by `test_spa_fallback_deep_link`).
- [x] **FOUND-01:** `GET /_console/assets/nonexistent.js` returns 404 (verified by `test_missing_asset_returns_404_not_index`).
- [x] **FOUND-01:** Path traversal blocked (verified by `test_path_traversal_blocked`).
- [x] **FOUND-03:** `GET /_ministack/health` unchanged vs baseline (verified by `test_health_unaffected_by_console_routes` AND `tests/test_existing_aws_apis.py::test_health_endpoint_baseline`).
- [x] **FOUND-03:** `tests/test_existing_aws_apis.py` 4/4 still green.
- [x] **FOUND-03:** `tests/test_services.py` byte-identical to pre-plan baseline (0-line diff since `b1ca29c`).
- [x] **FOUND-04:** `GET /_console/api/services` returns 200 JSON list of 35 `{key, name, category}` entries covering every `SERVICE_HANDLERS` key after alias collapse (verified by 3 tests: shape, coverage, alias-collapse).
- [x] **Packaging:** `pip install -e .` will include `ministack/static/console/**` in the wheel via `[tool.setuptools.package-data]` (static directory currently empty, glob handles missing-on-fresh-clone).
- [x] **Security:** Path traversal mitigation active and tested.

## Threat Model Compliance

| Mitigation | Status |
|---|---|
| Resolve candidate path with `Path.resolve()` and reject if not `relative_to(_CONSOLE_ROOT.resolve())` — explicit test coverage | **Done** — `_serve_console` lines 609–614; `test_path_traversal_blocked` asserts no `_serve_console` / `SERVICE_HANDLERS` content leaks |
| Only GET/HEAD methods accepted | **Done** — `if method not in ("GET", "HEAD"): return False`; `test_post_to_console_root_does_not_return_html` asserts POST is not swallowed |
| Registry endpoint read-only, no user input reflected, no state mutation | **Done** — `build_registry()` takes `list(SERVICE_HANDLERS.keys())` only, no query params touched |
| `Content-Type` from `mimetypes` stdlib (not from request headers) | **Done** — `mimetypes.guess_type(candidate.name)` |
| SPA fallback only serves `index.html` — never other files by name | **Done** — fallback hardcodes `_CONSOLE_ROOT / "index.html"` |
| Insertion BEFORE `detect_service()` so `/_console` is never interpreted as S3 bucket (Pitfall #2) | **Done** — call site at line 283, `detect_service()` is invoked later in the dispatch flow |

**Residual risk** (from plan): If `ministack/static/console/` ever contains user-uploaded files, they'd be served publicly. Accepted — it is strictly a build-output directory (written only by `vite build`), never user-writable at runtime.

## Next Phase Readiness

**Ready for:**
- **Plan 03 (ConsoleApiClient):** The `/_console/api/services` endpoint exists and returns a stable JSON contract. A TanStack Query hook can consume it today.
- **Plan 04 (ConsoleShell):** `GET /_console/` + SPA fallback is live — once Plan 04 writes an `index.html` into `ministack/static/console/`, the backend will serve it with no further changes.
- **Plan 05 (Service Home + Search):** Frontend can fetch the 35-entry registry and drive the sidebar / typeahead directly.
- **Plan 06 (E2E + A11y):** Playwright baseURL (`http://localhost:4566/_console/`) is now backed by a real route.

**Blockers:** None.

**Concerns:**
- The `/_console/api/services` endpoint uses `Access-Control-Allow-Origin: *`. This is fine for dev (Vite on `:6655` proxies to the Python backend) and for production (same-origin serve). If someone ever deploys ministack publicly, they should audit this header — but the threat model deliberately treats ministack as a local dev tool.
- `ministack/static/console/` is empty until Plan 04. The 503 stub is intentional and documented; `_serve_console` returns a machine-readable message ("Console UI not built. Run `npm run build` in web/.") rather than exposing a traceback.

---
*Phase: 01-app-shell-navigation*
*Plan: 02-backend-asgi-integration*
*Completed: 2026-04-08*
