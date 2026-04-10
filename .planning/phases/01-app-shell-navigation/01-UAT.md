---
status: complete
phase: 01-app-shell-navigation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md]
started: 2026-04-10T10:17:00Z
updated: 2026-04-10T10:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running ministack. Run `make build-frontend && python -m uvicorn ministack.app:app --host 0.0.0.0 --port 4566`. Server boots without errors. Open `http://localhost:4566/_console/` — page loads with the MiniStack app shell. `curl http://localhost:4566/_ministack/health` returns health JSON.
result: pass

### 2. Console Home Page
expected: Navigate to `http://localhost:4566/_console/`. The page shows a "Console Home" heading with a description. Breadcrumb shows "Console". Sidebar on the left shows categorized services.
result: pass

### 3. Service Search (NAV-01)
expected: Click the search bar in the top navigation. Type "dyn". A filtered dropdown shows "DynamoDB". Click it. URL changes to `/services/dynamodb`. Breadcrumb updates to "Console > DynamoDB".
result: pass

### 4. Sidebar Navigation (NAV-02)
expected: Sidebar shows services grouped by category (Compute, Storage, Database, etc.). Services are alphabetically sorted within each category. Empty categories are hidden. Clicking "Lambda" navigates to `/services/lambda`.
result: pass

### 5. Breadcrumb Navigation (NAV-03)
expected: While on `/services/lambda`, breadcrumb shows "Console > Lambda". Click the "Console" breadcrumb link. URL returns to `/_console/` and Console Home is displayed.
result: pass

### 6. DynamoDB Resource Count (NAV-04)
expected: Navigate to `/services/dynamodb`. Page shows a heading "DynamoDB" and a resource count like "0 tables". A spinner appears briefly during loading.
result: pass

### 7. Lambda Resource Count (NAV-04)
expected: Navigate to `/services/lambda`. Page shows "Lambda" heading and a count like "0 functions".
result: pass

### 8. Uncounted Service Fallback (NAV-04)
expected: Navigate to `/services/s3`. Page shows "S3" heading with "Not available in Phase 1" or similar message instead of a count.
result: pass

### 9. Responsive Layout (NAV-05)
expected: At full width (1366px+), sidebar is visible alongside content. Resize browser to ~900px — sidebar collapses, no horizontal scrollbar appears. Content area remains usable.
result: pass

### 10. SPA Fallback (Deep Link)
expected: Directly navigate to `http://localhost:4566/_console/services/ec2` (type in address bar or hard-refresh). The page renders EC2 service home without a 404 — the SPA fallback serves index.html for all `/_console/*` routes.
result: pass

### 11. Services API Endpoint
expected: Run `curl http://localhost:4566/_console/api/services`. Returns a JSON array with 30+ service entries, each having `key`, `name`, and `category` fields. "cognito" appears as a key (alias collapsed from cognito-idp).
result: pass

### 12. AWS API Non-Regression (FOUND-03)
expected: With ministack running, S3 ListBuckets via curl returns valid XML response. `curl http://localhost:4566/_ministack/health` returns the standard health JSON. Existing AWS API emulation is unaffected by the console routes.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
