import { Outlet } from 'react-router-dom'

/**
 * Minimal route wrapper for /services/lambda/*. Mirrors the S3Layout pattern.
 * Pages (FunctionListPage, FunctionDetailPage) own their own <Header>.
 */
export default function LambdaLayout() {
  return <Outlet />
}
