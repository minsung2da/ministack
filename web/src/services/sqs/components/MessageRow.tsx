import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import type { SqsMessage } from '../../../shared/types/sqs'

type Props = {
  message: SqsMessage
  onDelete: (receiptHandle: string) => void
}

/**
 * MessageRow — standalone renderer for a single SQS message (optional use;
 * MessagesTab currently uses the Cloudscape Table variant).
 */
export function MessageRow({ message, onDelete }: Props) {
  const attrs = message.MessageAttributes
    ? Object.entries(message.MessageAttributes)
    : []
  return (
    <Box padding="s">
      <SpaceBetween size="xs">
        <Box variant="awsui-key-label">MessageId</Box>
        <Box variant="code">{message.MessageId}</Box>
        <Box variant="awsui-key-label">Body</Box>
        <pre
          style={{
            background: '#f2f3f3',
            padding: '8px',
            borderRadius: 4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {message.Body ?? ''}
        </pre>
        {attrs.length > 0 && (
          <>
            <Box variant="awsui-key-label">MessageAttributes</Box>
            <Box>
              {attrs.map(([k, v]) => (
                <div key={k}>
                  <b>{k}</b>: {v.DataType} = {v.StringValue ?? ''}
                </div>
              ))}
            </Box>
          </>
        )}
        <Button
          variant="normal"
          onClick={() => onDelete(message.ReceiptHandle)}
        >
          Delete message
        </Button>
      </SpaceBetween>
    </Box>
  )
}
