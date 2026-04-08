---
phase: 01-app-shell-navigation
plan: 04
subsystem: frontend
tags: [wave-2, cloudscape, app-shell, top-navigation, side-navigation, breadcrumbs, autosuggest, react-router, tdd]

requires:
  - phase: 01-app-shell-navigation/02
    provides: console-services-registry-endpoint
  - phase: 01-app-shell-navigation/03
    provides: spa-entry-point, use-services-hook, copy-module-centralized, zustand-uistore-persisted, react-router-v7-library-mode
provides:
  - console-shell-component
  - top-bar-with-service-search
  - side-navigation-grouped-by-category
  - route-derived-breadcrumbs
  - app-layout-headerselector-mitigation-pitfall-4
  - test-util-basename-fix
affects:
  - 01-app-shell-navigation/05  # ServiceHome will render inside ConsoleShell <Outlet/>
  - 01-app-shell-navigation/06  # E2E targets the now-real shell DOM (a11y, navigation flows)

tech-stack:
  added: []
  patterns:
    - "Cloudscape AppLayout with headerSelector='#top-nav' so the top bar height is measured (Pitfall #4)"
    - "TopNavigation + Autosuggest controlled component for service search"
    - "SideNavigation type='section' grouping with CATEGORY_ORDER iteration and per-section alphabetization"
    - "BreadcrumbGroup derived from useLocation pathname split, resolving display names via useServices"
    - "All navigation routed through React Router useNavigate (never window.location)"
    - "MemoryRouter test util prepends basename to initial entries so the router actually mounts the tree"

key-files:
  created:
    - web/src/app/TopBar.tsx
    - web/src/app/Sidebar.tsx
    - web/src/app/Breadcrumbs.tsx
    - .planning/phases/01-app-shell-navigation/01-04-SUMMARY.md
  modified:
    - web/src/app/ConsoleShell.tsx           # placeholder replaced with real AppLayout wiring
    - web/src/test/utils.tsx                 # Rule 3 fix: prepend /_console basename to MemoryRouter entry
    - web/src/__tests__/AppShell.test.tsx    # real assertions (was it.skip stub)
    - web/src/__tests__/ServiceSearch.test.tsx
    - web/src/__tests__/ServiceSidebar.test.tsx
    - web/src/__tests__/Breadcrumbs.test.tsx

key-decisions:
  - "Brand link in TopNavigation uses identity.href='/_console/' (full document navigation). Cloudscape's TopNavigation does not integrate with React Router by default; wiring it through useNavigate would require an onFollow override. Brand link is rarely clicked and a full reload re-mounts the SPA cleanly. Deferred to Phase 5 polish per the plan's annotated note."
  - "Sidebar items use href='/services/{key}' (relative to basename) and onFollow preventDefault + navigate(). This matches Cloudscape's documented pattern for SPA integration and keeps activeHref reactive to React Router's pathname."
  - "Tests mock useServices via vi.mock rather than starting MSW. MSW stays reserved for Plan 05's ServiceHome tests where real HTTP roundtrip behavior matters."
  - "Test assertions for BreadcrumbGroup and TopNavigation use getAllByText / data-value selectors because Cloudscape renders ghost (measurement) copies of these components in the DOM, and Autosuggest filteringType=auto wraps matched substrings in <mark>, splitting text nodes."

requirements-completed: [NAV-01, NAV-02, NAV-03, NAV-05]

metrics:
  duration_wall_clock: "~25m"
  duration_active: "~25m"
  completed_at: "2026-04-08T12:50:05Z"
  tasks: 2
  files_created: 3
  files_modified: 6
---

# Phase 01 Plan 04: App Shell Components Summary

**Wave 2 — replaced the Plan 03 ConsoleShell placeholder with the real Cloudscape AppLayout wiring (TopNavigation + SideNavigation + BreadcrumbGroup + Outlet), landing NAV-01 service search, NAV-02 grouped sidebar, NAV-03 breadcrumbs, and NAV-05 desktop-first responsive layout.**

## Performance

- **Duration:** ~25 min (wall clock, includes ~6 min spent diagnosing and fixing the Cloudscape DOM testing-library mismatches in Task 2 GREEN)
- **Started:** 2026-04-08T12:24:43Z
- **Completed:** 2026-04-08T12:50:05Z
- **Tasks:** 2 (TDD red, then implementation)
- **Files created:** 3 components (+ this summary)
- **Files modified:** 6 (ConsoleShell replaced + test util fix + 4 test stubs filled with real assertions)

## Accomplishments

