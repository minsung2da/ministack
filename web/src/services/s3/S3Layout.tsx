import { Outlet } from 'react-router-dom'

/**
 * Minimal wrapper for all S3 routes. Header rendering happens in the
 * individual page components (BucketListPage, ObjectBrowserPage) so that each
 * surface can set the appropriate <Header variant="h1"> copy.
 *
 * Mirrors Phase 2's `Ec2Dashboard` pattern for shared route wrapping, minus
 * the Tabs (S3 uses bucket-centric navigation per UI-SPEC, not tab lists).
 */
export default function S3Layout() {
  return <Outlet />
}
