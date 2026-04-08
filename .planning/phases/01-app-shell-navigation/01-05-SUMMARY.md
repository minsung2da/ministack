---
phase: 01-app-shell-navigation
plan: 05
subsystem: frontend
tags: [wave-2, cloudscape, service-home, resource-counts, msw, tdd, nav-04]

requires:
  - phase: 01-app-shell-navigation/02
    provides: console-services-registry-endpoint
  - phase: 01-app-shell-navigation/03
    provides: spa-entry-point, use-services-hook, copy-module-centralized
  - phase: 01-app-shell-navigation/04
    provides: console-shell-component, test-util-basename-fix
provides:
  - counts-ts-fetcher-module
  - msw-per-file-setup-helper
  - service-home-nav-04
  - console-home-landing-page
  - not-found-page
  - counts-origin-absolute-url-fix
affects:
  - 01-app-shell-navigation/06  # E2E will exercise the real ServiceHome + counts

tech-stack:
  added: []
  patterns:
    - "TanStack Query useQuery driving countersByService[serviceKey]() with refetch() on error"
    - "DOMParser-based browser-native XML parsing of EC2 DescribeInstances — no external XML library per RESEARCH Don't Hand-Roll rule"
    - "MSW 2.x (already devDep from Plan 01) per-file opt-in via setupMswForTest() so Plan 04 vi.mock tests are not disturbed"
    - "counts.ts resolves URLs against window.location.origin so ky/undici accepts them in jsdom and browsers alike"
    - "Cloudscape KeyValuePairs + StatusIndicator for the happy-path rollup, Spinner inside Container for loading, Alert + Button for the error state"

key-files:
  created:
    - web/src/shared/api/counts.ts
    - web/src/test/msw.ts
    - web/src/test/msw-setup.ts
    - .planning/phases/01-app-shell-navigation/01-05-SUMMARY.md
  modified:
    - web/src/pages/ConsoleHome.tsx           # placeholder replaced with real Cloudscape Header + Container
    - web/src/pages/ServiceHome.tsx           # placeholder replaced with NAV-04 implementation
    - web/src/pages/NotFoundPage.tsx          # placeholder replaced with Header + Link back to /
    - web/src/__tests__/ServiceHome.test.tsx  # 2 real assertions (empty state + spinner)
    - web/src/__tests__/ServiceHomeEc2.test.tsx
    - web/src/__tests__/ServiceHomeError.test.tsx

key-decisions:
  - "Resource count URLs in counts.ts resolve against window.location.origin. ky delegates to globalThis.fetch and undici (Node's fetch) rejects bare relative URLs, so '/' POSTs threw 'Failed to parse URL from /' under vitest. Prefixing with window.location.origin ('http://localhost' in jsdom, the live origin in the browser) is isomorphic — same-origin semantics preserved in production, MSW can match in tests."
  - "Cloudscape Spinner does not expose role='status'. The loading-state assertion uses container.querySelector on the Cloudscape class prefix, matching the Plan 04 pattern for Cloudscape DOM-shape workarounds."
  - "MSW is installed per-file via setupMswForTest() rather than globally. Plan 04's test suite uses vi.mock and would break under onUnhandledRequest: 'error' if MSW were hoisted into the global test setup."
  - "Empty-state UI for count===0 uses a SpaceBetween column with the empty-state heading/body copy plus the formatted count line ('0 tables'). The assertion queries for '0 tables' so the test matches the count rendering, not the heading."

requirements-completed: [NAV-04]

metrics:
  duration_wall_clock: "~18m"
  duration_active: "~18m"
  completed_at: "2026-04-08T22:15:00Z"
  tasks: 2
  files_created: 3
  files_modified: 6
---

# Phase 01 Plan 05: Pages and Resource Counts Summary

**Wave 2 — shipped NAV-04 by replacing the three placeholder pages (`ConsoleHome`, `ServiceHome`, `NotFoundPage`) from Plan 03 with real Cloudscape implementations, added the `counts.ts` resource-count fetcher module with real DynamoDB/Lambda/EC2 counters (EC2 via browser-native `DOMParser`), and wired MSW 2.x into a per-file opt-in helper so the ServiceHome tests run real HTTP roundtrips without disturbing Plan 04's vi.mock-based shell tests.**

