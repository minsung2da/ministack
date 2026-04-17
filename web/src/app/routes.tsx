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
const InstancesTab = lazy(() => import('../services/ec2/pages/InstancesTab'))
const VpcsTab = lazy(() => import('../services/ec2/pages/VpcsTab'))
const SubnetsTab = lazy(() => import('../services/ec2/pages/SubnetsTab'))
const SecurityGroupsTab = lazy(() => import('../services/ec2/pages/SecurityGroupsTab'))
const KeyPairsTab = lazy(() => import('../services/ec2/pages/KeyPairsTab'))
const VolumesTab = lazy(() => import('../services/ec2/pages/VolumesTab'))
const SnapshotsTab = lazy(() => import('../services/ec2/pages/SnapshotsTab'))
const ElasticIpsTab = lazy(() => import('../services/ec2/pages/ElasticIpsTab'))
const InternetGatewaysTab = lazy(
  () => import('../services/ec2/pages/InternetGatewaysTab'),
)
const NatGatewaysTab = lazy(() => import('../services/ec2/pages/NatGatewaysTab'))
const RouteTablesTab = lazy(() => import('../services/ec2/pages/RouteTablesTab'))
const NetworkInterfacesTab = lazy(
  () => import('../services/ec2/pages/NetworkInterfacesTab'),
)
const InstanceWizard = lazy(() => import('../services/ec2/pages/InstanceWizard'))

// Phase 3 — S3 routes
const S3Layout = lazy(() => import('../services/s3/S3Layout'))
const BucketListPage = lazy(() => import('../services/s3/BucketListPage'))
const ObjectBrowserPage = lazy(() => import('../services/s3/ObjectBrowserPage'))

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
            element: withSuspense(<InstancesTab />),
          },
          { path: 'vpcs', element: withSuspense(<VpcsTab />) },
          {
            path: 'subnets',
            element: withSuspense(<SubnetsTab />),
          },
          {
            path: 'security-groups',
            element: withSuspense(<SecurityGroupsTab />),
          },
          {
            path: 'key-pairs',
            element: withSuspense(<KeyPairsTab />),
          },
          {
            path: 'volumes',
            element: withSuspense(<VolumesTab />),
          },
          {
            path: 'snapshots',
            element: withSuspense(<SnapshotsTab />),
          },
          {
            path: 'elastic-ips',
            element: withSuspense(<ElasticIpsTab />),
          },
          {
            path: 'internet-gateways',
            element: withSuspense(<InternetGatewaysTab />),
          },
          {
            path: 'nat-gateways',
            element: withSuspense(<NatGatewaysTab />),
          },
          {
            path: 'launch-wizard',
            element: withSuspense(<InstanceWizard />),
          },
          {
            path: 'route-tables',
            element: withSuspense(<RouteTablesTab />),
          },
          {
            path: 'network-interfaces',
            element: withSuspense(<NetworkInterfacesTab />),
          },
        ],
      },
      // S3 routes MUST appear BEFORE services/:serviceKey wildcard (Pitfall 5)
      {
        path: 'services/s3',
        element: withSuspense(<S3Layout />),
        children: [
          { index: true, element: withSuspense(<BucketListPage />) },
          {
            path: ':bucketName',
            element: withSuspense(<ObjectBrowserPage />),
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
