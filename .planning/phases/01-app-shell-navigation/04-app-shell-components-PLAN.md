---
phase: 01-app-shell-navigation
plan: 04
type: execute
wave: 2
depends_on: ["01-app-shell-navigation/02", "01-app-shell-navigation/03"]
files_modified:
  - web/src/app/ConsoleShell.tsx
  - web/src/app/TopBar.tsx
  - web/src/app/Sidebar.tsx
  - web/src/app/Breadcrumbs.tsx
  - web/src/__tests__/AppShell.test.tsx
  - web/src/__tests__/ServiceSearch.test.tsx
  - web/src/__tests__/ServiceSidebar.test.tsx
  - web/src/__tests__/Breadcrumbs.test.tsx
autonomous: true
requirements: [NAV-01, NAV-02, NAV-03, NAV-05]
user_setup: []

must_haves:
  truths:
    - "ConsoleShell renders AppLayout with TopBar (top slot), Sidebar (navigation slot), Breadcrumbs (content slot), and <Outlet/>"
    - "TopBar renders TopNavigation with brand 'MiniStack', tagline, region us-east-1, and Autosuggest search"
    - "Typing 'ec' in search filters services and selecting EC2 navigates to /services/ec2 (NAV-01)"
    - "Sidebar renders services grouped by category, empty categories hidden, items alphabetized within category (NAV-02)"
    - "Sidebar uses SideNavigation type='section' headers per UI-SPEC"
    - "Breadcrumbs show 'Console' at / and 'Console > EC2' at /services/ec2 (NAV-03)"
    - "AppLayout uses headerSelector='#top-nav' so it measures the TopBar height (Pitfall #4 mitigation)"
    - "All tests in web/src/__tests__/ (non-ServiceHome) pass with real assertions"
  artifacts:
    - path: "web/src/app/ConsoleShell.tsx"
      provides: "The outer shell wiring AppLayout + TopBar + Sidebar + Breadcrumbs + Outlet"
      exports: ["ConsoleShell"]
    - path: "web/src/app/TopBar.tsx"
      provides: "TopNavigation + Autosuggest service search (NAV-01)"
      exports: ["TopBar"]
    - path: "web/src/app/Sidebar.tsx"
      provides: "SideNavigation populated from useServices(), grouped by category (NAV-02)"
      exports: ["Sidebar"]
    - path: "web/src/app/Breadcrumbs.tsx"
      provides: "BreadcrumbGroup derived from useLocation (NAV-03)"
      exports: ["Breadcrumbs"]
  key_links:
    - from: "web/src/app/TopBar.tsx"
      to: "useServices()"
      via: "react-query hook call"
      pattern: "useServices\\("
    - from: "web/src/app/Sidebar.tsx"
      to: "useServices() + CATEGORY_ORDER"
      via: "import"
      pattern: "CATEGORY_ORDER"
    - from: "web/src/app/TopBar.tsx"
      to: "navigate('/services/:key')"
      via: "useNavigate + Autosuggest onSelect"
      pattern: "navigate\\(`/services/"
    - from: "web/src/app/ConsoleShell.tsx"
      to: "TopBar id='top-nav'"
      via: "headerSelector"
      pattern: 'headerSelector="#top-nav"'

threat_model:
  surface: "Rendered DOM receives service names from /_console/api/services"
  assets: "DOM — XSS if service names were user-controlled"
  adversaries: "None realistic — registry is server-controlled from Python source code; no user input reaches rendering"
  mitigations:
    - "React JSX auto-escapes all text content"
    - "No dangerouslySetInnerHTML"
    - "Autosuggest value and Service name go through controlled component props"
    - "Navigation goes through React Router useNavigate (not window.location.href)"
  residual: "If a future Plan adds a persistent XSS vector via user-controlled data, this shell must be re-audited"
---

<objective>
Build the four Cloudscape shell components — ConsoleShell, TopBar, Sidebar, Breadcrumbs — that wire AppLayout, TopNavigation, SideNavigation, and BreadcrumbGroup together per 01-UI-SPEC.md. This plan lands NAV-01 (service search), NAV-02 (sidebar grouping), NAV-03 (breadcrumbs), and NAV-05 (desktop layout via Cloudscape default responsive behavior).

