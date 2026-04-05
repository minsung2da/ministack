# Domain Pitfalls

**Domain:** AWS Console-style Web UI for Local Emulator (35+ services)
**Researched:** 2026-04-05

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Per-Service UI Code Explosion

**What goes wrong:** Building bespoke UI components for each of the 35+ services creates an unmaintainable codebase. Each service gets its own list view, detail view, create form, and edit form. At 4 views per service, that is 140+ UI files with duplicated patterns (table columns, filter bars, pagination, CRUD modals). When a shared pattern needs changing (e.g., switching table libraries), you touch 35+ files.

**Why it happens:** Developers start with one service (EC2), build it well, then copy-paste the pattern for S3, Lambda, etc. Each copy drifts slightly. Six months later, there are 35 variants of "resource table with actions."

**Consequences:** Feature development slows exponentially. Bug fixes require touching dozens of files. New services take days instead of hours to add. Onboarding developers becomes painful.

**Prevention:** Build a data-driven, schema-based UI system. Each service declares a descriptor/manifest (JSON or TypeScript object) that describes: columns, filterable fields, detail layout, available actions, create form schema. A single set of generic components (ResourceTable, ResourceDetail, ResourceForm) renders everything from these descriptors. Adding a new service should require only a new descriptor file, not new components.

**Detection:** Early warning signs:
- More than 3 service UIs exist before a shared component library is established
- Copy-pasting a previous service's UI code to start a new one
- "ResourceTable" or equivalent exists in more than one form

**Phase mapping:** Must be solved in Phase 1 (foundation). Building even 2-3 services without the generic system creates technical debt that compounds.

---

### Pitfall 2: ASGI Route Collision Between AWS API and Web UI

**What goes wrong:** MiniStack's `app()` function at line 185 of `app.py` is a raw ASGI handler that processes every HTTP request on port 4566. It uses AWS-specific headers (`x-amz-target`, `authorization` with AWS4 signatures) and path patterns (`/2015-03-31/functions/` for Lambda, `/{bucket}` for S3) to route to service handlers. Adding web UI routes to this same handler creates ambiguity: is `/ec2` an S3 bucket named "ec2" accessed via virtual-hosted style, or the EC2 dashboard page?

**Why it happens:** The constraint says "integrate UI on port 4566, no separate server." The existing routing relies on heuristics (headers, path patterns) that were designed assuming all traffic is AWS SDK traffic. Web browser requests lack AWS headers and can clash with S3 path-based routing.

**Consequences:** Browser requests to `/dashboard/s3` could be misinterpreted as S3 API calls. AWS SDK requests could accidentally hit UI routes. Debugging becomes nightmarish because failures are silent misroutes.

**Prevention:**
1. Use a clear, non-colliding prefix for all UI routes: `/_console/` or `/_ui/`. The underscore-prefix convention prevents collision with S3 bucket names (AWS bucket names cannot start with underscore).
2. Add UI route detection **before** the AWS service dispatch logic in `app()`. Check: if path starts with `/_console/` and no AWS auth headers present, serve the web UI. Otherwise, fall through to existing AWS routing.
3. Serve the SPA's `index.html` for all `/_console/*` paths that do not match a static asset (JS, CSS, images). This is the standard SPA fallback pattern.

**Detection:**
- Any 404 or unexpected response when accessing the UI in a browser
- AWS CLI commands returning HTML instead of XML/JSON
- S3 operations on buckets whose names match UI route segments

**Phase mapping:** Must be designed in Phase 1 (routing layer). Retrofitting route separation after services are built risks breaking existing AWS API compatibility -- MiniStack's core value.

---

### Pitfall 3: Over-Replicating the Real AWS Console

**What goes wrong:** Teams try to make the UI look and behave exactly like the real AWS Console. They implement Cloudscape Design System components, replicate the exact navigation hierarchy, match pixel-perfect layouts, and chase feature parity with console features that make no sense for a local emulator (regions selector with one region, account dropdown with no auth, billing links).

**Why it happens:** "AWS Console style" is interpreted as "clone the AWS Console" rather than "inspired by the AWS Console's UX patterns." Cloudscape Design System (the open-source AWS console component library) is technically available but adds heavy React dependency overhead and is designed for a much larger product.

**Consequences:** Development time balloons. The UI becomes bloated with non-functional elements. Users are confused by UI elements that do nothing (region selector, account info). Maintenance burden of tracking Cloudscape updates. The local dev tool loses its "lightweight" identity.