## Performance

- **Duration:** ~18 min (wall clock; most time spent diagnosing the ky/undici relative-URL blocker and the Cloudscape Spinner role-less DOM)
- **Started:** 2026-04-08T21:55:00Z
- **Completed:** 2026-04-08T22:15:00Z
- **Tasks:** 2 (TDD red, then implementation)
- **Files created:** 3 (+ this summary)
- **Files modified:** 6

## Accomplishments

- **NAV-04 (resource count + status rollup) — delivered.** `ServiceHome` at `/services/:serviceKey` now:
  - Runs a TanStack `useQuery` keyed on `['count', serviceKey]` against `countersByService[serviceKey]()`.
  - Shows a Cloudscape `<Spinner size="large">` wrapped in a `Container` during loading/refetching.
  - Shows a Cloudscape `<Alert type="error">` with the "Could not load resources" heading, a body that names the service, and a `<Button>Try Again</Button>` that calls `refetch()` on click.
  - Renders a `<KeyValuePairs columns={2}>` card on the happy path with a `Resources` row ("5 instances") and, when the counter provides a `states` rollup (EC2 only), a `Status` row containing a `<StatusIndicator>` with the per-state breakdown ("3 running, 2 stopped"). Status type is `success` (all running), `warning` (mixed running+stopped/terminated), or `info` (neither).
  - Handles three non-happy paths:
    - **No counter registered** (`!countersByService[serviceKey]` — e.g. s3, sqs, sns, iam, kms, secretsmanager): "Resource counts for {DisplayName} are not available in Phase 1."
    - **NaN count** (theoretical — `countUnsupported()` returns `NaN` for services passed through the counter map but unsupported): renders "—".
    - **Zero count** (DynamoDB with no tables, Lambda with no functions): renders the empty-state heading + body from the UI-SPEC Copywriting Contract, plus "0 {noun}" for the assertion.

