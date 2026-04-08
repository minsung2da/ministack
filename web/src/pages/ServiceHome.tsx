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
  const { data, isLoading, error, refetch, isFetching } = useQuery({
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
          <Box variant="p" color="text-body-secondary">
            —
          </Box>
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
