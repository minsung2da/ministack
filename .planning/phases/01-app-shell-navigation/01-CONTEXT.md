# Phase 1: App Shell & Navigation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the SPA foundation: React + Cloudscape app shell served from the existing ASGI app, with global navigation (service search, per-service sidebar, breadcrumbs) and Console API layer for UI-backend communication. This phase delivers the navigation skeleton that all subsequent service dashboards plug into.

</domain>

<decisions>
## Implementation Decisions

### Console API Design
- **D-01:** Frontend calls AWS API endpoints on :4566 directly (like boto3/CLI), NOT a separate Console API. The frontend acts as an AWS client.
- **D-02:** Responses follow AWS-compatible JSON format. No custom response transformation layer.
- **D-03:** Claude's Discretion: XML parsing strategy for EC2-style services (frontend fast-xml-parser vs backend JSON conversion layer vs hybrid). Choose the approach that minimizes complexity.

### Service Navigation
- **D-04:** Services grouped by AWS category (Compute, Storage, Database, Networking, etc.) matching the AWS Console classification.
- **D-05:** Typeahead search — keyword input immediately filters matching services.
- **D-06:** Service home pages show resource count + status summary (e.g., "Instances 5 (3 running, 2 stopped)").

### Build & Deploy Pipeline
- **D-07:** Docker multi-stage build — Node stage builds the SPA, Python stage copies static assets.
- **D-08:** Development mode: Vite dev server on port 6655, proxying API calls to Python backend on port 5566.
- **D-09:** Production: Static SPA files served from the existing ASGI app under `/_console/` path.

### Layout & UX
- **D-10:** AWS Console clone layout via Cloudscape AppLayout — fixed top header, collapsible left sidebar, main content area.
- **D-11:** Claude's Discretion: URL routing pattern (hash-based vs history-based, exact path structure). Choose the approach that's simplest to integrate with the raw ASGI handler.

### Claude's Discretion
- XML parsing strategy (D-03)
- URL routing pattern (D-11)
- Frontend project structure and directory layout
- SPA fallback routing implementation in ASGI handler

### Folded Todos
(None)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Integration
- `ministack/app.py` — Main ASGI handler, SERVICE_HANDLERS dict (line ~90), `/_ministack/` internal endpoints
- `ministack/core/router.py` — Service detection patterns (how AWS headers/paths map to services)

### Existing Internal Endpoints
- `ministack/app.py:276` — `/_ministack/reset` endpoint (POST, resets all state)
- `ministack/app.py:282` — `/_ministack/config` endpoint (POST, runtime config)
- `ministack/app.py:379` — Health check endpoints (`/_ministack/health`, `/health`)

### Service Module Pattern
- `ministack/services/ec2.py` — Most complex service (3,175 lines), state dicts at module level (_instances, _vpcs, etc.)
- `ministack/services/s3.py` — S3 service handler pattern
- `ministack/services/__init__.py` — Service module exports

### Research
- `.planning/research/STACK.md` — Technology stack recommendations (React 19, Cloudscape v3, Vite 6, TanStack Query v5)
- `.planning/research/ARCHITECTURE.md` — System architecture and integration patterns
- `.planning/research/PITFALLS.md` — Domain pitfalls (route collision #2, SPA serving #7)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SERVICE_HANDLERS` dict in `app.py` — Complete mapping of 35 service keys to handlers. Source of truth for service navigation list.
- `SERVICE_NAME_ALIASES` dict — Maps alternative names to canonical service keys.
- `_reset_all_state()` function — Already resets all service state (useful for Phase 5 DIFF-01).

### Established Patterns
- Raw ASGI handler (no framework) — `/_ministack/` prefix pattern for internal routes. Console should follow similar `/_console/` prefix.
- Module-level state dicts — Each service stores state in module globals (e.g., `ec2._instances`, `s3._buckets`). Console API can import and read these directly.
- `_send_response()` helper �� Used by all internal endpoints to send HTTP responses.

### Integration Points
- `app.py` ASGI handler: New `/_console/` route check must be added BEFORE AWS service dispatch to avoid route collision.
- `Dockerfile`: Needs multi-stage build to include Node.js build step.
- `docker-compose.yml`: Port mapping may need updating for development mode (5566 instead of 4566).

</code_context>

<specifics>
## Specific Ideas

- User wants the console to feel like the real AWS Console — same layout, same service grouping, same navigation patterns.
- Development ports explicitly chosen: Vite :6655, Python API :5566 (not defaults).
- Frontend acts as an AWS client — no intermediate API layer between UI and emulator.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-app-shell-navigation*
*Context gathered: 2026-04-05*
