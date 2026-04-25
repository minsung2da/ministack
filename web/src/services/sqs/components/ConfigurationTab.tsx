import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import type { SqsQueueAttributes } from '../../../shared/types/sqs'
import { copy } from '../../../shared/copy'

type Props = {
  attributes: SqsQueueAttributes | null
}

function fmtDate(d: Date | undefined): string {
  if (!d) return '—'
  try {
    return d.toISOString()
  } catch {
    return '—'
  }
}

/**
 * ConfigurationTab — read-only queue attributes.
 */
export function ConfigurationTab({ attributes }: Props) {
  if (!attributes) {
    return (
      <Box padding="m" variant="p">
        {copy.sqs.configurationLoading}
      </Box>
    )
  }
  return (
    <SpaceBetween size="l">
      <Container header={<Header variant="h3">Identification</Header>}>
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: 'QueueArn',
              value: (
                <SpaceBetween direction="horizontal" size="xxs">
                  <span>{attributes.QueueArn}</span>
                  <CopyToClipboard
                    textToCopy={attributes.QueueArn}
                    copyButtonText="Copy"
                    copyErrorText="Failed"
                    copySuccessText="Copied"
                  />
                </SpaceBetween>
              ),
            },
          ]}
        />
      </Container>

      <Container header={<Header variant="h3">Counts</Header>}>
        <KeyValuePairs
          columns={3}
          items={[
            {
              label: 'Messages available',
              value: String(attributes.ApproximateNumberOfMessages),
            },
            {
              label: 'Messages in flight',
              value: String(attributes.ApproximateNumberOfMessagesNotVisible),
            },
            {
              label: 'Messages delayed',
              value: String(attributes.ApproximateNumberOfMessagesDelayed),
            },
          ]}
        />
      </Container>

      <Container header={<Header variant="h3">Configuration</Header>}>
        <KeyValuePairs
          columns={3}
          items={[
            {
              label: 'VisibilityTimeout (s)',
              value: String(attributes.VisibilityTimeout),
            },
            {
              label: 'MaximumMessageSize (bytes)',
              value: String(attributes.MaximumMessageSize),
            },
            {
              label: 'MessageRetentionPeriod (s)',
              value: String(attributes.MessageRetentionPeriod),
            },
          ]}
        />
      </Container>

      <Container header={<Header variant="h3">Timestamps</Header>}>
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: 'Created',
              value: fmtDate(attributes.CreatedTimestamp),
            },
          ]}
        />
      </Container>
    </SpaceBetween>
  )
}
