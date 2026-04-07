---
phase: 01-app-shell-navigation
plan: 05
type: execute
wave: 2
depends_on: ["01-app-shell-navigation/02", "01-app-shell-navigation/03"]
files_modified:
  - web/src/pages/ConsoleHome.tsx
  - web/src/pages/ServiceHome.tsx
  - web/src/pages/NotFoundPage.tsx
  - web/src/shared/api/counts.ts
  - web/src/test/msw.ts
  - web/src/test/msw-setup.ts
  - web/src/__tests__/ServiceHome.test.tsx
  - web/src/__tests__/ServiceHomeEc2.test.tsx
  - web/src/__tests__/ServiceHomeError.test.tsx
  - web/package.json
autonomous: true
requirements: [NAV-04]
user_setup: []

must_haves:
  truths:
    - "ConsoleHome renders the Header 'Console Home' with description per UI-SPEC"
    - "ServiceHome at /services/dynamodb shows '0 tables' when API returns empty TableNames"
    - "ServiceHome at /services/ec2 parses DescribeInstances XML and shows count + running/stopped rollup"
    - "ServiceHome shows Cloudscape Spinner while loading"
    - "ServiceHome shows Alert with 'Try Again' button on fetch error, and refetches on click"
    - "ServiceHome shows '—' or 'Not available in Phase 1' for services without a counter (s3, sqs, sns, iam, kms, secretsmanager)"
    - "NotFoundPage shows 'Page not found' with link back to /"
  artifacts:
    - path: "web/src/shared/api/counts.ts"
      provides: "Per-service resource-count fetchers (ec2, lambda, dynamodb) + countersByService map"
      exports: ["countersByService", "type CountSummary"]
    - path: "web/src/pages/ServiceHome.tsx"
      provides: "NAV-04 — KeyValuePairs + StatusIndicator + Spinner/Alert per UI-SPEC Interaction Contract"
    - path: "web/src/pages/ConsoleHome.tsx"
      provides: "Console landing page with Header"
    - path: "web/src/pages/NotFoundPage.tsx"
      provides: "404 inside shell"
  key_links:
    - from: "web/src/pages/ServiceHome.tsx"
      to: "countersByService[serviceKey]()"
      via: "useQuery queryFn"
      pattern: "countersByService\\["
    - from: "web/src/shared/api/counts.ts countEc2Instances"
      to: "DOMParser"
      via: "browser XML parsing (no external lib per RESEARCH §Don't Hand-Roll)"
      pattern: "DOMParser"

threat_model:
  surface: "Browser fetch calls to /_console/api/* and AWS-compatible endpoints on same origin"
  assets: "The JSON/XML response bodies; derived counts rendered to DOM"
  adversaries: "XSS via XML content if EC2 state names were attacker-controlled (they are not — ministack is a local dev tool)"
  mitigations:
    - "DOMParser is safer than regex or innerHTML — it parses to a DOM tree, text content is extracted via textContent"
    - "textContent is inherently XSS-safe — React then escapes it again via JSX"
    - "No eval, no Function constructor, no dangerouslySetInnerHTML"
    - "ky timeout 5000ms prevents hanging on a wedged backend"
    - "countUnsupported() path renders a static string — no user input"
  residual: "If ministack ever adds user-uploaded EC2 instance tags to DescribeInstances output, this plan's XML parsing must escape them via textContent (which it already does) — audit Plan 2 when EC2 tags land"
---

<objective>
Build the three page components (ConsoleHome, ServiceHome, NotFoundPage) and the resource-count fetcher module (counts.ts) that together deliver NAV-04 — the service-home resource count + status rollup.

Runs in parallel with Plan 04 (both Wave 2) because they only touch `pages/` and `shared/api/counts.ts`, not the `app/` shell components. Once both land, the Router lazy imports from Plan 03 resolve to real pages and real shell.

Per RESEARCH.md §"Pattern 7: NAV-04 Resource Count Strategy": ship real counters for EC2, Lambda, DynamoDB in Phase 1. Everything else renders "—". S3/SQS/SNS counters are deferred to Phase 2+.