- **NAV-01 (service search):** TopBar mounts a Cloudscape `Autosuggest` inside `TopNavigation.search`. Typing 'EC' filters via `filteringType="auto"` and selecting EC2 calls `useNavigate('/services/ec2')`. Verified by `ServiceSearch.test.tsx`.
- **NAV-02 (sidebar grouping):** Sidebar uses `SideNavigation` with `type="section"` items, iterates `CATEGORY_ORDER`, alphabetizes services within each category (`localeCompare`), and skips empty categories entirely. Verified by `ServiceSidebar.test.tsx` (3 assertions including DOM order check).
- **NAV-03 (breadcrumbs):** Breadcrumbs derives from `useLocation().pathname.split('/')`, always seeds 'Console' at root, and resolves the service display name via `useServices()` for `/services/:key`. Click handler calls `navigate(href)` after `preventDefault()`. Verified by `Breadcrumbs.test.tsx` (root, service, and click → navigate).
- **NAV-05 (desktop-first responsive):** Cloudscape `AppLayout` ships built-in responsive behavior (sidebar auto-collapses below 720px main width). No custom CSS — delegated entirely to Cloudscape per the UI-SPEC.
- **Pitfall #4 mitigation:** `<TopBar>` wraps its `<TopNavigation>` in `<div id="top-nav">`, and `AppLayout headerSelector="#top-nav"` is pinned. Verified by `AppShell.test.tsx` regression assertion (`container.querySelector('#top-nav')` non-null).

## Task Commits

1. **Task 1 (TDD RED) — Real failing assertions for AppShell, ServiceSearch, ServiceSidebar, Breadcrumbs:** `2d3366a` (test)
2. **Task 2 (GREEN) — Implementation + test util basename fix + Cloudscape DOM-shape test fixups:** `14b28ee` (feat)

## Verification Evidence

All commands re-run in this session immediately before writing this summary:

```
$ cd web && npx tsc -b --noEmit
exit 0, no output

$ cd web && npx vitest run --reporter=dot
Test Files  5 passed | 3 skipped (8)
Tests       12 passed | 5 skipped (17)

$ cd web && npx vite build
✓ 1080 modules transformed.
✓ built in 26.67s
ministack/static/console/index.html             0.42 kB
ministack/static/console/assets/index-*.css   325.35 kB
ministack/static/console/assets/index-*.js    326.07 kB
ministack/static/console/assets/ConsoleShell-*.js  596.35 kB  ← Cloudscape components, lazy loaded
ministack/static/console/assets/ConsoleShell-*.css 380.92 kB  ← Cloudscape per-component styles

$ grep -c "/_console/assets/" ministack/static/console/index.html
2  (one for the main JS chunk, one for the CSS chunk)
```

**Per-test breakdown of the four shell test files (10 of the 12 passing tests):**

