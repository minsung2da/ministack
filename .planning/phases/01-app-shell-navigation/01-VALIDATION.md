---
phase: 1
slug: app-shell-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 01-RESEARCH.md "Validation Architecture" section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | pytest 7.x (Python regression), vitest + @testing-library/react (frontend unit), Playwright 1.x (E2E) |
| **Config files** | `pyproject.toml` (pytest), `web/vitest.config.ts` (Wave 0 — installs), `web/playwright.config.ts` (Wave 0 — installs) |
| **Quick run command** | `cd web && npm test -- --run` |
| **Full suite command** | `pytest tests/ -q && cd web && npm test -- --run && npx playwright test` |
| **Estimated runtime** | ~60 seconds (unit) / ~3 minutes (full incl. E2E) |

---

## Sampling Rate

- **After every task commit:** Run quick frontend tests + relevant pytest module
- **After every plan wave:** Run full suite for that surface (Python regression OR vitest OR Playwright)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds (unit), 180 seconds (E2E)

---

## Per-Task Verification Map

> Populated by planner from RESEARCH.md "Validation Architecture" — 18 test cases across pytest, Vitest+RTL, Playwright. Planner fills concrete task IDs once PLAN.md files are created.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | FOUND-01..04 | regression | `pytest tests/test_console_route.py -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | NAV-01..05 | unit | `cd web && npm test -- --run` | ❌ W0 | ⬜ pending |
| TBD | TBD | 5 | NAV-01..04 | e2e | `cd web && npx playwright test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/vitest.config.ts` + `web/src/test-setup.ts` — vitest + RTL config
- [ ] `web/playwright.config.ts` — Playwright config (baseURL, Chromium project)
- [ ] `npx playwright install chromium` — browser binary
- [ ] `tests/test_console_route.py` — pytest stubs verifying `/_console/` routes return SPA, AWS API hostnames untouched
- [ ] `tests/test_existing_aws_apis.py` — regression smoke for S3 / EC2 / Lambda / DynamoDB / SQS endpoints
- [ ] `web/src/__tests__/AppShell.test.tsx` — AppLayout shell render stub
- [ ] `web/src/__tests__/ServiceSearch.test.tsx` — Autosuggest stub
- [ ] `web/src/__tests__/ServiceSidebar.test.tsx` — SideNavigation stub
- [ ] `web/src/__tests__/Breadcrumbs.test.tsx` — breadcrumb derivation stub
- [ ] `web/e2e/navigation.spec.ts` — Playwright stub: open `/_console/`, search, navigate, breadcrumbs, deep link
- [ ] `web/e2e/responsive.spec.ts` — Playwright stub: 1366×768 layout

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity to AWS console | UI-SPEC | Cloudscape pixel-match — automated visual diff out of scope for Phase 1 | Open `localhost:4566/_console/`, compare to `https://console.aws.amazon.com` shell side-by-side |
| Cloudscape v3 + React 19 runtime smoke | tech-stack lock | Library compatibility claimed but not yet empirically verified | Wave 0: boot `npm run dev`, confirm no console errors, AppLayout renders |

---

## Validation Sign-Off

- [ ] All tasks have automated verify command or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (vitest, playwright, pytest stubs)
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 60s for unit, < 180s for E2E
- [ ] `nyquist_compliant: true` set in frontmatter once planner fills task map

**Approval:** pending
