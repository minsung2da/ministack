import { Outlet } from 'react-router-dom'

/**
 * Minimal route wrapper for /services/ddb/*. Mirrors LambdaLayout (Phase 4).
 * Pages (TableListPage, TableDetailPage) own their own <Header>.
 */
export default function DDBLayout() {
  return <Outlet />
}