- **counts.ts fetcher module.** Three real counters matching the RESEARCH §Pattern 7 contract:
  - `countDynamoDbTables()` — AWS JSON 1.0 `POST /` with `X-Amz-Target: DynamoDB_20120810.ListTables`, reads `TableNames.length`.
  - `countLambdaFunctions()` — `GET /2015-03-31/functions/`, reads `Functions.length`.
  - `countEc2Instances()` — EC2 query protocol `POST /` with `Action=DescribeInstances`, response parsed via browser-native `new DOMParser().parseFromString(text, 'application/xml')`; instance count from `<instanceId>` tags, state rollup from `<instanceState><name>…</name></instanceState>` tags. No external XML lib (per RESEARCH §Don't Hand-Roll).
  - `countUnsupported()` — returns `{ count: NaN, noun: 'resources' }` for the unused fallback path.
  - `countersByService` map registers real counters for `ec2`, `lambda`, `dynamodb` only; all other services fall through to the "not available in Phase 1" branch in `ServiceHome`.

- **ConsoleHome.** Cloudscape `<Header variant="h1">` with the copy-module heading and description, followed by a `<Container>` containing a one-line nav hint. No category grid yet — UI-SPEC describes that as a richer landing in Phase 2+; Plan 05's contract just required the Header per the must-haves list.

- **NotFoundPage.** `<Header variant="h1">Page not found</Header>` + `<Box>` body + a Cloudscape `<Link>` that calls `navigate('/')` on `onFollow` with `preventDefault()`.

- **MSW per-file helper.** `web/src/test/msw.ts` creates the `setupServer()` instance and re-exports `http`, `HttpResponse`; `web/src/test/msw-setup.ts` exports `setupMswForTest()` which registers `beforeAll(listen)` + `afterEach(resetHandlers)` + `afterAll(close)` hooks scoped to whichever test file imports it. The global `web/src/test/setup.ts` was intentionally left alone so Plan 04's `vi.mock`-based tests continue to pass without needing MSW handlers.

## Task Commits

1. **Task 1 (TDD RED) — counts.ts fetchers, MSW helpers, 4 real failing ServiceHome assertions:** `ac5800f` (test)
2. **Task 2 (GREEN) — implementations + counts.ts absolute-URL fix + Spinner class-based assertion:** `5bad571` (feat)

## Verification Evidence

All commands re-run in this session immediately before writing this summary:

```
$ cd web && npx tsc -b --noEmit
exit 0, no output

$ cd web && npx vitest run --reporter=dot
················
 Test Files  8 passed (8)
      Tests  16 passed (16)
   Duration  64.20s

$ cd web && npx vite build
✓ built in 20.97s
../ministack/static/console/index.html                              0.42 kB
../ministack/static/console/assets/index-DMSjUZZ8.js              326.74 kB
../ministack/static/console/assets/ConsoleShell-9RdHOA1u.js       358.62 kB
../ministack/static/console/assets/ServiceHome-MGPhImmy.js         11.84 kB
../ministack/static/console/assets/ConsoleHome-DTAyF6bt.js          0.50 kB
../ministack/static/console/assets/NotFoundPage-DVXfDBIj.js         0.97 kB
```

**Frontend test breakdown (16 passing, 0 skipped, 0 failed):**

| Test file | Tests | Status |
|---|---|---|
| `AppShell.test.tsx` | 2 | passed |
| `ServiceSearch.test.tsx` | 2 | passed |
| `ServiceSidebar.test.tsx` | 3 | passed |
| `Breadcrumbs.test.tsx` | 3 | passed |
| `copy.test.ts` | 2 | passed |
| `ServiceHome.test.tsx` | 2 | passed (empty state + spinner) |
| `ServiceHomeEc2.test.tsx` | 1 | passed (XML rollup) |
| `ServiceHomeError.test.tsx` | 1 | passed (error Alert + Try Again refetch) |

**TDD RED-GREEN cycle confirmation:**
- After Task 1 commit (`ac5800f`), running the three new ServiceHome test files gave: `Test Files 3 failed (3) / Tests 4 failed (4)` — the components were still Plan 03 placeholders.
- After Task 2 commit (`5bad571`), running the full vitest suite gives: `16 passed / 0 skipped / 0 failed`.

**EC2 XML rollup parsing — confirmed on the sample XML.** The `ServiceHomeEc2.test.tsx` test feeds a `<DescribeInstancesResponse>` body with 5 `<instanceId>` items (3 running, 2 stopped). The test asserts "5 instances" (total), "3 running", and "2 stopped" — all three assertions pass, proving `countEc2Instances()` walks the XML correctly and `statusFromRollup()` formats the breakdown.

**Final build bundle sizes:**
- `ConsoleShell-*.js`: 358.62 kB (103.51 kB gzip) — down from 596 kB in Plan 04's build. The drop is because Plan 04's initial chunk accidentally eagerly imported all Cloudscape surfaces through the shell; Plan 05's real page components (`ServiceHome`, `ConsoleHome`, `NotFoundPage`) pull their own Cloudscape imports into their own lazy chunks, so the shell chunk keeps only AppLayout + TopNavigation + SideNavigation + BreadcrumbGroup + Autosuggest.
- `ServiceHome-*.js`: 11.84 kB (4.41 kB gzip) — lazy chunk for the NAV-04 page.
- Total initial load (gzipped): `index-*.js` 104.21 kB + `index-*.css` 157.78 kB ≈ 262 kB, well inside the Phase 1 "dev tool, not a landing page" budget.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] ky + undici reject bare relative URLs in jsdom**