Depends on Plan 02 (backend registry endpoint must exist so useServices() returns data in tests via MSW) and Plan 03 (shared types, copy, hooks, stubs).

Output: A shell that, once Plan 05 fills in the pages, renders a fully navigable console when hit at localhost:4566/_console/.
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
@web/src/shared/serviceCategories.ts
@web/src/shared/api/services.ts
@web/src/stores/uiStore.ts
@web/src/test/utils.tsx

<interfaces>
<!-- Exact contracts from Plan 03 that this plan consumes -->

From web/src/shared/types.ts:
```typescript
export type Service = { key: string; name: string; category: ServiceCategory }
```

From web/src/shared/api/services.ts:
```typescript
export function useServices(): UseQueryResult<Service[], Error>
```

From web/src/shared/copy.ts:
```typescript
export const copy: {
  brand: 'MiniStack'
  brandTagline: 'Local AWS Emulator'
  searchPlaceholder: 'Search services'
  searchEmpty: (q: string) => string
  searchNoServices: string
  sidebarHeader: 'Services'
  region: 'us-east-1'
  breadcrumbRoot: 'Console'
  // ... (see copy.ts for full list)
}
```

From web/src/shared/serviceCategories.ts:
```typescript
export const CATEGORY_ORDER: readonly ServiceCategory[]
```

From web/src/stores/uiStore.ts:
```typescript
export const useUiStore: StateWithPersist<{
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}>
```

From web/src/test/utils.tsx:
```typescript
export function renderWithProviders(ui, opts?: { route?: string }): RenderResult
```

Cloudscape import paths (each component is its own subpath import — this is the Cloudscape idiom):
```typescript
import AppLayout from '@cloudscape-design/components/app-layout'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import SideNavigation from '@cloudscape-design/components/side-navigation'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Autosuggest from '@cloudscape-design/components/autosuggest'
import ContentLayout from '@cloudscape-design/components/content-layout'
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write real tests for AppShell, ServiceSearch, ServiceSidebar, Breadcrumbs (RED)</name>
  <files>
    web/src/__tests__/AppShell.test.tsx,
    web/src/__tests__/ServiceSearch.test.tsx,
    web/src/__tests__/ServiceSidebar.test.tsx,
    web/src/__tests__/Breadcrumbs.test.tsx
  </files>
  <read_first>
    web/src/__tests__/AppShell.test.tsx (Wave 0 stub with it.skip),
    web/src/test/utils.tsx,
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (§Layout Skeleton, §Copywriting Contract, §Service Categories, §Interaction Contract),
    web/src/shared/copy.ts,
    web/src/shared/types.ts
  </read_first>
  <behavior>
    Tests will fail at first (RED) because components are still placeholders. Task 2 makes them pass (GREEN).
    
    AppShell.test.tsx:
      - Mount ConsoleShell inside renderWithProviders, stub useServices to return 3 services, assert: TopBar brand 'MiniStack' present, Sidebar renders, breadcrumb 'Console' present, Outlet child rendered
    
    ServiceSearch.test.tsx:
      - Mount TopBar with mocked useServices([{key:'ec2',name:'EC2',category:'Compute'},{key:'s3',name:'S3',category:'Storage'}])
      - Type 'ec' → filtered option 'EC2' shown
      - Click 'EC2' option → navigate spy called with '/services/ec2'
      - Type 'zzz' → searchEmpty copy visible
    
    ServiceSidebar.test.tsx:
      - Mount Sidebar with mocked useServices (EC2, Lambda, S3, DynamoDB, SQS)
      - Assert: section headers 'Compute', 'Storage', 'Database', 'Application Integration' are present (in that order)
      - Assert: 'EC2' appears before 'Lambda' alphabetically within Compute
      - Assert: empty categories (e.g., 'Management & Governance' with no items) are NOT rendered
    
    Breadcrumbs.test.tsx:
      - Mount Breadcrumbs at route '/' → only 'Console' crumb visible
      - Mount Breadcrumbs at route '/services/ec2' with mocked useServices → 'Console' → 'EC2' crumbs visible
      - Click 'Console' crumb → navigate spy called with '/'
  </behavior>
  <action>
Mock useServices by using `vi.mock` — do NOT start an MSW server for these shell-level tests (MSW is reserved for Plan 05 ServiceHome tests where real HTTP is necessary). Example pattern:

```typescript
import { vi } from 'vitest'

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'ec2',      name: 'EC2',      category: 'Compute' },
      { key: 'lambda',   name: 'Lambda',   category: 'Compute' },
      { key: 's3',       name: 'S3',       category: 'Storage' },
      { key: 'dynamodb', name: 'DynamoDB', category: 'Database' },
      { key: 'sqs',      name: 'SQS',      category: 'Application Integration' },
    ],
    isLoading: false,
    error: null,
  }),
}))
```

**`web/src/__tests__/AppShell.test.tsx`:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { ConsoleShell } from '../app/ConsoleShell'

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'ec2', name: 'EC2', category: 'Compute' },
      { key: 's3', name: 'S3', category: 'Storage' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('ConsoleShell', () => {
  it('renders TopBar brand, Sidebar services header, and Breadcrumbs root', () => {
    renderWithProviders(<ConsoleShell />, { route: '/' })
    expect(screen.getByText('MiniStack')).toBeInTheDocument()
    expect(screen.getByText('Services')).toBeInTheDocument()
    expect(screen.getByText('Console')).toBeInTheDocument()
  })

  it('wires headerSelector="#top-nav" on AppLayout (regression for Pitfall #4)', () => {
    const { container } = renderWithProviders(<ConsoleShell />, { route: '/' })
    expect(container.querySelector('#top-nav')).not.toBeNull()
  })
})
```

