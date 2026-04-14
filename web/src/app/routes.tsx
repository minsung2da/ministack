import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import Spinner from '@cloudscape-design/components/spinner'

// Plan 04 creates ConsoleShell; Plan 05 creates the page components.
// Lazy imports keep this file green until those files exist.
const ConsoleShell = lazy(() =>
  import('./ConsoleShell').then((m) => ({ default: m.ConsoleShell })),
)
const ConsoleHome = lazy(() => import('../pages/ConsoleHome'))
const ServiceHome = lazy(() => import('../pages/ServiceHome'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const Ec2Dashboard = lazy(() => import('../services/ec2/pages/Ec2Dashboard'))
const Ec2TabPlaceholder = lazy(
  () => import('../services/ec2/pages/Ec2TabPlaceholder'),
)

function withSuspense(node: ReactNode): ReactNode {
  return <Suspense fallback={<Spinner size="large" />}>{node}</Suspense>
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: withSuspense(<ConsoleShell />),
    children: [
      { index: true, element: withSuspense(<ConsoleHome />) },
      // EC2 route must appear BEFORE services/:serviceKey wildcard (Pitfall 5)
      {
        path: 'services/ec2',
        element: withSuspense(<Ec2Dashboard />),
        children: [
          { index: true, element: <Navigate to="instances" replace /> },
          {
            path: 'instances',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          { path: 'vpcs', element: withSuspense(<Ec2TabPlaceholder />) },
          {
            path: 'subnets',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'security-groups',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'key-pairs',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'volumes',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'snapshots',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'elastic-ips',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'internet-gateways',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'nat-gateways',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'route-tables',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
          {
            path: 'network-interfaces',
            element: withSuspense(<Ec2TabPlaceholder />),
          },
        ],
      },
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