Discretion resolved: D-03 (XML parsing strategy) — browser-native `DOMParser` for EC2 DescribeInstances, no external XML library (per RESEARCH §Don't Hand-Roll).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-app-shell-navigation/01-RESEARCH.md
@.planning/phases/01-app-shell-navigation/01-UI-SPEC.md
@web/src/shared/copy.ts
@web/src/shared/types.ts
@web/src/shared/api/client.ts
@web/src/shared/api/services.ts

<interfaces>
<!-- Exact contracts -->

CountSummary:
```typescript
export type CountSummary = {
  count: number                  // NaN for unsupported (renders '—')
  states?: Record<string, number> // Only for EC2 — running/stopped/terminated breakdown
  noun?: string                  // Plural noun for count label ('tables', 'functions', 'instances')
}
```

countersByService contract:
```typescript
export const countersByService: Record<string, () => Promise<CountSummary>>
```

Cloudscape imports used in this plan:
```typescript
import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Spinner from '@cloudscape-design/components/spinner'
import Alert from '@cloudscape-design/components/alert'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Link from '@cloudscape-design/components/link'
```

DynamoDB response shape (AWS JSON 1.0, ListTables): `{ "TableNames": string[] }`
Lambda response shape (REST): `{ "Functions": object[] }`
EC2 DescribeInstances response: XML with `<instanceId>` and `<instanceState><name>...</name></instanceState>` tags (see RESEARCH §Pattern 7 for exact parsing code)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install MSW, create counts.ts fetcher module, write ServiceHome tests with MSW handlers</name>
  <files>
    web/src/shared/api/counts.ts,
    web/src/test/msw.ts,
    web/src/test/msw-setup.ts,
    web/src/__tests__/ServiceHome.test.tsx,
    web/src/__tests__/ServiceHomeEc2.test.tsx,
    web/src/__tests__/ServiceHomeError.test.tsx,
    web/package.json
  </files>
  <read_first>
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§"Pattern 7: NAV-04 Resource Count Strategy"),
    web/src/shared/api/client.ts,
    web/src/test/utils.tsx,
    web/src/__tests__/ServiceHome.test.tsx (Wave 0 stub)
  </read_first>
  <action>
**Step A — MSW install check.** MSW 2.x was added to devDependencies in Plan 01. Verify with `cd web && npm ls msw`. If missing, run `cd web && npm install -D msw` to pin the exact latest version.

**Step B — Create `web/src/shared/api/counts.ts`** per RESEARCH.md §Pattern 7:
```typescript
import { apiClient } from './client'

export type CountSummary = {
  count: number
  states?: Record<string, number>
  noun?: string
}

export async function countDynamoDbTables(): Promise<CountSummary> {
  const res = await apiClient.post('/', {
    headers: {
      'X-Amz-Target': 'DynamoDB_20120810.ListTables',
      'Content-Type': 'application/x-amz-json-1.0',
      'Authorization':
        'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/dynamodb/aws4_request',
    },
    body: '{}',
  }).json<{ TableNames?: string[] }>()
  return { count: res.TableNames?.length ?? 0, noun: 'tables' }
}

export async function countLambdaFunctions(): Promise<CountSummary> {
  const res = await apiClient
    .get('/2015-03-31/functions/')
    .json<{ Functions?: unknown[] }>()
  return { count: res.Functions?.length ?? 0, noun: 'functions' }
}

export async function countEc2Instances(): Promise<CountSummary> {
  const body = new URLSearchParams({
    Action: 'DescribeInstances',
    Version: '2016-11-15',
  }).toString()
  const text = await apiClient
    .post('/', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization':
          'AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/ec2/aws4_request',
      },
      body,
    })
    .text()

  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const instances = Array.from(doc.getElementsByTagName('instanceId'))
  const states: Record<string, number> = {}
  for (const inst of Array.from(doc.getElementsByTagName('instanceState'))) {
    const nameEl = inst.getElementsByTagName('name')[0]
    const name = nameEl?.textContent ?? 'unknown'
    states[name] = (states[name] ?? 0) + 1
  }
  return { count: instances.length, states, noun: 'instances' }
}

async function countUnsupported(): Promise<CountSummary> {
  return { count: Number.NaN, noun: 'resources' }
}

// Per 01-RESEARCH.md Pattern 7: Phase 1 ships real counters for ec2, lambda, dynamodb only.
// Everything else renders '—' via countUnsupported() / NaN guard in ServiceHome.
export const countersByService: Record<string, () => Promise<CountSummary>> = {
  ec2: countEc2Instances,
  lambda: countLambdaFunctions,
  dynamodb: countDynamoDbTables,
}

export { countUnsupported }
```