**`web/src/__tests__/ServiceSearch.test.tsx`:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils'
import { TopBar } from '../app/TopBar'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'ec2', name: 'EC2', category: 'Compute' },
      { key: 's3',  name: 'S3',  category: 'Storage' },
      { key: 'dynamodb', name: 'DynamoDB', category: 'Database' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('TopBar service search (NAV-01)', () => {
  beforeEach(() => navigateMock.mockReset())

  it('filters services case-insensitive substring on type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar />)
    const input = screen.getByPlaceholderText('Search services')
    await user.click(input)
    await user.type(input, 'ec')
    expect(await screen.findByText('EC2')).toBeInTheDocument()
  })

  it('navigates to /services/:key when an option is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar />)
    const input = screen.getByPlaceholderText('Search services')
    await user.click(input)
    await user.type(input, 'EC2')
    const option = await screen.findByText('EC2')
    await user.click(option)
    expect(navigateMock).toHaveBeenCalledWith('/services/ec2')
  })
})
```

**`web/src/__tests__/ServiceSidebar.test.tsx`:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { Sidebar } from '../app/Sidebar'

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [
      { key: 'lambda',   name: 'Lambda',   category: 'Compute' },
      { key: 'ec2',      name: 'EC2',      category: 'Compute' },
      { key: 's3',       name: 'S3',       category: 'Storage' },
      { key: 'dynamodb', name: 'DynamoDB', category: 'Database' },
      { key: 'sqs',      name: 'SQS',      category: 'Application Integration' },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('Sidebar (NAV-02)', () => {
  it('renders services grouped by category with alphabetical order within category', () => {
    renderWithProviders(<Sidebar />)
    // All services present
    expect(screen.getByText('EC2')).toBeInTheDocument()
    expect(screen.getByText('Lambda')).toBeInTheDocument()
    expect(screen.getByText('S3')).toBeInTheDocument()
    // Category headers present
    expect(screen.getByText('Compute')).toBeInTheDocument()
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Application Integration')).toBeInTheDocument()
  })

  it('does not render categories with no services', () => {
    renderWithProviders(<Sidebar />)
    // No CloudWatch → Management & Governance category should not render
    expect(screen.queryByText('Management & Governance')).toBeNull()
    expect(screen.queryByText('Security, Identity & Compliance')).toBeNull()
  })

  it('orders services alphabetically within Compute (EC2 before Lambda)', () => {
    renderWithProviders(<Sidebar />)
    const ec2 = screen.getByText('EC2')
    const lambda = screen.getByText('Lambda')
    // DOM order: EC2 comes before Lambda
    expect(ec2.compareDocumentPosition(lambda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
```

