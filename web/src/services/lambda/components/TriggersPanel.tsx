import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import Table from '@cloudscape-design/components/table'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import Link from '@cloudscape-design/components/link'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Spinner from '@cloudscape-design/components/spinner'
import Alert from '@cloudscape-design/components/alert'
import { useEventSourceMappings } from '../api/useEventSourceMappings'
import { useFunctionUrl } from '../api/useFunctionUrl'
import { copy } from '../../../shared/copy'
import { RelativeTime } from './RelativeTime'
import type {
  LambdaEventSourceMapping,
  LambdaFunctionUrl,
} from '../../../shared/types'

type Props = { functionName: string }

/**
 * TriggersPanel [LAM-03 / D-07]
 *
 * Read-only view of triggers for a Lambda function:
 *   - Event source mappings (SQS, Kinesis, DDB streams, ...)
 *   - Function URLs
 *
 * D-07: NO create / edit / delete controls. This panel is pure render over
 * the useEventSourceMappings + useFunctionUrl hooks. Trigger CRUD is
 * deferred to a later phase (different per source type).
 */
export function TriggersPanel({ functionName }: Props) {
  const esms = useEventSourceMappings(functionName)
  const urls = useFunctionUrl(functionName)

  const mappings: LambdaEventSourceMapping[] =
    esms.data?.EventSourceMappings ?? []
  const functionUrls: LambdaFunctionUrl[] = urls.data?.FunctionUrlConfigs ?? []

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header variant="h2">{copy.lambda.eventSourceMappingsHeading}</Header>
        }
      >
        {esms.isLoading ? (
          <Spinner />
        ) : esms.error ? (
          <Alert type="error">{(esms.error as Error).message}</Alert>
        ) : mappings.length === 0 ? (
          <Box padding="m" variant="p">
            {copy.lambda.triggersEsmsEmpty}
          </Box>
        ) : (
          <EsmTable mappings={mappings} />
        )}
      </Container>
      <Container
        header={<Header variant="h2">{copy.lambda.functionUrlsHeading}</Header>}
      >
        {urls.isLoading ? (
          <Spinner />
        ) : urls.error ? (
          <Alert type="error">{(urls.error as Error).message}</Alert>
        ) : functionUrls.length === 0 ? (
          <Box padding="m" variant="p">
            {copy.lambda.triggersUrlsEmpty}
          </Box>
        ) : (
          <FunctionUrlsList urls={functionUrls} />
        )}
      </Container>
    </SpaceBetween>
  )
}

function EsmTable({ mappings }: { mappings: LambdaEventSourceMapping[] }) {
  return (
    <Table
      items={mappings}
      variant="embedded"
      trackBy="UUID"
      columnDefinitions={[
        {
          id: 'uuid',
          header: 'UUID',
          cell: (m) => m.UUID,
        },
        {
          id: 'source',
          header: 'Source ARN',
          cell: (m) => (
            <SpaceBetween direction="horizontal" size="xs">
              <span>{m.EventSourceArn}</span>
              <CopyToClipboard
                textToCopy={m.EventSourceArn}
                copyButtonText={copy.lambda.copyArnButton}
                copySuccessText="Copied"
                copyErrorText="Copy failed"
              />
            </SpaceBetween>
          ),
        },
        {
          id: 'state',
          header: 'State',
          cell: (m) => (
            <StatusIndicator
              type={
                m.State === 'Enabled'
                  ? 'success'
                  : m.State === 'Disabled'
                    ? 'stopped'
                    : 'info'
              }
            >
              {m.State}
            </StatusIndicator>
          ),
        },
        {
          id: 'batch',
          header: 'Batch size',
          cell: (m) => m.BatchSize,
        },
        {
          id: 'lastProc',
          header: 'Last processing',
          cell: (m) => m.LastProcessingResult ?? '—',
        },
      ]}
    />
  )
}

function FunctionUrlsList({ urls }: { urls: LambdaFunctionUrl[] }) {
  return (
    <SpaceBetween size="m">
      {urls.map((u) => (
        <KeyValuePairs
          key={u.FunctionUrl}
          columns={2}
          items={[
            {
              label: 'URL',
              value: (
                <SpaceBetween direction="horizontal" size="xs">
                  <Link href={u.FunctionUrl} external>
                    {u.FunctionUrl}
                  </Link>
                  <CopyToClipboard
                    textToCopy={u.FunctionUrl}
                    copyButtonText={copy.lambda.copyArnButton}
                    copySuccessText="Copied"
                    copyErrorText="Copy failed"
                  />
                </SpaceBetween>
              ),
            },
            { label: 'Auth type', value: u.AuthType },
            { label: 'Created', value: <RelativeTime iso={u.CreationTime} /> },
            {
              label: 'Last modified',
              value: <RelativeTime iso={u.LastModifiedTime} />,
            },
          ]}
        />
      ))}
    </SpaceBetween>
  )
}
