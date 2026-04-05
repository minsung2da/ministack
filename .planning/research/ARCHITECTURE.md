# Architecture Patterns

**Domain:** AWS Console-style Web UI integrated with Python ASGI backend
**Researched:** 2026-04-05

## Recommended Architecture

**Approach:** Pre-built SPA served as static files from the existing raw ASGI app, with a dedicated `/_console/api/` namespace for UI-specific REST endpoints that read directly from service module state.

```
Browser (port 4566)
  |
  +-- /_console/*  ---------> Static file serving (SPA: React + Vite)
  |     |
  |     +-- /_console/api/*  --> Console API handlers (read service state)
  |     +-- /_console/*      --> SPA fallback (index.html)
  |
  +-- AWS API requests -----> Existing service handlers (unchanged)
       (Authorization header, X-Amz-Target, etc.)
```

### Why This Architecture

1. **Single port (4566):** Project constraint. No separate frontend server.
2. **No framework dependency:** The existing app is a raw ASGI handler (`async def app(scope, receive, send)`). Adding Starlette/FastAPI as a dependency would be a significant change to a lightweight project with only 4 dependencies (uvicorn, httptools, docker, cbor2). Instead, implement minimal static file serving and API routing directly in the ASGI handler.
3. **Pre-built SPA:** The React app is built at Docker image build time (or npm build time). The Python app serves the resulting `dist/` directory as static files. No Node.js runtime needed at serve time.
4. **Direct state access:** Console API handlers import service modules and read their module-level state dictionaries (`sqs._queues`, `s3._buckets`, `ec2._instances`, etc.) directly. No HTTP-to-HTTP proxying. This is the key architectural advantage of co-locating the UI in the same process.

## Component Boundaries

### Backend Components

| Component | Responsibility | Location | Communicates With |
|-----------|---------------|----------|-------------------|
| ASGI Router (existing) | Dispatch AWS API requests to service handlers | `ministack/app.py` | Service handlers |
| Console Router (new) | Intercept `/_console/*` paths before AWS routing | `ministack/console/router.py` | Console API, Static Server |
| Console API (new) | REST endpoints that read/write service state for UI | `ministack/console/api/` | Service modules directly |
| Static File Server (new) | Serve pre-built SPA assets from `dist/` | `ministack/console/static.py` | Filesystem only |
| Service Handlers (existing) | AWS API emulation, state management | `ministack/services/*.py` | Core modules, in-memory state |

### Frontend Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| App Shell | Global nav, service search, layout | `web/src/App.tsx` |
| Service Registry | Maps service names to lazy-loaded dashboard modules | `web/src/services/registry.ts` |
| Service Dashboard (per service) | CRUD UI for one AWS service | `web/src/services/{service}/` |
| Shared Components | Tables, forms, status badges, JSON viewer | `web/src/components/` |
| API Client | Typed fetch wrapper for `/_console/api/*` | `web/src/lib/api.ts` |
| State Layer | React Query for server state, minimal local state | `web/src/lib/` |

## Data Flow

### Read Flow (e.g., List EC2 Instances)

```
1. User navigates to /_console/#/ec2/instances
2. React Router renders EC2InstanceList component
3. Component calls useQuery('ec2-instances', () => api.get('/ec2/instances'))
4. api.get fetches GET /_console/api/ec2/instances
5. ASGI app.py intercepts /_console/* path (before AWS routing)
6. Console router dispatches to ec2 API handler
7. Handler imports ministack.services.ec2, reads ec2._instances dict
8. Handler transforms state into JSON response [{id, type, state, ...}]
9. Response flows back through ASGI -> fetch -> React Query cache -> component render
```

### Write Flow (e.g., Start EC2 Instance)

```
1. User clicks "Start" button on instance row
2. Component calls mutation: api.post('/ec2/instances/i-xxx/start')
3. Console API handler calls ec2 internal function to change state
4. Handler returns updated instance state
5. React Query invalidates 'ec2-instances' query -> refetch
```

### Critical Design Decision: Console API vs AWS API Reuse

**Use a dedicated Console API, do NOT reuse the AWS API from the frontend.**

Reasons:
- AWS API responses are XML/complex JSON with AWS-specific schemas. Parsing them in the frontend adds unnecessary complexity.
- The console needs aggregated views (e.g., "EC2 dashboard" combining instances, VPCs, subnets, security groups). AWS API requires N separate calls.
- Console API can return exactly the shape the UI needs -- flat JSON with only relevant fields.
- The AWS API must remain untouched for SDK/CLI compatibility. UI concerns should never influence AWS API response format.

The Console API handlers are thin adapters: they import service modules, read state, and reshape it for the UI. Example:

