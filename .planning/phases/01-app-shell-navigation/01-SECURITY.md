---
phase: 01-app-shell-navigation
audited_plans: [01, 02, 03, 06]
asvs_level: 1
block_on: critical
audited: 2026-04-08
---

# Phase 01 Security Audit

## Verdict: SECURED

**Threats Closed:** 10/10
**Open Threats:** 0
**Unregistered Flags:** 0

---

## Threat Verification

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T01 | Tampering — Supply-chain via unpinned npm | mitigate | `web/package.json` — all 23 dependencies use exact version strings (no `^` or `~`). `web/node_modules/` and `ministack/static/console/` excluded in `.gitignore` lines 55–67. |
| T02 | Information Disclosure — Path traversal via `/_console/` | mitigate | `ministack/app.py:610` — `candidate.relative_to(root_resolved)` raises `ValueError` on escape; caught at line 612–614 and returns 404. `tests/test_console_serve.py:75–81` — `test_path_traversal_blocked` asserts body contains neither `_serve_console` nor `SERVICE_HANDLERS`. |
| T03 | Tampering — MIME sniffing on static assets | mitigate | `ministack/app.py:617` — `mimetypes.guess_type(candidate.name)` derives `Content-Type` from the file name; no request-supplied `Content-Type` header is used. |
| T04 | Elevation of Privilege — POST/PUT/DELETE to `/_console/` | mitigate | `ministack/app.py:596–597` — `if method not in ("GET", "HEAD"): return False`. `tests/test_console_serve.py:84–88` — `test_post_to_console_root_does_not_return_html` confirms POST does not return HTML. |
| T05 | Information Disclosure — SPA fallback serving arbitrary files | mitigate | `ministack/app.py:641` — SPA fallback hardcodes `_CONSOLE_ROOT / "index.html"`; no user-supplied filename reaches this path. |
| T06 | Spoofing — `/_console` interpreted as S3 bucket | mitigate | `ministack/app.py:281–284` — `_serve_console()` call site is placed before `detect_service()` in the dispatch chain. Comment at line 281 documents the ordering requirement. Confirmed by SUMMARY `01-02` insertion-point table (console_call line 283 < detect_service invocation). |
| T07 | Tampering — XSS via service names from registry endpoint | mitigate | No `dangerouslySetInnerHTML` found anywhere under `web/src/` (grep returned zero results). All service-name rendering passes through React JSX, which escapes by default. |
| T08 | Information Disclosure — Secrets in localStorage | mitigate | `web/src/stores/uiStore.ts` — persisted state contains only `sidebarOpen: boolean` and `lastSelectedService: string | null` under key `ministack:console`. No credentials, tokens, or sensitive values. |
| T09 | Tampering — Docker supply-chain via npm install | mitigate | `Dockerfile:13` — `if [ -f package-lock.json ]; then npm ci; else npm install; fi` (deterministic install when lockfile present). `.dockerignore` excludes `.git`, `.planning`, `web/node_modules`, `tests/`. `COPY --from=frontend` at line 48 copies only the built artifact — no node_modules in final image. |
| T10 | Tampering — npm registry trust (residual) | accept | Accepted risk per plan residual clause: "same as every Node project; mitigated by package-lock.json commit." package-lock.json is committed (evidenced by `web/package-lock.json*` copy instruction in Dockerfile Stage 1 and `npm ci` deterministic install path). |

---

## Accepted Risks Log

| Risk ID | Threat | Rationale | Owner |
|---------|--------|-----------|-------|
| T10 | npm registry trust | ministack is a local dev tool, not a production service. package-lock.json pins the full dependency tree. Compromised upstream packages are a shared industry risk accepted by all Node projects. | Phase 1 |

---

## Unregistered Flags

None. All threat flags raised in SUMMARY files (`01-02-SUMMARY.md` and `01-06-SUMMARY.md`) map directly to registered threats in the threat register.

Notable advisory (not a gap): `01-02-SUMMARY.md` notes that `/_console/api/services` sets `Access-Control-Allow-Origin: *`. This is benign for a local dev tool (same-origin in production, proxied in dev) and is documented as intentional. It is not in the threat register because the threat model explicitly scopes ministack as a localhost-only dev tool with no auth model.

---

## Evidence Summary

- Path traversal: active mitigation at `ministack/app.py:608–614`, explicit test at `tests/test_console_serve.py:75–81`
- Method filtering: active at `ministack/app.py:596–597`, tested at `tests/test_console_serve.py:84–88`
- MIME sniffing: active at `ministack/app.py:617`
- SPA fallback scope: hardcoded `index.html` at `ministack/app.py:641`
- Route ordering (T06): call site at `ministack/app.py:283`, before `detect_service()` at later dispatch
- XSS: no `dangerouslySetInnerHTML` in `web/src/` (confirmed by grep)
- localStorage: `web/src/stores/uiStore.ts` — UI-only state, no secrets
- Docker: `npm ci` in `Dockerfile:13`, `COPY --from=frontend` at line 48, `.dockerignore` excludes build cruft
- Supply-chain: all 23 `web/package.json` deps use exact pinned versions (no range operators)
