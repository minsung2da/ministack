import { Outlet } from 'react-router-dom'

/**
 * Minimal route wrapper for /services/sqs/*. Mirrors DDBLayout / LambdaLayout.
 * Pages (QueueListPage, QueueDetailPage) own their own <Header>.
 */
export default function SQSLayout() {
  return <Outlet />
}
