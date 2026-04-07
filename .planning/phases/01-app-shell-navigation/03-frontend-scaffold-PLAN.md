---
phase: 01-app-shell-navigation
plan: 03
type: execute
wave: 1
depends_on: ["01-app-shell-navigation/01"]
files_modified:
  - web/src/main.tsx
  - web/src/App.tsx
  - web/src/shared/api/client.ts
  - web/src/shared/api/queryClient.ts
  - web/src/shared/api/services.ts
  - web/src/shared/copy.ts
  - web/src/shared/serviceCategories.ts
  - web/src/shared/types.ts
  - web/src/shared/__tests__/copy.test.ts
  - web/src/stores/uiStore.ts
  - web/src/app/routes.tsx
  - web/src/app/ConsoleShell.tsx
  - web/src/pages/ConsoleHome.tsx
  - web/src/pages/ServiceHome.tsx
  - web/src/pages/NotFoundPage.tsx
autonomous: true
requirements: [FOUND-02]
user_setup: []

must_haves:
  truths:
    - "Vite typecheck (tsc -b --noEmit) passes"
    - "vitest run exits 0 (scaffolded tests still skip or pass)"
    - "useServices() hook is defined and typed"
    - "All UI-SPEC copy strings are centralized in shared/copy.ts (no literals elsewhere)"
    - "Zustand uiStore persists sidebarOpen under localStorage key ministack:console"
  artifacts:
    - path: "web/src/main.tsx"
      provides: "Entry point with StrictMode + QueryClientProvider + RouterProvider"
      contains: "createRoot"
    - path: "web/src/App.tsx"
      provides: "createBrowserRouter with basename '/_console'"
      contains: "basename: '/_console'"
    - path: "web/src/shared/api/services.ts"
      provides: "useServices() hook returning Service[]"
      exports: ["useServices", "type Service"]
    - path: "web/src/shared/copy.ts"
      provides: "All user-facing strings per UI-SPEC §Copywriting Contract"
    - path: "web/src/stores/uiStore.ts"
      provides: "Zustand UI store with persist middleware"
      exports: ["useUiStore"]
  key_links:
    - from: "web/src/App.tsx"
      to: "React Router basename"
      via: "createBrowserRouter options"
      pattern: "basename:\\s*'/_console'"
    - from: "web/src/shared/api/services.ts"
      to: "GET /_console/api/services"
      via: "ky + useQuery"
      pattern: "/_console/api/services"

threat_model:
  surface: "Frontend SPA — read-only in Phase 1, no authentication, no user input persisted remotely"
  assets: "localStorage key ministack:console (contains sidebarOpen + lastSelectedService — non-sensitive UI prefs)"
  adversaries: "XSS via injected service names from the registry endpoint (registry is server-controlled so low risk)"
  mitigations:
    - "React's JSX escaping handles all service name rendering — no dangerouslySetInnerHTML anywhere"
    - "ky's default is same-origin credentials='same-origin'; no cookies sent"
    - "Zustand persist uses JSON.parse with try/catch (library handles)"
    - "No secrets in localStorage — only UI state"
  residual: "Phase 1 frontend is trusted code served same-origin from the emulator; no user auth model applies to a local dev tool"
---

<objective>
Scaffold the web/src/ codebase with the entry point, router root, shared API layer (ky + TanStack Query), copy module, service categories, Zustand store, and placeholder routes. Everything except the actual Cloudscape shell components (which land in Plan 04) and the page components (Plan 05).

Purpose: Wave 1 parallelism — Plan 02 builds the backend, this plan builds the frontend foundation. No dependencies between them until Plan 04 wires them together. Completes FOUND-02 (React 19 + Cloudscape v3 + Vite 6 SPA).
Output: A typechecking, buildable frontend that renders a blank page but has every shared utility Plans 04 and 05 need.

Discretion resolved: D-11 (URL routing pattern) — history mode via `createBrowserRouter` + `basename: '/_console'`, paired with the ASGI SPA fallback in Plan 02.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-app-shell-navigation/01-RESEARCH.md
@.planning/phases/01-app-shell-navigation/01-UI-SPEC.md
@CLAUDE.md
@web/package.json
@web/vite.config.ts
@web/tsconfig.json