**`web/src/__tests__/Breadcrumbs.test.tsx`:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { Breadcrumbs } from '../app/Breadcrumbs'

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'ec2', name: 'EC2', category: 'Compute' }],
    isLoading: false,
    error: null,
  }),
}))

describe('Breadcrumbs (NAV-03)', () => {
  it('shows Console at root path', () => {
    renderWithProviders(<Breadcrumbs />, { route: '/' })
    expect(screen.getByText('Console')).toBeInTheDocument()
  })

  it('shows Console > EC2 at /services/ec2', () => {
    renderWithProviders(<Breadcrumbs />, { route: '/services/ec2' })
    expect(screen.getByText('Console')).toBeInTheDocument()
    expect(screen.getByText('EC2')).toBeInTheDocument()
  })
})
```

After writing, run tests to confirm they FAIL with meaningful errors (placeholders don't render 'MiniStack', 'Services', etc.). This proves the tests actually exercise the contract.
  </action>
  <acceptance_criteria>
    - All 4 test files contain real assertions (no `.skip`)
    - `cd web && npx vitest run src/__tests__/AppShell.test.tsx src/__tests__/ServiceSearch.test.tsx src/__tests__/ServiceSidebar.test.tsx src/__tests__/Breadcrumbs.test.tsx --reporter=dot` exits NON-ZERO (tests fail as expected — RED state)
    - `! grep -q "it.skip\|test.skip" web/src/__tests__/AppShell.test.tsx web/src/__tests__/ServiceSearch.test.tsx web/src/__tests__/ServiceSidebar.test.tsx web/src/__tests__/Breadcrumbs.test.tsx`
  </acceptance_criteria>
  <verify>
    <automated>cd web && ! npx vitest run src/__tests__/AppShell.test.tsx src/__tests__/ServiceSearch.test.tsx src/__tests__/ServiceSidebar.test.tsx src/__tests__/Breadcrumbs.test.tsx --reporter=dot</automated>
  </verify>
  <done>Tests exist with real assertions and currently fail (RED state). This is the TDD red step — Task 2 makes them green.</done>
</task>

<task type="auto">
  <name>Task 2: Implement ConsoleShell, TopBar (Autosuggest), Sidebar (grouped), Breadcrumbs — make RED tests GREEN</name>
  <files>
    web/src/app/ConsoleShell.tsx,
    web/src/app/TopBar.tsx,
    web/src/app/Sidebar.tsx,
    web/src/app/Breadcrumbs.tsx
  </files>
  <read_first>
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§"Pattern 4: Cloudscape AppLayout Composition", §"Pattern 5: Service Search via Autosuggest", §"Pattern 6: Breadcrumb Derivation"),
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (§Layout Skeleton, §Service Categories, §Copywriting Contract, §Accessibility Contract),
    web/src/app/ConsoleShell.tsx (Plan 03 placeholder — to be replaced),
    web/src/app/TopBar.tsx — does not exist yet,
    web/src/app/Sidebar.tsx — does not exist yet,
    web/src/app/Breadcrumbs.tsx — does not exist yet,
    web/src/shared/copy.ts,
    web/src/shared/types.ts,
    web/src/shared/serviceCategories.ts,
    web/src/shared/api/services.ts,
    web/src/stores/uiStore.ts,
    web/src/__tests__/AppShell.test.tsx,
    web/src/__tests__/ServiceSearch.test.tsx,
    web/src/__tests__/ServiceSidebar.test.tsx,
    web/src/__tests__/Breadcrumbs.test.tsx
  </read_first>
  <action>
REPLACE the Plan 03 `ConsoleShell.tsx` placeholder with the real implementation. CREATE the three new component files.

**`web/src/app/ConsoleShell.tsx`** — from RESEARCH.md §Pattern 4, adapted to use the real Sidebar/TopBar/Breadcrumbs:
```typescript
import { Outlet } from 'react-router-dom'
import AppLayout from '@cloudscape-design/components/app-layout'
import ContentLayout from '@cloudscape-design/components/content-layout'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { useUiStore } from '../stores/uiStore'