**Step C — Create `web/src/test/msw.ts` helper:**
```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const mswServer = setupServer()

export { http, HttpResponse }
```

**Step C.2 — Create `web/src/test/msw-setup.ts`** — per-file MSW lifecycle helper. **Do NOT touch the global `web/src/test/setup.ts`** — Plan 04 tests use `vi.mock` only and would break under `onUnhandledRequest: 'error'`. This helper is opt-in and called from each ServiceHome test file's own module scope:
```typescript
import { afterAll, afterEach, beforeAll } from 'vitest'
import { mswServer } from './msw'

/**
 * Call once at module scope inside any test file that uses MSW handlers.
 * Registers per-file beforeAll/afterEach/afterAll hooks scoped to this file's run only.
 * Plan 04 tests do NOT call this — they use vi.mock and would error on unhandled requests.
 */
export function setupMswForTest(): void {
  beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => mswServer.resetHandlers())
  afterAll(() => mswServer.close())
}
```

**Do NOT modify `web/src/test/setup.ts`.** That file remains as written by Plan 01 (jest-dom + cleanup only). Each ServiceHome test file calls `setupMswForTest()` at module top.

**MSW origin note:** ky resolves bare `/` POSTs against the current document origin. Plan 01's `vite.config.ts` test block sets `environmentOptions: { jsdom: { url: 'http://localhost/' } }`, so MSW handlers below register against `http://localhost/` and match correctly.

**Step D — Write real tests.** Replace all three ServiceHome test stubs.

**`web/src/__tests__/ServiceHome.test.tsx`** (DynamoDB empty state):
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { mswServer, http, HttpResponse } from '../test/msw'
import { setupMswForTest } from '../test/msw-setup'
import ServiceHome from '../pages/ServiceHome'

setupMswForTest()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useParams: () => ({ serviceKey: 'dynamodb' }) }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'dynamodb', name: 'DynamoDB', category: 'Database' }],
    isLoading: false,
    error: null,
  }),
}))

describe('ServiceHome — DynamoDB (NAV-04)', () => {
  it('shows "0 tables" when ListTables returns empty', async () => {
    mswServer.use(
      http.post('http://localhost/', async ({ request }) => {
        const target = request.headers.get('x-amz-target') ?? ''
        if (target.endsWith('ListTables')) {
          return HttpResponse.json({ TableNames: [] })
        }
        return new HttpResponse(null, { status: 404 })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })
    await waitFor(() => {
      expect(screen.getByText(/0 tables/i)).toBeInTheDocument()
    })
  })

  it('shows spinner while loading', async () => {
    mswServer.use(
      http.post('http://localhost/', async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({ TableNames: [] })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })
    // Cloudscape Spinner exposes role="status"
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

**`web/src/__tests__/ServiceHomeEc2.test.tsx`** (EC2 XML rollup):
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { mswServer, http, HttpResponse } from '../test/msw'
import { setupMswForTest } from '../test/msw-setup'
import ServiceHome from '../pages/ServiceHome'

setupMswForTest()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useParams: () => ({ serviceKey: 'ec2' }) }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'ec2', name: 'EC2', category: 'Compute' }],
    isLoading: false,
    error: null,
  }),
}))

const EC2_XML = `<?xml version="1.0"?>
<DescribeInstancesResponse>
  <reservationSet>
    <item>
      <instancesSet>
        <item><instanceId>i-1</instanceId><instanceState><name>running</name></instanceState></item>
        <item><instanceId>i-2</instanceId><instanceState><name>running</name></instanceState></item>
        <item><instanceId>i-3</instanceId><instanceState><name>running</name></instanceState></item>
        <item><instanceId>i-4</instanceId><instanceState><name>stopped</name></instanceState></item>
        <item><instanceId>i-5</instanceId><instanceState><name>stopped</name></instanceState></item>
      </instancesSet>
    </item>
  </reservationSet>
</DescribeInstancesResponse>`