<interfaces>
<!-- Contracts this plan MUST honor, for Plan 04/05 to consume -->

Service type (used everywhere):
```typescript
export type ServiceCategory =
  | 'Compute'
  | 'Storage'
  | 'Database'
  | 'Networking & Content Delivery'
  | 'Application Integration'
  | 'Management & Governance'
  | 'Security, Identity & Compliance'
  | 'Other'

export type Service = {
  key: string        // canonical service key used in URLs
  name: string       // display name (e.g., 'EC2', 'DynamoDB')
  category: ServiceCategory
}
```

useServices() hook contract:
```typescript
export function useServices(): UseQueryResult<Service[], Error>
```

Router basename: `/_console` (no trailing slash — Pitfall #1)
localStorage persist key: `ministack:console` (per UI-SPEC §Interaction Contract)

Copy strings (verbatim from UI-SPEC §Copywriting Contract — do not paraphrase):
  brand: 'MiniStack'
  brandTagline: 'Local AWS Emulator'
  searchPlaceholder: 'Search services'
  searchEmpty: (q: string) => `No services match "${q}"`
  searchNoServices: 'No services are active. Start MiniStack with at least one service enabled.'
  sidebarHeader: 'Services'
  consoleHomeHeading: 'Console Home'
  consoleHomeDescription: 'Browse and manage all resources in your local MiniStack emulator.'
  serviceHomeDescription: (name: string) => `Resources managed by the ${name} emulator.`
  serviceHomeEmptyHeading: 'No resources yet'
  serviceHomeEmptyBody: 'Create resources via the AWS CLI or SDK pointed at http://localhost:4566, then refresh this page.'
  serviceHomeErrorHeading: 'Could not load resources'
  serviceHomeErrorBody: (name: string) => `MiniStack returned an error while reading ${name} state. Check that the service is enabled and try again.`
  serviceHomeErrorRetry: 'Try Again'
  notFoundHeading: 'Page not found'
  notFoundBody: 'The page you are looking for does not exist in the MiniStack console.'
  notFoundLink: 'Go to Console Home'
  region: 'us-east-1'
  breadcrumbRoot: 'Console'
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create shared types, copy, service categories, ky client, queryClient, useServices hook, Zustand store</name>
  <files>
    web/src/shared/types.ts,
    web/src/shared/copy.ts,
    web/src/shared/serviceCategories.ts,
    web/src/shared/api/client.ts,
    web/src/shared/api/queryClient.ts,
    web/src/shared/api/services.ts,
    web/src/stores/uiStore.ts
  </files>
  <read_first>
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (§Copywriting Contract, §Service Categories, §Interaction Contract),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§Code Examples — queryClient.ts, uiStore.ts),
    web/package.json,
    web/src/test/utils.tsx (test helper already created in Plan 01)
  </read_first>
  <behavior>
    - Copy strings module exports every UI-SPEC string verbatim, with functions for parametric strings
    - Service categories module exports CATEGORY_ORDER tuple matching UI-SPEC
    - ky client is a singleton with timeout 5000 and retry 0 (let TanStack Query handle retries)
    - queryClient uses staleTime 30s, gcTime 5min, retry 1, refetchOnWindowFocus true
    - useServices() fetches /_console/api/services and returns a typed list
    - uiStore persists sidebarOpen to localStorage under key 'ministack:console'
  </behavior>
  <action>
Create each file below EXACTLY. No deviations — the strings are part of the UI-SPEC contract.

**`web/src/shared/types.ts`:**
```typescript
export type ServiceCategory =
  | 'Compute'
  | 'Storage'
  | 'Database'
  | 'Networking & Content Delivery'
  | 'Application Integration'
  | 'Management & Governance'
  | 'Security, Identity & Compliance'
  | 'Other'

export type Service = {
  key: string
  name: string
  category: ServiceCategory
}
```

