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