export function ConsoleShell() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)

  return (
    <>
      <TopBar />
      <AppLayout
        navigation={<Sidebar />}
        navigationOpen={sidebarOpen}
        onNavigationChange={({ detail }) => setSidebarOpen(detail.open)}
        toolsHide
        breadcrumbs={<Breadcrumbs />}
        content={
          <ContentLayout>
            <Outlet />
          </ContentLayout>
        }
        headerSelector="#top-nav"
      />
    </>
  )
}
```

**`web/src/app/TopBar.tsx`** — from RESEARCH.md §Pattern 5, using `copy`.

**Note:** TopNavigation `identity.href = '/_console/'` triggers a full document navigation when clicked (Cloudscape's TopNavigation does not integrate with React Router by default). This is accepted for Phase 1 — the brand link is rarely clicked and a full reload re-mounts the SPA cleanly. Wiring the brand to client-side routing is deferred to Phase 5 polish.
```typescript
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import Autosuggest from '@cloudscape-design/components/autosuggest'
import { useServices } from '../shared/api/services'
import { copy } from '../shared/copy'

export function TopBar() {
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const [value, setValue] = useState('')

  const options = useMemo(
    () =>
      services.map((s) => ({
        value: s.name,
        label: s.name,
        tags: [s.category],
        // custom field for keyed navigation
        __serviceKey: s.key,
      })),
    [services],
  )

  return (
    <div id="top-nav">
      <TopNavigation
        identity={{
          href: '/_console/',
          title: copy.brand,
          logo: undefined,
        }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: copy.region,
            items: [{ id: 'us-east-1', text: 'us-east-1' }],
          },
        ]}
        search={
          <Autosuggest
            value={value}
            onChange={({ detail }) => setValue(detail.value)}
            onSelect={({ detail }) => {
              const picked = options.find((o) => o.value === detail.value)
              if (picked) {
                navigate(`/services/${(picked as any).__serviceKey}`)
                setValue('')
              }
            }}
            options={options}
            ariaLabel={copy.searchPlaceholder}
            placeholder={copy.searchPlaceholder}
            enteredTextLabel={(v) => `Go to "${v}"`}
            empty={copy.searchEmpty(value)}
            filteringType="auto"
          />
        }
      />
    </div>
  )
}
```

**`web/src/app/Sidebar.tsx`** — groups services by category, hides empty categories, alphabetizes:
```typescript
import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import SideNavigation, {
  SideNavigationProps,
} from '@cloudscape-design/components/side-navigation'
import { useServices } from '../shared/api/services'
import { CATEGORY_ORDER } from '../shared/serviceCategories'
import { copy } from '../shared/copy'
import type { Service, ServiceCategory } from '../shared/types'