- **Found during:** Task 2 first GREEN run (all four ServiceHome assertions still failing after implementation).
- **Issue:** counts.ts was written exactly per the plan (`apiClient.post('/', …)`). In the browser, ky delegates to `globalThis.fetch` and fetch resolves `/` against `location.href`. Under vitest's jsdom environment, the jsdom URL is `http://localhost/` and `window.fetch` is actually **undici's node fetch** (not jsdom's `XMLHttpRequest`-backed fetch). Undici refuses relative URLs with `TypeError: Failed to parse URL from /`. This error was caught by TanStack Query and surfaced as the error state, so tests saw the `<Alert>` instead of the expected happy/empty/loading states.
- **Evidence:** A one-off `src/__tests__/_ky-check.test.tsx` probe logged `ERR Failed to parse URL from / TypeError` for an `apiClient.post('/')` call, and `jsdom` reported `window.location.href === 'http://localhost/'` (so the URL *should* have been resolvable).
- **Fix:** `counts.ts` now builds URLs as `` `${ORIGIN}/` `` where `ORIGIN = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''`. In the browser this is a no-op (same-origin request to `/`); in jsdom it becomes the absolute `http://localhost/` that undici happily parses. Applied to all three counters (`countDynamoDbTables`, `countLambdaFunctions`, `countEc2Instances`).
- **Files modified:** `web/src/shared/api/counts.ts`
- **Commit:** `5bad571` (Task 2 GREEN — the fix is part of the implementation commit because the tests cannot go green without it)
- **Verification:** Re-running the three ServiceHome test files after the fix took the count from 0/4 to 3/4 (the remaining failure was the Spinner role issue, fixed below). Full vitest suite: 16/16 passing.

**2. [Rule 1 — Test bug] Cloudscape Spinner has no `role="status"`**

- **Found during:** Task 2 second GREEN run (3 of 4 tests passing after Rule 3 fix).
- **Issue:** Plan 05's original test called `screen.getByRole('status')` to find the loading spinner. Inspection of `node_modules/@cloudscape-design/components/spinner/internal.js` shows that Cloudscape's `<Spinner>` is an unadorned `<span>` with two `<span>` circle children; it does not apply ARIA roles. `testing-library`'s role-based query therefore threw "Unable to find an accessible element with the role 'status'".
- **Fix:** The spinner assertion now uses `container.querySelector('[class*="spinner" i], [class*="size-large"]')` — matching either the Cloudscape root class prefix or the `size-large` class that we pass to `<Spinner size="large">`. This matches the Plan 04 pattern for Cloudscape DOM-shape workarounds (document.querySelector by stable class/attribute).
- **Files modified:** `web/src/__tests__/ServiceHome.test.tsx`
- **Commit:** `5bad571` (same GREEN commit)
- **Verification:** Spinner test passes; full suite 16/16.

### Plan Deviations (documented, not "auto-fixed")

None. ConsoleHome, ServiceHome, and NotFoundPage implementations match the plan code exactly. The counts.ts fetcher signatures and the `countersByService` map match the plan exactly; only the URL strings are prefixed with `ORIGIN`.

## Threat Model Compliance

| Mitigation | Status |
|---|---|
| DOMParser for EC2 XML (safer than regex/innerHTML) | **Done** — `new DOMParser().parseFromString(text, 'application/xml')` |
| `textContent` extraction for XML state names | **Done** — `nameEl?.textContent ?? 'unknown'` |
| No eval, no Function constructor, no dangerouslySetInnerHTML | **Done** — `grep -r 'dangerouslySetInnerHTML\|eval\|new Function' web/src/` returns nothing |
| ky `timeout: 5000` prevents hanging on a wedged backend | **Done** — unchanged from Plan 03 `client.ts` |
| `countUnsupported()` path renders a static string (no user input) | **Done** — the `"Resource counts for {displayName} are not available in Phase 1"` branch uses `displayName` which comes from the server-controlled `/_console/api/services` registry, React JSX auto-escapes, no innerHTML |

**Residual (unchanged from plan):** if ministack ever adds user-uploaded EC2 instance tags to the `DescribeInstances` response, the XML parsing already extracts names via `textContent` (XSS-safe) and React escapes on render, so the current implementation is resilient. The plan's residual risk note is preserved for the Phase 2 audit.

## Known Stubs

None introduced by this plan. The plan fills the three Plan 03 placeholder pages. No new placeholders are left behind.

The ConsoleHome landing page is **intentionally minimal** (header + one-line nav hint) rather than the "grid of category cards with service counts" mentioned in UI-SPEC §Routing Contract. The plan's Copywriting Contract only required the Header + description, and the category-grid landing is Phase 2+ work (it depends on per-category aggregation that is out of scope for NAV-04). This is not a stub — it's the Phase 1 contract.

## Self-Check: PASSED

**Files created (`test -f` verified):**
- `web/src/shared/api/counts.ts` FOUND
- `web/src/test/msw.ts` FOUND
- `web/src/test/msw-setup.ts` FOUND
- `.planning/phases/01-app-shell-navigation/01-05-SUMMARY.md` FOUND (this file)

**Files modified (post-condition contracts re-verified by grep):**
- `web/src/pages/ConsoleHome.tsx`: contains `copy.consoleHomeHeading`, no `placeholder` text — FOUND
- `web/src/pages/ServiceHome.tsx`: contains `countersByService[serviceKey]`, `StatusIndicator`, `copy.serviceHomeErrorRetry`, no `placeholder` — FOUND
- `web/src/pages/NotFoundPage.tsx`: contains `copy.notFoundHeading`, no `placeholder` — FOUND
- `web/src/shared/api/counts.ts`: contains `countEc2Instances`, `countLambdaFunctions`, `countDynamoDbTables`, `DOMParser`, `countersByService` — FOUND
- `web/src/test/msw-setup.ts`: contains `mswServer.listen` — FOUND
- `web/src/test/setup.ts`: does NOT contain `mswServer` (Plan 04 tests remain untouched) — VERIFIED

**Commits verified present (`git log --oneline -3`):**
- `5bad571` feat(01-05): implement ConsoleHome, ServiceHome (NAV-04), NotFoundPage — FOUND
- `ac5800f` test(01-05): add failing ServiceHome tests + counts.ts + MSW helpers — FOUND

**Verification commands re-ran in this session, all green:**
- `cd web && npx tsc -b --noEmit` → exit 0
- `cd web && npx vitest run --reporter=dot` → 16 passed, 0 skipped, 0 failed
- `cd web && npx vite build` → built in 20.97s, `ministack/static/console/index.html` emitted

## Success Criteria Check

- [x] **NAV-04 Count:** ServiceHome at `/services/dynamodb` shows "0 tables" when ListTables returns empty (`ServiceHome.test.tsx` passing)
- [x] **NAV-04 Rollup:** ServiceHome at `/services/ec2` parses DescribeInstances XML and shows count + running/stopped rollup (`ServiceHomeEc2.test.tsx` passing — 5 instances / 3 running / 2 stopped)
- [x] **NAV-04 Loading:** Cloudscape Spinner rendered while the count query is in-flight (`ServiceHome.test.tsx` spinner assertion passing)
- [x] **NAV-04 Error:** Alert with "Try Again" button rendered on fetch error; click triggers `refetch()` and the happy path renders on the second attempt (`ServiceHomeError.test.tsx` passing)
- [x] **NAV-04 Unsupported:** Services without a counter render the "not available in Phase 1" fallback (implementation branch exists; covered by the code path under the `!counter` check)
- [x] **ConsoleHome:** Header + description + nav hint rendered per UI-SPEC
- [x] **NotFoundPage:** "Page not found" + link back to `/` rendered
- [x] `npx tsc -b --noEmit` exits 0
- [x] `npx vitest run` exits 0 (full suite: 16 passed / 0 failed)
- [x] `npx vite build` exits 0 and re-emits hashed assets at `/_console/assets/*`

## Next Plan Readiness

**Ready for Plan 06 (E2E + a11y):**
- `ServiceHome` is now a real, stateful page — Plan 06 Playwright can point at `/_console/services/ec2` against a live ministack backend and assert a real rollup table, not a placeholder div.
- Error-state regression is already covered by the vitest MSW harness; Plan 06 can focus on live end-to-end flows (click through from sidebar → service page, keyboard-accessible retry, a11y scan against the real DOM).
- All 16 vitest tests are green and none skipped. Plan 06 starts from a fully green unit-test baseline.

**Blockers:** None.

---
*Phase: 01-app-shell-navigation*
*Plan: 05-pages-and-resource-counts*
*Completed: 2026-04-08*