```python
# ministack/console/api/ec2.py
from ministack.services import ec2

async def list_instances(query_params):
    """Return instances in UI-friendly format."""
    instances = []
    for iid, inst in ec2._instances.items():
        instances.append({
            "instanceId": iid,
            "instanceType": inst.get("instanceType", "t2.micro"),
            "state": inst.get("instanceState", {}).get("name", "unknown"),
            "launchTime": inst.get("launchTime", ""),
            "vpcId": inst.get("vpcId", ""),
            "subnetId": inst.get("subnetId", ""),
            "privateIp": inst.get("privateIpAddress", ""),
            "tags": inst.get("tagSet", []),
        })
    return 200, {"Content-Type": "application/json"}, json.dumps(instances).encode()
```

## Integration Point: ASGI app.py

The integration requires minimal changes to `app.py`. Add a single path prefix check early in the request handling, before AWS service detection:

```python
# In app.py async def app(scope, receive, send):
# ... after body parsing, BEFORE AWS routing ...

# Console UI -- must come before AWS service detection
if path.startswith("/_console/"):
    from ministack.console.router import handle_console_request
    status, resp_headers, resp_body = await handle_console_request(
        method, path, headers, body, query_params
    )
    await _send_response(send, status, resp_headers, resp_body)
    return

# ... existing AWS routing continues unchanged ...
```

This is non-invasive: one `if` block, one import, same `_send_response` pattern used everywhere else. No changes to any existing service handler.

## Console Router Internal Design

```python
# ministack/console/router.py

async def handle_console_request(method, path, headers, body, query_params):
    # API endpoints: /_console/api/{service}/{resource}
    if path.startswith("/_console/api/"):
        return await dispatch_api(method, path, headers, body, query_params)

    # Static files: /_console/{path} -> dist/{path}
    # SPA fallback: any non-file path -> dist/index.html
    return await serve_static(path)
```

## Frontend Architecture

### Directory Structure

```
web/
  src/
    App.tsx                    # Shell: sidebar + header + router outlet
    main.tsx                   # Entry point
    components/                # Shared UI components
      DataTable.tsx            # Generic sortable/filterable table
      ResourceDetail.tsx       # Generic detail view with tabs
      StatusBadge.tsx          # Running/Stopped/etc indicator
      JsonViewer.tsx           # Collapsible JSON tree
      SearchBar.tsx            # Global service search
      ConfirmDialog.tsx        # Delete/stop confirmations
      FormField.tsx            # Generic form field
    lib/
      api.ts                   # fetch wrapper for /_console/api/*
      query.ts                 # React Query configuration
      types.ts                 # Shared TypeScript types
    services/
      registry.ts              # Service metadata + lazy import map
      ec2/
        index.tsx              # Lazy-loaded entry (route config)
        InstanceList.tsx       # Table of EC2 instances
        InstanceDetail.tsx     # Single instance detail
        VpcList.tsx            # VPCs table
        SecurityGroupList.tsx  # Security groups
      s3/
        index.tsx
        BucketList.tsx
        ObjectBrowser.tsx      # File browser for bucket contents
      sqs/
        index.tsx
        QueueList.tsx
        QueueDetail.tsx        # Messages, attributes
      lambda/
        index.tsx
        FunctionList.tsx
        FunctionDetail.tsx     # Code, config, test invoke
      dynamodb/
        index.tsx
        TableList.tsx
        TableDetail.tsx        # Items browser, query interface
      _template/               # Copy-paste template for new services
        index.tsx
        ResourceList.tsx
  vite.config.ts               # Build config, base path: /_console/
  package.json
```

### Route-Based Code Splitting

Each service dashboard is a lazy-loaded route. With 35+ services, this is mandatory -- loading all service UIs upfront would create an unusable initial bundle.

```typescript
// services/registry.ts
import { lazy } from 'react';

export interface ServiceMeta {
  key: string;           // Internal key matching SERVICE_HANDLERS
  name: string;          // Display name
  category: string;      // Compute, Storage, Database, etc.
  component: React.LazyExoticComponent<any>;
}

export const services: ServiceMeta[] = [
  { key: 'ec2', name: 'EC2', category: 'Compute',
    component: lazy(() => import('./ec2')) },
  { key: 's3', name: 'S3', category: 'Storage',
    component: lazy(() => import('./s3')) },
  { key: 'sqs', name: 'SQS', category: 'Messaging',
    component: lazy(() => import('./sqs')) },
  // ... 35+ entries
];
```

### State Management

**React Query (TanStack Query) for all server state.** No Redux, no Zustand for resource data.