function groupByCategory(services: Service[]): Map<ServiceCategory, Service[]> {
  const groups = new Map<ServiceCategory, Service[]>()
  for (const svc of services) {
    const list = groups.get(svc.category) ?? []
    list.push(svc)
    groups.set(svc.category, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return groups
}

export function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: services = [] } = useServices()

  const items = useMemo<SideNavigationProps.Item[]>(() => {
    const grouped = groupByCategory(services)
    const sections: SideNavigationProps.Item[] = []
    for (const category of CATEGORY_ORDER) {
      const list = grouped.get(category)
      if (!list || list.length === 0) continue
      sections.push({
        type: 'section',
        text: category,
        items: list.map((svc) => ({
          type: 'link',
          text: svc.name,
          href: `/services/${svc.key}`,
        })),
      })
    }
    return sections
  }, [services])

  return (
    <SideNavigation
      header={{ text: copy.sidebarHeader, href: '/' }}
      activeHref={pathname}
      items={items}
      onFollow={(e) => {
        if (!e.detail.external) {
          e.preventDefault()
          navigate(e.detail.href)
        }
      }}
    />
  )
}
```

**`web/src/app/Breadcrumbs.tsx`** — derived from `useLocation()`:
```typescript
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BreadcrumbGroup, {
  BreadcrumbGroupProps,
} from '@cloudscape-design/components/breadcrumb-group'
import { useServices } from '../shared/api/services'
import { copy } from '../shared/copy'

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { data: services = [] } = useServices()

  const items = useMemo<BreadcrumbGroupProps.Item[]>(() => {
    const parts = pathname.split('/').filter(Boolean)
    const crumbs: BreadcrumbGroupProps.Item[] = [
      { text: copy.breadcrumbRoot, href: '/' },
    ]
    if (parts[0] === 'services' && parts[1]) {
      const svc = services.find((s) => s.key === parts[1])
      crumbs.push({
        text: svc?.name ?? parts[1],
        href: `/services/${parts[1]}`,
      })
    }
    return crumbs
  }, [pathname, services])

  return (
    <BreadcrumbGroup
      items={items}
      onFollow={(e) => {
        e.preventDefault()
        navigate(e.detail.href)
      }}
    />
  )
}
```

Now run the tests — they should go GREEN.
  </action>
  <acceptance_criteria>
    - `test -f web/src/app/ConsoleShell.tsx && test -f web/src/app/TopBar.tsx && test -f web/src/app/Sidebar.tsx && test -f web/src/app/Breadcrumbs.tsx`
    - `grep -q 'headerSelector="#top-nav"' web/src/app/ConsoleShell.tsx`
    - `grep -q 'id="top-nav"' web/src/app/TopBar.tsx`
    - `grep -q "filteringType=\"auto\"" web/src/app/TopBar.tsx`
    - `grep -q "CATEGORY_ORDER" web/src/app/Sidebar.tsx`
    - `grep -q "localeCompare" web/src/app/Sidebar.tsx`
    - `grep -q "copy.breadcrumbRoot" web/src/app/Breadcrumbs.tsx`
    - `! grep -q "placeholder" web/src/app/ConsoleShell.tsx` (no Plan 03 placeholder text)
    - `cd web && npx tsc -b --noEmit` exits 0
    - `cd web && npx vitest run src/__tests__/AppShell.test.tsx src/__tests__/ServiceSearch.test.tsx src/__tests__/ServiceSidebar.test.tsx src/__tests__/Breadcrumbs.test.tsx --reporter=dot` exits 0 (GREEN)
    - `cd web && npx vite build` exits 0 (full build still works)
  </acceptance_criteria>
  <verify>
    <automated>cd web && npx tsc -b --noEmit && npx vitest run src/__tests__/AppShell.test.tsx src/__tests__/ServiceSearch.test.tsx src/__tests__/ServiceSidebar.test.tsx src/__tests__/Breadcrumbs.test.tsx --reporter=dot && npx vite build</automated>
  </verify>
  <done>All four shell tests are GREEN. Frontend builds. NAV-01, NAV-02, NAV-03 are functionally implemented. NAV-05 is delivered transparently by Cloudscape AppLayout's built-in responsive behavior.</done>
</task>

</tasks>

<verification>
Shell plan gate:
```bash
cd web && npx tsc -b --noEmit
cd web && npx vitest run --reporter=dot  # full suite — every test must pass or skip
cd web && npx vite build
grep -q "/_console/assets/" ministack/static/console/index.html
```
</verification>

<success_criteria>
- NAV-01: Typing in search filters and selecting navigates (test passes)
- NAV-02: Sidebar shows grouped, sorted, non-empty categories (test passes)
- NAV-03: Breadcrumbs derived from pathname (test passes)
- NAV-05: AppLayout's built-in responsive behavior is used (verified by E2E in Plan 06)
- Pitfall #4 mitigation: `id="top-nav"` + `headerSelector="#top-nav"` verified by test
- Full frontend unit suite green
</success_criteria>

<output>
Create `.planning/phases/01-app-shell-navigation/01-04-SUMMARY.md` documenting: any Cloudscape runtime warnings, confirmation that the four RED tests became GREEN, and the count of tests passing vs skipped in the frontend suite.
</output>