**Prevention:**
1. Define a "pragmatic console" design philosophy: borrow the *information architecture* (service sidebar, resource tables, breadcrumb navigation) but not the *visual skin* or non-functional chrome.
2. Use a lightweight component library (shadcn/ui, Radix) rather than Cloudscape. Cloudscape is 60+ components designed for AWS-scale products -- overkill for a dev tool.
3. Explicitly list "out of scope" UI elements: region selector (single region), account switcher (no auth), billing, IAM policy simulator, CloudShell, etc.
4. Focus on what local dev users actually need: see resources, create/edit/delete, check state quickly. Speed and clarity over fidelity.

**Detection:**
- Spending time on UI elements that have no backing functionality
- Importing Cloudscape when simpler alternatives exist
- Users reporting the UI feels "heavy" or "slow to load"

**Phase mapping:** Design decision in Phase 1. Must be documented as a principle before any UI work begins.

---

### Pitfall 4: Frontend-Backend State Synchronization Mismatch

**What goes wrong:** MiniStack services store state in memory (Python dicts/lists). The web UI fetches this state via API calls, but there is no notification mechanism when state changes. User creates an EC2 instance via AWS CLI while the browser shows the EC2 dashboard -- the dashboard shows stale data until manually refreshed. Worse: the UI might cache aggressively, and create/delete operations from the UI might conflict with concurrent CLI operations.

**Why it happens:** The existing MiniStack architecture is request-response only (AWS API compatibility). There is no event bus, no change notifications, no WebSocket support. Adding real-time sync requires new infrastructure in the Python backend.

**Consequences:** Users see stale data and lose trust in the UI. They refresh constantly, defeating the purpose of a dashboard. Race conditions between UI and CLI operations create confusing states.

**Prevention:**
1. **Phase 1: Start with simple polling.** The UI polls for resource lists every 3-5 seconds on active pages. This is ugly but functional and requires zero backend changes.
2. **Phase 2: Add a lightweight internal REST API.** Create `/_console/api/` endpoints that wrap existing service handlers, returning JSON (not XML). These endpoints can add pagination, filtering, and sorting that the AWS XML APIs lack.
3. **Phase 3 (optional): Add SSE (Server-Sent Events).** SSE is simpler than WebSockets for server-to-client push. Add hooks in service handlers that emit events when resources change. The UI subscribes via `EventSource`. Do NOT use WebSockets -- SSE is sufficient for "resource changed" notifications and much simpler to implement in ASGI.

**Detection:**
- Users reporting "I created X via CLI but the UI doesn't show it"
- UI showing deleted resources
- Building WebSocket infrastructure before validating that polling is insufficient

**Phase mapping:** Polling in Phase 1, internal API in Phase 2, SSE in Phase 3+. Premature WebSocket implementation is a common time sink.

---

## Moderate Pitfalls

### Pitfall 5: Ignoring Performance with Large Resource Lists

**What goes wrong:** A user creates 10,000 DynamoDB items, 5,000 S3 objects, or 500 EC2 instances for testing. The UI tries to render all of them in a single table, causing the browser to freeze. Or the backend serializes all 10,000 items into JSON on every poll, creating a 10MB response that takes seconds.

**Prevention:**
1. **Server-side pagination from day one.** The internal console API must accept `limit` and `nextToken` parameters. Default page size: 50 items. This is non-negotiable -- never return unbounded lists.
2. **Virtual scrolling for tables.** Use TanStack Table with virtual row rendering. Only DOM nodes for visible rows are created.
3. **Backend response capping.** The console API should hard-cap responses at 1,000 items regardless of what the client requests. If users need more, they paginate.

**Detection:**
- Any API endpoint that returns a list without a `limit` parameter
- Browser DevTools showing responses larger than 500KB for list endpoints
- UI lag when scrolling resource tables

**Phase mapping:** Pagination must be in the internal API design from Phase 1. Virtual scrolling can be Phase 2 optimization.

---

### Pitfall 6: Building a REST API Layer That Duplicates Existing Service Logic

**What goes wrong:** Developers create new `/api/ec2/instances` endpoints that re-implement EC2 listing logic instead of calling the existing `ec2.handle_request()` internally. This creates two sources of truth: the AWS-compatible handler and the console API handler. When the AWS handler gets updated, the console API falls behind.

**Prevention:**
1. The console API should **call the existing service handlers internally**, not reimplement them. Construct a fake ASGI scope/request that mimics the AWS API call, invoke the existing handler, then transform the XML/JSON response into a UI-friendly JSON format.
2. Alternatively, build a thin translation layer: console API calls `ec2.handle_request()` with the right parameters, parses the AWS-format response, and re-serializes as clean JSON.
3. Keep transformation logic minimal and in one place per service (a `console_adapter` module).