Rationale:
- Every piece of data in this UI comes from the server (the emulator state). React Query handles caching, background refetch, optimistic updates, and loading/error states.
- The only client-only state is UI state (sidebar open/closed, selected tab, search query). React's built-in useState/useContext handles these.
- React Query's `invalidateQueries` after mutations provides automatic UI consistency without manual state synchronization.

```typescript
// Pattern for every service list
function useInstances() {
  return useQuery({
    queryKey: ['ec2', 'instances'],
    queryFn: () => api.get<Instance[]>('/ec2/instances'),
    refetchInterval: 5000,  // Poll every 5s for "real-time" feel
  });
}
```

### Real-Time Updates: Polling Over WebSocket

**Use polling (React Query `refetchInterval`), not WebSocket.**

Rationale:
- The existing ASGI app handles `scope["type"] == "http"` only. Adding WebSocket support requires handling `scope["type"] == "websocket"` with its own handshake, message framing, and connection lifecycle. This is significant complexity.
- The emulator is local -- latency is sub-millisecond. 3-5 second polling is indistinguishable from "real-time" for a management console.
- Polling is simpler to implement, debug, and test. No connection state management, no reconnection logic, no heartbeats.
- WebSocket adds value only when the server needs to push unsolicited events (e.g., "instance terminated by another CLI command"). For a local dev tool, polling at 3-5s covers this use case adequately.
- If WebSocket is later needed, it can be added as an optimization without changing the architecture. The React Query layer abstracts the data source.

## Patterns to Follow

### Pattern 1: Service Dashboard Template

Every service follows the same structure to maintain consistency across 35+ dashboards and enable rapid development.

```
ServiceDashboard (lazy-loaded route)
  +-- ResourceList (DataTable with service-specific columns)
  +-- ResourceDetail (tabs: Overview, Configuration, Tags, JSON)
  +-- ResourceCreate (form for creating new resources)
```

Use the generic `DataTable` component with service-specific column definitions. Do not build custom tables per service.

### Pattern 2: Console API Convention

All console API endpoints follow a RESTful convention:

```
GET    /_console/api/{service}/{resource}          -> List
GET    /_console/api/{service}/{resource}/{id}      -> Detail
POST   /_console/api/{service}/{resource}          -> Create
PUT    /_console/api/{service}/{resource}/{id}      -> Update
DELETE /_console/api/{service}/{resource}/{id}      -> Delete
POST   /_console/api/{service}/{resource}/{id}/{action}  -> Action (start, stop, invoke)
```

This convention means the frontend API client can be generic:

```typescript
const api = {
  list: (service: string, resource: string) =>
    fetch(`/_console/api/${service}/${resource}`).then(r => r.json()),
  get: (service: string, resource: string, id: string) =>
    fetch(`/_console/api/${service}/${resource}/${id}`).then(r => r.json()),
  // ...
};
```

### Pattern 3: Incremental Service Coverage

Not all 35+ services need full CRUD dashboards on day one. Use a tiered approach:

| Tier | Services | UI Depth | Priority |
|------|----------|----------|----------|
| 1 (Full CRUD) | EC2, S3, Lambda, DynamoDB, SQS | List + Detail + Create/Edit/Delete + Actions | Phase 1-2 |
| 2 (List + Detail) | SNS, Kinesis, CloudWatch, IAM, ECS, RDS | List + Read-only Detail | Phase 3 |
| 3 (List only) | All remaining services | Table view with JSON detail | Phase 4 |

Tier 3 can be auto-generated: read the service module's state dictionary keys and render them in a generic JSON table. This gives 100% service coverage with minimal effort.

### Pattern 4: Generic Resource Browser (Tier 3 Fallback)

```typescript
// GenericServiceDashboard.tsx -- works for ANY service with state
function GenericServiceDashboard({ serviceKey }: { serviceKey: string }) {
  const { data } = useQuery({
    queryKey: [serviceKey, 'resources'],
    queryFn: () => api.list(serviceKey, 'resources'),
  });
  return <DataTable columns={autoColumns(data)} data={data} />;
}
```

The backend equivalent reads module state and returns it as-is:

```python
# Generic handler for services without dedicated API
async def generic_list(service_key):
    module = importlib.import_module(f"ministack.services.{service_key}")
    state = getattr(module, '_get_state', lambda: {})()
    return 200, {"Content-Type": "application/json"}, json.dumps(state).encode()
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Proxying AWS API Calls From Frontend
**What:** Having the React app call the AWS API (port 4566) with boto3-style requests and parsing XML/JSON responses.
**Why bad:** AWS APIs return complex XML (EC2, S3, SQS), CBOR (DynamoDB), or deeply nested JSON. Parsing these in the browser adds massive complexity. The response shapes are designed for SDK consumption, not UI rendering.
**Instead:** Dedicated Console API that returns exactly what the UI needs.

### Anti-Pattern 2: Adding a Python Web Framework
**What:** Adding Starlette, FastAPI, or Django to serve the UI and API.
**Why bad:** The project has 4 dependencies. Adding a web framework contradicts the "lightweight philosophy" constraint. The raw ASGI handler pattern is simple and the console needs are modest (static files + JSON REST API).
**Instead:** Minimal custom static file serving and route dispatch. Under 200 lines of code.

### Anti-Pattern 3: Server-Side Rendering
**What:** Using Next.js SSR or Python-rendered HTML templates.
**Why bad:** Adds build complexity, Node.js runtime dependency at serve time, or Python template engine dependency. The UI is a management console with no SEO requirements.
**Instead:** Client-side SPA. Build once, serve as static files.

### Anti-Pattern 4: Shared State via Redux/Global Store
**What:** Using Redux or global state management for server-derived data.
**Why bad:** Every piece of resource data comes from the server. Redux adds boilerplate for data that should just be cached HTTP responses. Stale state bugs are common when manually managing server state in a client store.
**Instead:** React Query for server state. useState for UI-only state.

### Anti-Pattern 5: One Mega Bundle
**What:** Importing all 35+ service dashboards eagerly.
**Why bad:** Initial bundle becomes massive. Users typically interact with 3-5 services. Loading all service UIs upfront wastes bandwidth and parse time.
**Instead:** Route-based code splitting with React.lazy().

## Suggested Build Order

Dependencies flow top-down. Each phase builds on the previous.

```
Phase 1: Foundation (no service UIs yet)
  [Console Router] --> depends on nothing new
  [Static File Server] --> depends on console router
  [App Shell (React)] --> depends on static file serving
  [API Client + React Query setup] --> depends on console router
  [DataTable + shared components] --> depends on nothing

Phase 2: First Service (EC2 as proving ground)
  [Console API: EC2 endpoints] --> depends on console router
  [EC2 Dashboard (frontend)] --> depends on shared components + API client
  -- Validates the full stack end-to-end --

Phase 3: Core Services
  [Console API: S3, Lambda, DynamoDB, SQS] --> depends on pattern from Phase 2
  [Service dashboards: S3, Lambda, DynamoDB, SQS] --> depends on shared components
  -- Can be parallelized across services --

Phase 4: Remaining Services
  [Generic Resource Browser] --> depends on shared components
  [Tier 2 dashboards (SNS, Kinesis, etc.)] --> depends on pattern from Phase 3
  [Tier 3 auto-generated views] --> depends on generic browser

Phase 5: Polish
  [Global search] --> depends on service registry
  [Real-time status indicators] --> depends on React Query polling
  [S3 file upload/download] --> depends on S3 dashboard
  [Lambda test invocation] --> depends on Lambda dashboard
```

**Critical path:** Phase 1 Foundation -> Phase 2 EC2 proves the pattern. Everything after Phase 2 is parallelizable.

## Backend File Structure

```
ministack/
  console/
    __init__.py
    router.py              # /_console/* dispatch
    static.py              # Static file serving with SPA fallback
    api/
      __init__.py
      base.py              # Shared API utilities (pagination, error format)
      ec2.py               # EC2 console API endpoints
      s3.py                # S3 console API endpoints
      lambda_api.py        # Lambda console API endpoints
      dynamodb.py          # DynamoDB console API endpoints
      sqs.py               # SQS console API endpoints
      generic.py           # Generic state reader for Tier 3 services
  services/                # Existing, unchanged
    ec2.py
    s3.py
    ...
```

Total new backend code estimate: ~500-800 lines for the foundation (router + static server + base API), plus ~100-200 lines per service API handler.

## Sources

- [Starlette StaticFiles docs](https://starlette.dev/staticfiles/) -- reference for SPA fallback pattern (adapted for raw ASGI)
- [Serving SPAs from Starlette](https://www.crccheck.com/blog/serving-spas-from-starlette/) -- SPA fallback technique
- [ASGI WebSocket spec](https://asgi.readthedocs.io/en/latest/specs/www.html) -- WebSocket scope handling reference
- [React code splitting patterns](https://www.greatfrontend.com/blog/code-splitting-and-lazy-loading-in-react) -- lazy loading with React.lazy + Suspense
- [LocalStack Desktop](https://github.com/localstack/localstack-desktop) -- reference for AWS console-style UI patterns
- [AWS GUI for LocalStack](https://medium.com/@leocapvano/aws-gui-for-localstack-507d4b09d47b) -- existing approaches to LocalStack UI
