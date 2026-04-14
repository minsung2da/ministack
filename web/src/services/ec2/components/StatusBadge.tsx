import StatusIndicator from '@cloudscape-design/components/status-indicator'
import type { StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'

export const EC2_STATE_MAP: Record<string, StatusIndicatorProps.Type> = {
  running: 'success',
  stopped: 'warning',
  terminated: 'error',
  pending: 'in-progress',
  'shutting-down': 'in-progress',
  stopping: 'in-progress',
  rebooting: 'in-progress',
  available: 'success',
  'in-use': 'info',
  creating: 'in-progress',
  deleting: 'in-progress',
  error: 'error',
  deleted: 'stopped',
}

export function StatusBadge({ state }: { state: string }) {
  return (
    <StatusIndicator type={EC2_STATE_MAP[state] ?? 'info'}>
      {state}
    </StatusIndicator>
  )
}