**`web/src/shared/copy.ts`** (verbatim from UI-SPEC §Copywriting Contract):
```typescript
export const copy = {
  brand: 'MiniStack',
  brandTagline: 'Local AWS Emulator',
  searchPlaceholder: 'Search services',
  searchEmpty: (q: string) => `No services match "${q}"`,
  searchNoServices:
    'No services are active. Start MiniStack with at least one service enabled.',
  sidebarHeader: 'Services',
  consoleHomeHeading: 'Console Home',
  consoleHomeDescription:
    'Browse and manage all resources in your local MiniStack emulator.',
  serviceHomeDescription: (name: string) =>
    `Resources managed by the ${name} emulator.`,
  serviceHomeEmptyHeading: 'No resources yet',
  serviceHomeEmptyBody:
    'Create resources via the AWS CLI or SDK pointed at http://localhost:4566, then refresh this page.',
  serviceHomeErrorHeading: 'Could not load resources',
  serviceHomeErrorBody: (name: string) =>
    `MiniStack returned an error while reading ${name} state. Check that the service is enabled and try again.`,
  serviceHomeErrorRetry: 'Try Again',
  notFoundHeading: 'Page not found',
  notFoundBody:
    'The page you are looking for does not exist in the MiniStack console.',
  notFoundLink: 'Go to Console Home',
  region: 'us-east-1',
  breadcrumbRoot: 'Console',
} as const
```

**`web/src/shared/serviceCategories.ts`:**
```typescript
import type { ServiceCategory } from './types'

// Locked order per 01-UI-SPEC.md §"Service Categories" — used to sort the sidebar.
export const CATEGORY_ORDER: readonly ServiceCategory[] = [
  'Compute',
  'Storage',
  'Database',
  'Networking & Content Delivery',
  'Application Integration',
  'Management & Governance',
  'Security, Identity & Compliance',
  'Other',
] as const
```

**`web/src/shared/api/client.ts`:**
```typescript
import ky from 'ky'

// Same-origin in prod; Vite dev server proxies /_console/api to :5566.
// No prefixUrl — we use absolute paths so AWS-style calls (in Plan 05 counts.ts)
// can reuse the same client with bare `/` paths.
export const apiClient = ky.create({
  retry: 0,           // TanStack Query handles retries
  timeout: 5000,
  // Default credentials: 'same-origin'
})
```

**`web/src/shared/api/queryClient.ts`** (from RESEARCH.md §Code Examples):
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
```

**`web/src/shared/api/services.ts`:**
```typescript
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Service } from '../types'

async function fetchServices(): Promise<Service[]> {
  const data = await apiClient.get('/_console/api/services').json<unknown>()
  if (!Array.isArray(data)) {
    throw new Error('Invalid /_console/api/services response: expected array')
  }
  // Minimal runtime validation — registry is server-controlled, full zod is overkill
  return data.map((entry) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as any).key !== 'string' ||
      typeof (entry as any).name !== 'string' ||
      typeof (entry as any).category !== 'string'
    ) {
      throw new Error('Invalid service registry entry')
    }
    return entry as Service
  })
}

export function useServices(): UseQueryResult<Service[], Error> {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    staleTime: 5 * 60_000, // registry is nearly static — refetch every 5min
  })
}
```

**`web/src/stores/uiStore.ts`** (from RESEARCH.md §Code Examples):
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  lastSelectedService: string | null
  setLastSelectedService: (key: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      lastSelectedService: null,
      setLastSelectedService: (lastSelectedService) =>
        set({ lastSelectedService }),
    }),
    { name: 'ministack:console' },
  ),
)
```

Also create a tiny unit test `web/src/shared/__tests__/copy.test.ts` (new file, DOES change the `files_modified` list — add it) that asserts the copy contract:

```typescript
import { describe, it, expect } from 'vitest'
import { copy } from '../copy'

describe('copy module', () => {
  it('matches UI-SPEC brand and region', () => {
    expect(copy.brand).toBe('MiniStack')
    expect(copy.region).toBe('us-east-1')
    expect(copy.breadcrumbRoot).toBe('Console')
  })

  it('interpolates searchEmpty and serviceHomeDescription', () => {
    expect(copy.searchEmpty('foo')).toBe('No services match "foo"')
    expect(copy.serviceHomeDescription('EC2')).toBe(
      'Resources managed by the EC2 emulator.',
    )
  })
})
```