| Test file | Tests | Status |
|---|---|---|
| `AppShell.test.tsx` | 2 | passed (brand+services+breadcrumb root, #top-nav id) |
| `ServiceSearch.test.tsx` | 2 | passed (filter on type, navigate on select) |
| `ServiceSidebar.test.tsx` | 3 | passed (grouping, empty hiding, alphabetization) |
| `Breadcrumbs.test.tsx` | 3 | passed (root, service, click → navigate) |

**5 skipped tests** are all in `ServiceHome.test.tsx`, `ServiceHomeEc2.test.tsx`, and `ServiceHomeError.test.tsx` — those belong to **Plan 05** and remain `it.skip` stubs from Plan 01's wave-0 scaffold.

**TDD RED-GREEN cycle confirmation:**
- After Task 1 commit (`2d3366a`), running the four shell test files gave: `Test Files 4 failed (4)` — components didn't exist or were placeholders.
- After Task 2 commit (`14b28ee`), running the same four files gives: `10 passed (10)`.

## Cloudscape Runtime Warnings

Two informational messages from the build, neither failing:

1. `(!) Some chunks are larger than 500 kB after minification.` — the `ConsoleShell-*.js` lazy chunk is 596 kB because it bundles every Cloudscape component in the shell (AppLayout, TopNavigation, SideNavigation, BreadcrumbGroup, Autosuggest, ContentLayout). This is expected for Cloudscape v3 and Plan 06 will not split it further (gzipped it is 167 kB, well within Phase 1 budget). Documented for Plan 06 Docker sizing.

2. **No React or Cloudscape runtime warnings** during test runs. The Plan 01 scaffold's vitest setup already silences expected jsdom warnings (ResizeObserver shim).

The Plan 03 React Router warning that surfaced mid-task — `<Router basename="/_console"> is not able to match the URL "/" because it does not start with the basename` — was a real bug in the Plan 03 test util and is now fixed (see Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan 03 `renderWithProviders` test util didn't prefix routes with the router basename**

- **Found during:** Task 2 first GREEN run.
- **Issue:** `web/src/test/utils.tsx` (Plan 03) wired `<MemoryRouter basename="/_console" initialEntries={[route]}>`. React Router 7 refuses to render the tree if the initial entry does not start with the basename — it logged `<Router basename="/_console"> is not able to match the URL "/" because it does not start with the basename, so the <Router> won't render anything` and produced an empty `<body><div /></body>`. Every shell-level test failed because nothing rendered. Plan 03 didn't catch this because it only ran the `copy.test.ts` file, which doesn't go through `renderWithProviders`.
- **Fix:** Updated `renderWithProviders` to prepend `/_console` to the incoming route (`/` becomes `/_console`, `/services/ec2` becomes `/_console/services/ec2`). Tests still express routes relative to the app, the util handles the basename plumbing in one place. Comment explains why.
- **Files modified:** `web/src/test/utils.tsx`
- **Commit:** `14b28ee` (Task 2 — fix is part of the GREEN commit because tests cannot pass without it)
- **Verification:** Re-running the four shell test files after the util fix took the count from 0/10 to 10/10. The fix doesn't affect Plan 03's existing `copy.test.ts` (which doesn't render through MemoryRouter) — confirmed by full vitest suite still showing 12 passed / 5 skipped.

**2. [Rule 1 — Test bug] Cloudscape DOM doesn't match the naïve text-content assertions written in Task 1 RED**

- **Found during:** Task 2 GREEN runs (all components implemented, tests still failing).
- **Issue:** Three Cloudscape-specific DOM realities broke the literal text-matchers:
  1. **`BreadcrumbGroup` ghost copies:** Cloudscape renders a hidden duplicate of the breadcrumbs for layout measurement, so `getByText('Console')` matches multiple elements and throws.
  2. **`TopNavigation` responsive duplicates:** TopNavigation renders both a "wide" and "narrow" copy of its children via internal ResizeObserver, so `getByPlaceholderText('Search services')` matches two `<input>` elements.
  3. **Autosuggest `filteringType="auto"` `<mark>` highlighting:** When the user types 'EC', Cloudscape highlights the match by wrapping the matched substring in `<mark>` inside the option label, splitting "EC2" across DOM nodes (`<span></span><mark>EC</mark>2`). `findAllByText('EC2')` returns zero matches because no single text node contains the literal string 'EC2'.
- **Fix:**
  1. Breadcrumbs tests use `getAllByText('Console').length > 0` (presence assertion, not count); the click test uses `getAllByText('Console')[0]` (the visible non-ghost copy is first in document order).
  2. ServiceSearch tests use a `getSearchInput()` helper that returns `getAllByPlaceholderText('Search services')[0]`.
  3. ServiceSearch's filter test queries `findAllByTitle('EC2')` because Cloudscape's option `<span>` carries `title="EC2"` as a non-split attribute. Negative assertions (`S3`, `DynamoDB` not in dropdown) use `document.querySelector('[data-value="S3"]')` for the same reason.
- **Files modified:** `web/src/__tests__/Breadcrumbs.test.tsx`, `web/src/__tests__/ServiceSearch.test.tsx`
- **Commit:** `14b28ee` (Task 2 GREEN commit)
- **Verification:** All 10 shell-test assertions now pass; the assertions are still semantically equivalent to the original RED intent.

### Plan Deviations (documented, not "auto-fixed")

None. Component implementations match the plan code exactly modulo a tiny TypeScript readonly cast in `Sidebar.tsx`'s `useMemo` (Cloudscape's `SideNavigationProps.Item[]` is mutable; the inner array literal is built mutably and returned as the readonly memo type). No semantic change.

## Threat Model Compliance

| Mitigation | Status |
|---|---|
| React JSX auto-escapes service names (no `dangerouslySetInnerHTML`) | **Done** — `grep -r dangerouslySetInnerHTML web/src/` returns nothing |
| Autosuggest value goes through controlled component props | **Done** — `useState('')` + `onChange` |
| Service navigation goes through React Router `useNavigate` | **Done** — Sidebar, Breadcrumbs, TopBar all use `useNavigate`. Brand link uses `identity.href` (full reload, accepted per plan's annotated decision) |
| No new persistent XSS vector introduced | **Done** — only data source is `/_console/api/services` from server-controlled SERVICE_HANDLERS |

**Residual:** unchanged from plan — if a future plan adds a user-controlled data path that flows into rendered text, this shell must be re-audited. Phase 1 has none.

## Known Stubs

None introduced by this plan. The four lazy-loaded page placeholders (`ConsoleHome`, `ServiceHome`, `NotFoundPage`) remain in place from Plan 03 — they will be filled by Plan 05. They are intentional and tracked in Plan 03's summary; Plan 04 does not own them.

## Self-Check: PASSED

**Files created (`test -f` verified):**
- `web/src/app/TopBar.tsx` FOUND
- `web/src/app/Sidebar.tsx` FOUND
- `web/src/app/Breadcrumbs.tsx` FOUND
- `.planning/phases/01-app-shell-navigation/01-04-SUMMARY.md` FOUND (this file)

**Files modified (post-condition contracts re-verified):**
- `web/src/app/ConsoleShell.tsx`: contains `headerSelector="#top-nav"`, no `placeholder` text — FOUND
- `web/src/app/TopBar.tsx`: contains `id="top-nav"`, `filteringType="auto"` — FOUND
- `web/src/app/Sidebar.tsx`: contains `CATEGORY_ORDER`, `localeCompare` — FOUND
- `web/src/app/Breadcrumbs.tsx`: contains `copy.breadcrumbRoot` — FOUND
- `web/src/test/utils.tsx`: contains `/_console${route` (basename prepend) — FOUND

**Commits verified present (`git log --oneline -5`):**
- `14b28ee` feat(01-04): implement ConsoleShell, TopBar, Sidebar, Breadcrumbs — FOUND
- `2d3366a` test(01-04): add failing assertions for shell, search, sidebar, breadcrumbs — FOUND

**Verification commands re-ran in this session, all green:**
- `cd web && npx tsc -b --noEmit` → exit 0
- `cd web && npx vitest run --reporter=dot` → 12 passed, 5 skipped, 0 failed
- `cd web && npx vite build` → 1080 modules transformed, built in 26.67s, `ministack/static/console/index.html` emitted
- `grep -c '/_console/assets/' ministack/static/console/index.html` → 2 (JS + CSS, both prefixed correctly)

## Success Criteria Check

- [x] **NAV-01:** Typing 'EC' in search filters and selecting EC2 navigates to `/services/ec2` (`ServiceSearch.test.tsx` 2/2 passing)
- [x] **NAV-02:** Sidebar shows grouped, sorted, non-empty categories (`ServiceSidebar.test.tsx` 3/3 passing — including DOM-order alphabetization check)
- [x] **NAV-03:** Breadcrumbs derived from pathname; root + service crumb + click navigation work (`Breadcrumbs.test.tsx` 3/3 passing)
- [x] **NAV-05:** Cloudscape `AppLayout` desktop-first responsive layout — delegated to Cloudscape default (Plan 06 E2E will visually verify the 720px breakpoint)
- [x] **Pitfall #4 mitigation:** `id="top-nav"` + `headerSelector="#top-nav"` verified by `AppShell.test.tsx`
- [x] Full frontend unit suite green (`vitest run` → 12 passed / 5 skipped / 0 failed)
- [x] `npx tsc -b --noEmit` exits 0
- [x] `npx vite build` exits 0 and re-emits hashed assets at `/_console/assets/*`

## Plan 02/03 Interaction

- Plan 02's `/_console/api/services` registry endpoint is mocked at the test level (`vi.mock` of `useServices`). Real wiring happens in the browser at runtime — this plan does not exercise the HTTP path because shell-level tests don't need it.
- Plan 03's lazy `routes.tsx` already imports `ConsoleShell` from `./ConsoleShell`. Replacing the named-export placeholder with a real implementation required no route-table changes.
- Plan 03's Zustand `useUiStore` is now consumed by `ConsoleShell` (`sidebarOpen` + `setSidebarOpen`) per the plan; localStorage key `ministack:console` continues to persist the preference.

## Issues Encountered

The two Rule-1/Rule-3 fixes documented above. No auth gates. No architectural questions. No dependency additions. No regressions in the backend test suite (it was not touched, but Plan 03's running checks show backend tests still green; this plan only modified `web/`).

## Next Plan Readiness

**Ready for Plan 05 (ServiceHome + Console Home pages):**
- `ConsoleShell` now provides a real `<Outlet />` inside `<ContentLayout>`. Plan 05 can render its `<Header>`, `<KeyValuePairs>`, `<StatusIndicator>`, etc. directly inside `ConsoleHome.tsx` and `ServiceHome.tsx` without any further shell scaffolding.
- The 5 currently-skipped `ServiceHome*.test.tsx` files are the only `it.skip` tests left in the frontend suite. Plan 05 owns them.
- `useServices()` is wired through TanStack Query and exercised in shell tests; Plan 05's MSW-based ServiceHome tests can rely on the same hook contract.

**Ready for Plan 06 (E2E + a11y):**
- The shell DOM Plan 06 will exercise via Playwright is now real (not a placeholder div), so a11y scans, keyboard navigation tests, and visual regression baselines can be captured against the actual structure.
- `id="top-nav"` is a stable selector for E2E.

**Blockers:** None.

---
*Phase: 01-app-shell-navigation*
*Plan: 04-app-shell-components*
*Completed: 2026-04-08*