describe('ServiceHome — EC2 rollup (NAV-04)', () => {
  it('parses DescribeInstances XML and shows count + running/stopped rollup', async () => {
    mswServer.use(
      http.post('http://localhost/', async () => {
        return new HttpResponse(EC2_XML, {
          headers: { 'Content-Type': 'application/xml' },
        })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/ec2' })
    await waitFor(() => {
      expect(screen.getByText(/5 instances/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/3 running/i)).toBeInTheDocument()
    expect(screen.getByText(/2 stopped/i)).toBeInTheDocument()
  })
})
```

**`web/src/__tests__/ServiceHomeError.test.tsx`:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils'
import { mswServer, http, HttpResponse } from '../test/msw'
import { setupMswForTest } from '../test/msw-setup'
import ServiceHome from '../pages/ServiceHome'

setupMswForTest()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useParams: () => ({ serviceKey: 'dynamodb' }) }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'dynamodb', name: 'DynamoDB', category: 'Database' }],
    isLoading: false,
    error: null,
  }),
}))

describe('ServiceHome error state (NAV-04)', () => {
  it('renders Alert with Try Again button on API error and refetches on click', async () => {
    let callCount = 0
    mswServer.use(
      http.post('http://localhost/', async () => {
        callCount++
        if (callCount === 1) {
          return new HttpResponse('boom', { status: 500 })
        }
        return HttpResponse.json({ TableNames: ['alpha', 'beta'] })
      }),
    )

    renderWithProviders(<ServiceHome />, { route: '/services/dynamodb' })

    await waitFor(() => {
      expect(screen.getByText(/Could not load resources/i)).toBeInTheDocument()
    })

    const retry = screen.getByRole('button', { name: /Try Again/i })
    const user = userEvent.setup()
    await user.click(retry)

    await waitFor(() => {
      expect(screen.getByText(/2 tables/i)).toBeInTheDocument()
    })
  })
})
```

Note: the `http://localhost/` origin in MSW handlers catches ky's resolved URL (ky resolves bare `/` paths against the current origin). In the vitest jsdom environment, that's `http://localhost/`.
  </action>
  <acceptance_criteria>
    - `cd web && npm ls msw` exits 0 (MSW installed)
    - `test -f web/src/shared/api/counts.ts`
    - `test -f web/src/test/msw.ts`
    - `test -f web/src/test/msw-setup.ts && grep -q "mswServer.listen" web/src/test/msw-setup.ts`
    - `! grep -q "mswServer" web/src/test/setup.ts` (global setup must NOT touch MSW — Plan 04 tests would break)
    - `grep -q "setupMswForTest" web/src/__tests__/ServiceHome.test.tsx`
    - `grep -q "setupMswForTest" web/src/__tests__/ServiceHomeEc2.test.tsx`
    - `grep -q "setupMswForTest" web/src/__tests__/ServiceHomeError.test.tsx`
    - `grep -q "countEc2Instances\|countLambdaFunctions\|countDynamoDbTables" web/src/shared/api/counts.ts` (all three present)
    - `grep -q "DOMParser" web/src/shared/api/counts.ts`
    - `grep -q "countersByService" web/src/shared/api/counts.ts`
    - `cd web && npx tsc -b --noEmit` exits 0
    - `cd web && npx vitest run src/__tests__/ServiceHome.test.tsx src/__tests__/ServiceHomeEc2.test.tsx src/__tests__/ServiceHomeError.test.tsx --reporter=dot` exits NON-ZERO (RED — ServiceHome still a placeholder from Plan 03)
  </acceptance_criteria>
  <verify>
    <automated>cd web && npx tsc -b --noEmit && ! npx vitest run src/__tests__/ServiceHome.test.tsx src/__tests__/ServiceHomeEc2.test.tsx src/__tests__/ServiceHomeError.test.tsx --reporter=dot</automated>
  </verify>
  <done>MSW wired, counts.ts shipping real fetchers for EC2/Lambda/DynamoDB, three ServiceHome tests exist with real assertions and are RED (placeholder from Plan 03 doesn't satisfy them).</done>
</task>

<task type="auto">
  <name>Task 2: Implement ConsoleHome, ServiceHome (NAV-04), NotFoundPage — make RED tests GREEN</name>
  <files>
    web/src/pages/ConsoleHome.tsx,
    web/src/pages/ServiceHome.tsx,
    web/src/pages/NotFoundPage.tsx
  </files>
  <read_first>
    web/src/pages/ServiceHome.tsx (Plan 03 placeholder),
    web/src/pages/ConsoleHome.tsx (Plan 03 placeholder),
    web/src/pages/NotFoundPage.tsx (Plan 03 placeholder),
    web/src/shared/api/counts.ts,
    web/src/shared/api/services.ts,
    web/src/shared/copy.ts,
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (§Copywriting Contract, §Interaction Contract, §Typography, §Color),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§Pattern 7),
    web/src/__tests__/ServiceHome.test.tsx,
    web/src/__tests__/ServiceHomeEc2.test.tsx,
    web/src/__tests__/ServiceHomeError.test.tsx
  </read_first>
  <action>
Replace all three Plan 03 placeholder pages with real implementations.

**`web/src/pages/ConsoleHome.tsx`:**
```typescript
import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import { copy } from '../shared/copy'

export default function ConsoleHome() {
  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={copy.consoleHomeDescription}>
        {copy.consoleHomeHeading}
      </Header>
      <Container>
        <Box variant="p">
          Use the sidebar or the search bar above to navigate to a service.
        </Box>
      </Container>
    </SpaceBetween>
  )
}
```

**`web/src/pages/NotFoundPage.tsx`:**
```typescript
import { useNavigate } from 'react-router-dom'
import Header from '@cloudscape-design/components/header'
import Box from '@cloudscape-design/components/box'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { copy } from '../shared/copy'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <SpaceBetween size="l">
      <Header variant="h1">{copy.notFoundHeading}</Header>
      <Box variant="p">{copy.notFoundBody}</Box>
      <Link
        onFollow={(e) => {
          e.preventDefault()
          navigate('/')
        }}
        href="/"
      >
        {copy.notFoundLink}
      </Link>
    </SpaceBetween>
  )
}
```

**`web/src/pages/ServiceHome.tsx`** — the big one. Handles loading, error, empty, unsupported, and happy-path states per UI-SPEC §Interaction Contract:
```typescript
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Spinner from '@cloudscape-design/components/spinner'
import Alert from '@cloudscape-design/components/alert'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useServices } from '../shared/api/services'
import { countersByService, type CountSummary } from '../shared/api/counts'
import { copy } from '../shared/copy'

function formatCount(summary: CountSummary): string {
  if (Number.isNaN(summary.count)) return '—'
  const noun = summary.noun ?? 'resources'
  return `${summary.count} ${noun}`
}

function statusFromRollup(states: Record<string, number> | undefined): {
  type: 'success' | 'warning' | 'info'
  text: string
} | null {
  if (!states || Object.keys(states).length === 0) return null
  const parts = Object.entries(states).map(([name, n]) => `${n} ${name}`)
  const hasStopped = (states.stopped ?? 0) > 0 || (states.terminated ?? 0) > 0
  const hasRunning = (states.running ?? 0) > 0
  return {
    type: hasStopped && hasRunning ? 'warning' : hasRunning ? 'success' : 'info',
    text: parts.join(', '),
  }
}

export default function ServiceHome() {
  const { serviceKey = '' } = useParams()
  const { data: services = [] } = useServices()
  const service = services.find((s) => s.key === serviceKey)
  const displayName = service?.name ?? serviceKey

  const counter = countersByService[serviceKey]
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['count', serviceKey],
    queryFn: () =>
      counter
        ? counter()
        : Promise.resolve<CountSummary>({ count: Number.NaN, noun: 'resources' }),
    staleTime: 30_000,
    enabled: Boolean(serviceKey),
  })

  const rollup = statusFromRollup(data?.states)

  return (
    <SpaceBetween size="l">
      <Header
        variant="h2"
        description={copy.serviceHomeDescription(displayName)}
      >
        {displayName}
      </Header>

      {isLoading || isFetching ? (
        <Container>
          <Box textAlign="center">
            <Spinner size="large" />
          </Box>
        </Container>
      ) : error ? (
        <Alert
          type="error"
          header={copy.serviceHomeErrorHeading}
          action={
            <Button onClick={() => refetch()}>
              {copy.serviceHomeErrorRetry}
            </Button>
          }
        >
          {copy.serviceHomeErrorBody(displayName)}
        </Alert>
      ) : !counter ? (
        <Container>
          <Box variant="p" color="text-body-secondary">
            Resource counts for {displayName} are not available in Phase 1.
          </Box>
        </Container>
      ) : data && Number.isNaN(data.count) ? (
        <Container>
          <Box variant="p" color="text-body-secondary">—</Box>
        </Container>
      ) : data && data.count === 0 ? (
        <Container>
          <SpaceBetween size="s">
            <Box variant="h3">{copy.serviceHomeEmptyHeading}</Box>
            <Box variant="p" color="text-body-secondary">
              {copy.serviceHomeEmptyBody}
            </Box>
            <Box variant="p">{formatCount(data)}</Box>
          </SpaceBetween>
        </Container>
      ) : data ? (
        <Container>
          <KeyValuePairs
            columns={2}
            items={[
              {
                label: 'Resources',
                value: formatCount(data),
              },
              ...(rollup
                ? [
                    {
                      label: 'Status',
                      value: (
                        <StatusIndicator type={rollup.type}>
                          {rollup.text}
                        </StatusIndicator>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Container>
      ) : null}
    </SpaceBetween>
  )
}
```

Run the RED tests — they should go GREEN.
  </action>
  <acceptance_criteria>
    - `test -f web/src/pages/ConsoleHome.tsx && test -f web/src/pages/ServiceHome.tsx && test -f web/src/pages/NotFoundPage.tsx`
    - `grep -q "copy.consoleHomeHeading" web/src/pages/ConsoleHome.tsx`
    - `grep -q "copy.notFoundHeading" web/src/pages/NotFoundPage.tsx`
    - `grep -q "countersByService\[serviceKey\]" web/src/pages/ServiceHome.tsx`
    - `grep -q "copy.serviceHomeErrorRetry" web/src/pages/ServiceHome.tsx`
    - `grep -q "StatusIndicator" web/src/pages/ServiceHome.tsx`
    - `! grep -q "placeholder" web/src/pages/ServiceHome.tsx`
    - `cd web && npx tsc -b --noEmit` exits 0
    - `cd web && npx vitest run --reporter=dot` exits 0 (FULL suite — every test passes or is skipped, including the three ServiceHome tests that were RED in Task 1)
    - `cd web && npx vite build` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd web && npx tsc -b --noEmit && npx vitest run --reporter=dot && npx vite build</automated>
  </verify>
  <done>NAV-04 delivered: ServiceHome shows count, status rollup (EC2), loading spinner, error+retry, unsupported fallback, and empty state. All 10+ frontend unit tests pass.</done>
</task>

</tasks>

<verification>
Pages plan gate:
```bash
cd web && npx tsc -b --noEmit
cd web && npx vitest run --reporter=dot   # all tests GREEN
cd web && npx vite build
test -f ministack/static/console/index.html
```
</verification>

<success_criteria>
- NAV-04: Count + rollup + loading + error states all verified by automated tests
- Phase 1 UI-SPEC §Interaction Contract for ServiceHome satisfied
- No placeholder files remain in web/src/pages/
- Full frontend unit suite green
- Full build still produces valid SPA output
</success_criteria>

<output>
Create `.planning/phases/01-app-shell-navigation/01-05-SUMMARY.md` documenting: total test count, any MSW handler debugging notes, confirmation that EC2 rollup parsing works on the sample XML, final build bundle size.
</output>