**Detection:**
- Console API code that contains service business logic (creating resources, validating parameters)
- Discrepancies between AWS CLI output and console UI output for the same resource
- Console API files growing beyond simple request/response transformation

**Phase mapping:** Architecture decision in Phase 1. The internal call pattern must be established before any service UI is built.

---

### Pitfall 7: SPA Routing vs Static File Serving in ASGI

**What goes wrong:** The SPA uses client-side routing (React Router, Vue Router). User navigates to `/_console/ec2/instances`, then refreshes the browser. The ASGI server receives a request for `/_console/ec2/instances`, finds no static file at that path, and returns 404. The SPA never loads.

**Prevention:**
1. Implement a custom static file handler (not Starlette's default `StaticFiles`) that falls back to `index.html` for any `/_console/*` path that is not a known static asset (.js, .css, .png, .svg, .woff2).
2. The fallback logic: if path starts with `/_console/` AND does not match a file in the static assets directory AND does not start with `/_console/api/`, serve `index.html`.
3. Set proper cache headers: static assets with content hashes get `Cache-Control: max-age=31536000, immutable`. `index.html` gets `Cache-Control: no-cache` (must revalidate).

**Detection:**
- 404 errors on browser refresh at any `/_console/` sub-path
- Blank page after refresh but works with client-side navigation
- Stale UI after deployment (cached `index.html` referencing old asset hashes)

**Phase mapping:** Phase 1 (routing foundation). This is a one-time setup but must be correct from the start.

---

### Pitfall 8: Bundling Frontend Assets Into the Python Package Incorrectly

**What goes wrong:** The frontend is a separate build step (npm build) that produces static assets. These assets need to ship inside the Docker image and/or Python package. Common mistakes: forgetting to include the build step in Dockerfile, assets not in `MANIFEST.in` or `pyproject.toml` package data, assets built with wrong `PUBLIC_URL`/`base` path, development-mode assets (unminified, with source maps) shipped to production.

**Prevention:**
1. Add a `web/` directory at project root for the frontend source. Build output goes to `ministack/static/` (inside the Python package).
2. In `Dockerfile`: add a multi-stage build. Stage 1: `node:lts-alpine` builds the frontend. Stage 2: Python image copies built assets from stage 1.
3. In `pyproject.toml`: include `ministack/static/**` in package data.
4. Set the SPA's base path to `/_console/` at build time.
5. Add a `Makefile` or script target: `make build-frontend` that runs the npm build and copies output.

**Detection:**
- Docker image works but `pip install ministack` does not serve the UI
- 404 for JS/CSS files in production but works in dev
- Source maps or unminified JS visible in production

**Phase mapping:** Phase 1 (build system). Set up the full build pipeline before writing UI code.

---

## Minor Pitfalls

### Pitfall 9: Choosing a Frontend Framework That Conflicts With Lightweight Philosophy

**What goes wrong:** Choosing a heavy framework (Next.js, Nuxt, Angular) for what is essentially a static SPA served from a Python backend. Server-side rendering makes no sense here (no SEO, no public pages). Heavy frameworks add build complexity and bundle size.

**Prevention:** Use a lightweight SPA setup: Vite + React (or Vue/Svelte). No SSR framework needed. The output is static HTML/JS/CSS served by the ASGI handler. Vite provides fast dev experience and optimized production builds.

**Detection:**
- Framework includes server runtime that is not used
- Bundle size exceeds 500KB gzipped for initial load
- Build step takes more than 30 seconds

**Phase mapping:** Technology decision in Phase 1.

---

### Pitfall 10: No Service Discovery / Registry for Dynamic UI Generation

**What goes wrong:** The UI hardcodes the list of available services. When a new service is added to MiniStack, someone must also update the frontend navigation, add a new service descriptor, and rebuild. If MiniStack uses `SERVICES=s3,ec2` to filter active services, the UI still shows all 35+ services with most returning errors.

**Prevention:**
1. Add a `/_console/api/services` endpoint that returns the list of currently active services (from `SERVICE_HANDLERS.keys()`).
2. The UI navigation dynamically renders only active services.
3. Service descriptors should be loadable by service name, so the UI can gracefully handle "descriptor not yet built" by showing a generic resource list.

**Detection:**
- Navigation showing services that return errors when clicked
- Adding a new MiniStack service requires frontend code changes beyond a descriptor file
- UI breaks when `SERVICES` env var filters services

**Phase mapping:** Phase 1 (service registry endpoint). Phase 2+ (graceful fallback for undescribed services).

---

### Pitfall 11: Forgetting CORS for Development Workflow

**What goes wrong:** During development, the frontend dev server (Vite on port 5173) makes API calls to the ASGI backend (port 4566). Browsers block these cross-origin requests. Developers waste hours debugging "API not working" before realizing it is CORS.

**Prevention:**
1. Add CORS headers to `/_console/api/*` responses during development: `Access-Control-Allow-Origin: *` (dev only).
2. Better: configure Vite's dev server to proxy `/_console/api/*` requests to `localhost:4566`. This avoids CORS entirely during development and matches the production setup.
3. In production, CORS is not needed because frontend and backend share the same origin.

**Detection:**
- Browser console showing "blocked by CORS policy" errors
- API calls working in Postman but not from the browser
- Developers adding `Access-Control-Allow-Origin: *` to production code

**Phase mapping:** Phase 1 (dev tooling setup). Five-minute fix but saves hours of confusion.

---

### Pitfall 12: AWS XML Response Parsing Overhead in the UI

**What goes wrong:** Some MiniStack services return AWS-compatible XML responses (EC2, S3). The console API must parse this XML into JSON for the frontend. Developers either: (a) skip this and try to parse XML in the browser (terrible DX), or (b) build fragile regex-based XML parsers in Python, or (c) parse XML correctly but do it on every request, adding latency.

**Prevention:**
1. The console adapter layer should use Python's `xml.etree.ElementTree` (stdlib) for XML parsing. No regex.
2. For services that return JSON (DynamoDB, Lambda, Step Functions), pass through directly.
3. Consider adding a `_format=json` parameter to the internal service handlers over time, so they can optionally skip XML serialization. This is a gradual optimization, not a prerequisite.

**Detection:**
- JavaScript code containing XML parsing logic
- Console API responses containing XML strings inside JSON
- Response latency visibly higher for XML-based services (EC2, S3) vs JSON-based (DynamoDB)

**Phase mapping:** Phase 2 (console adapter layer). Not blocking but affects perceived performance.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation / Routing | Route collision with AWS API (Pitfall 2) | Use `/_console/` prefix, detect before AWS dispatch |
| Foundation / Architecture | Per-service code explosion (Pitfall 1) | Schema-driven generic components from day one |
| Foundation / Build | SPA fallback routing (Pitfall 7) | Custom static file handler with index.html fallback |
| Foundation / Build | Asset bundling (Pitfall 8) | Multi-stage Docker build, package data config |
| Foundation / Dev Setup | CORS during development (Pitfall 11) | Vite proxy config to backend |
| Service UIs | Logic duplication (Pitfall 6) | Console adapter calls existing handlers internally |
| Service UIs | Large list performance (Pitfall 5) | Server-side pagination, virtual scrolling |
| Design | Over-replicating AWS Console (Pitfall 3) | Pragmatic console philosophy, lightweight components |
| State Sync | Stale data in UI (Pitfall 4) | Polling first, SSE later, never premature WebSocket |
| Maintenance | Service discovery (Pitfall 10) | Dynamic service registry endpoint |

## Sources

- [Starlette SPA Static Files Pattern](https://www.crccheck.com/blog/serving-spas-from-starlette/) - SPA fallback routing in Starlette
- [Cloudscape Design System](https://cloudscape.design/) - AWS's open-source console component library (60+ components, Apache 2.0)
- [Feature-Sliced Design: Micro-Frontends](https://feature-sliced.design/blog/micro-frontend-architecture) - When monolith vs micro-frontend for large admin UIs
- [Feature-Sliced Design: Frontend Architectures](https://feature-sliced.design/blog/frontend-architecture-guide) - 2025 frontend architecture patterns
- [HN: AWS Console UX Discussion](https://news.ycombinator.com/item?id=24264428) - Community insights on AWS Console pain points
- [HN: AWS Open-Sourced Console Design System](https://news.ycombinator.com/item?id=32214622) - Discussion on Cloudscape adoption tradeoffs
- [LocalStack Desktop](https://docs.localstack.cloud/aws/capabilities/web-app/localstack-desktop/) - Competitor approach to local AWS UI
- [React Virtual Scrolling Performance](https://www.zigpoll.com/content/how-can-i-optimize-the-rendering-performance-of-large-datasets-in-a-react-dashboard-using-virtualization-techniques) - Virtualization techniques for large datasets
- [Polling vs WebSockets 2025](https://medium.com/israeli-tech-radar/dont-forget-the-user-polling-vs-websockets-in-2025-cb99999db9be) - Real-time communication strategy guidance
- [Python ASGI Servers 2026](https://www.deployhq.com/blog/python-application-servers-in-2025-from-wsgi-to-modern-asgi-solutions) - ASGI deployment patterns and pitfalls