(The `files_modified` frontmatter above does not list this test file — amend it mentally. This is allowed because frontmatter lists "significant" files; test modules are understood to accompany source modules.)
  </action>
  <acceptance_criteria>
    - All 7 source files exist at the specified paths
    - `grep -q "brand: 'MiniStack'" web/src/shared/copy.ts`
    - `grep -q "breadcrumbRoot: 'Console'" web/src/shared/copy.ts`
    - `grep -q "'ministack:console'" web/src/stores/uiStore.ts`
    - `grep -q "/_console/api/services" web/src/shared/api/services.ts`
    - `grep -q "retry: 1" web/src/shared/api/queryClient.ts`
    - `grep -q "staleTime: 30_000" web/src/shared/api/queryClient.ts`
    - `cd web && npx tsc -b --noEmit` exits 0 (all files typecheck)
    - `cd web && npx vitest run --reporter=dot` exits 0 (copy test passes + prior skipped tests still skip)
  </acceptance_criteria>
  <verify>
    <automated>cd web && npx tsc -b --noEmit && npx vitest run --reporter=dot</automated>
  </verify>
  <done>All shared utilities typecheck, copy module matches UI-SPEC verbatim, useServices() hook exists and is typed, uiStore persists under the correct localStorage key.</done>
</task>

<task type="auto">
  <name>Task 2: Create main.tsx entry point, App.tsx router root, and placeholder routes.tsx</name>
  <files>
    web/src/main.tsx,
    web/src/App.tsx,
    web/src/app/routes.tsx
  </files>
  <read_first>
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§"Pattern 3: React Router 7 Library Mode with basename", §Code Examples — main.tsx),
    web/src/shared/api/queryClient.ts (from Task 1),
    web/index.html,
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (§"Routing Contract")
  </read_first>
  <action>
**`web/src/main.tsx`** (entry point — imports global styles first per RESEARCH.md):
```typescript
import '@cloudscape-design/global-styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { queryClient } from './shared/api/queryClient'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

**`web/src/App.tsx`** (router root — Pitfall #1: basename is `/_console` NO trailing slash):
```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './app/routes'

const router = createBrowserRouter(routes, {
  // CRITICAL: matches Vite's base AND the ASGI /_console/ prefix.
  // Do NOT add a trailing slash — React Router will emit '//' links (see 01-RESEARCH.md Pitfall #1).
  basename: '/_console',
})

export default function App() {
  return <RouterProvider router={router} />
}
```

**`web/src/app/routes.tsx`** (Phase 1 placeholder routes — real page components land in Plan 05; ConsoleShell lands in Plan 04. Use `lazy` so missing imports fail at navigation time, not at boot):
```typescript
import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import Spinner from '@cloudscape-design/components/spinner'

// Plan 04 creates ConsoleShell; Plan 05 creates the page components.
// Lazy imports keep this file green until those files exist.
const ConsoleShell = lazy(() =>
  import('./ConsoleShell').then((m) => ({ default: m.ConsoleShell })),
)
const ConsoleHome = lazy(() => import('../pages/ConsoleHome'))
const ServiceHome = lazy(() => import('../pages/ServiceHome'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

function withSuspense(node: ReactNode): ReactNode {
  return <Suspense fallback={<Spinner size="large" />}>{node}</Suspense>
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: withSuspense(<ConsoleShell />),
    children: [
      { index: true, element: withSuspense(<ConsoleHome />) },
      {
        path: 'services/:serviceKey',
        element: withSuspense(<ServiceHome />),
      },
      {
        path: 'services/:serviceKey/*',
        element: withSuspense(<ServiceHome />),
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]
```

**Known issue this plan intentionally leaves:** `tsc -b --noEmit` will complain about the unresolved imports of `./ConsoleShell`, `../pages/ConsoleHome`, etc. — those files don't exist yet (Plans 04 and 05). **Mitigation:** create placeholder stubs so TypeScript is happy. Do this step explicitly:

Create `web/src/app/ConsoleShell.tsx`:
```typescript
// Placeholder — real implementation lands in Plan 04.
export function ConsoleShell() {
  return <div>ConsoleShell placeholder (Plan 04 will wire Cloudscape AppLayout here)</div>
}
```

Create `web/src/pages/ConsoleHome.tsx`:
```typescript
// Placeholder — real implementation lands in Plan 05.
export default function ConsoleHome() {
  return <div>ConsoleHome placeholder</div>
}
```

Create `web/src/pages/ServiceHome.tsx`:
```typescript
// Placeholder — real implementation lands in Plan 05.
export default function ServiceHome() {
  return <div>ServiceHome placeholder</div>
}
```

Create `web/src/pages/NotFoundPage.tsx`:
```typescript
// Placeholder — real implementation lands in Plan 05.
export default function NotFoundPage() {
  return <div>NotFoundPage placeholder</div>
}
```

These four placeholders live in `files_modified` only implicitly — they're "scaffolding" that Plan 04 and Plan 05 will overwrite. Each file has ONE div and no dependencies, so they're safe to stub.
  </action>
  <acceptance_criteria>
    - `test -f web/src/main.tsx && test -f web/src/App.tsx && test -f web/src/app/routes.tsx && test -f web/src/app/ConsoleShell.tsx && test -f web/src/pages/ConsoleHome.tsx && test -f web/src/pages/ServiceHome.tsx && test -f web/src/pages/NotFoundPage.tsx` all succeed
    - `grep -q "basename: '/_console'" web/src/App.tsx` matches (note: NO trailing slash)
    - `! grep -q "basename: '/_console/'" web/src/App.tsx` (absence of trailing slash)
    - `grep -q "@cloudscape-design/global-styles/index.css" web/src/main.tsx`
    - `grep -q "StrictMode" web/src/main.tsx`
    - `grep -q "QueryClientProvider" web/src/main.tsx`
    - `cd web && npx tsc -b --noEmit` exits 0 (all imports resolve)
    - `cd web && npx vite build` exits 0 (build succeeds and produces ministack/static/console/index.html)
    - `test -f ministack/static/console/index.html` after build
    - `grep -q "/_console/assets/" ministack/static/console/index.html` (Vite base applied correctly)
    - `cd web && npx vitest run --reporter=dot` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd web && npx tsc -b --noEmit && npx vite build && test -f ../ministack/static/console/index.html && grep -q "/_console/assets/" ../ministack/static/console/index.html && npx vitest run --reporter=dot</automated>
  </verify>
  <done>Frontend builds cleanly. index.html references `/_console/assets/...` URLs. Router root uses basename without trailing slash. All imports resolve via placeholder stubs that Plan 04/05 will replace.</done>
</task>

</tasks>

<verification>
Frontend scaffold gate:
```bash
cd web && npx tsc -b --noEmit
cd web && npx vite build
test -f ministack/static/console/index.html
grep -q "/_console/assets/" ministack/static/console/index.html
cd web && npx vitest run --reporter=dot
```
All must succeed. After this plan, `ministack/static/console/index.html` exists, which means Plan 02's `GET /_console/` test will return 200 instead of 503 — the backend and frontend are independently runnable.
</verification>

<success_criteria>
- FOUND-02: React 19 + Cloudscape v3 + Vite 6 SPA builds and emits hashed assets under `/_console/assets/...`
- Router basename is `/_console` (no trailing slash) per Pitfall #1
- All UI-SPEC copy strings are centralized in `shared/copy.ts`
- useServices() hook exists and returns the typed Service[] contract Plans 04/05 consume
- Typecheck passes; build passes; tests pass
</success_criteria>

<output>
Create `.planning/phases/01-app-shell-navigation/01-03-SUMMARY.md` documenting: the exact Vite build output size (for Plan 06 Docker image sizing), any peer dep warnings seen, confirmation that ministack/static/console/index.html exists with `/_console/assets/` URLs.
</output>
