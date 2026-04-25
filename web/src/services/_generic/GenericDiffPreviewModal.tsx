import Modal from '@cloudscape-design/components/modal'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Header from '@cloudscape-design/components/header'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import { copy } from '../../shared/copy'

type Props = {
  visible: boolean
  title?: string
  url: string
  headers: Record<string, string>
  body: string | undefined
  method?: string
  isPending?: boolean
  onDismiss: () => void
  onConfirm: () => void
}

function prettyBody(body: string | undefined): string {
  if (body === undefined || body.length === 0) return '(empty)'
  try {
    const parsed = JSON.parse(body)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return body
  }
}

function headersToText(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

const preStyle: React.CSSProperties = {
  background: '#f2f3f3',
  padding: '8px',
  borderRadius: 4,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  margin: 0,
  fontSize: 12,
}

/**
 * GenericDiffPreviewModal — D-07 safety gate.
 *
 * Renders the exact { url, headers, body } that useDescriptorMutation.preview
 * returned. Pitfall 7.2.6: send() uses the same buildRequest output, so what
 * the user sees is byte-identical to what fires on click.
 */
export function GenericDiffPreviewModal({
  visible,
  title,
  url,
  headers,
  body,
  method,
  isPending,
  onDismiss,
  onConfirm,
}: Props) {
  const headerText = headersToText(headers)
  const bodyText = prettyBody(body)

  return (
    <Modal
      visible={visible}
      header={title ?? copy.generic.diffPreviewTitle}
      size="large"
      onDismiss={() => !isPending && onDismiss()}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={onDismiss}
              disabled={isPending}
            >
              {copy.generic.cancelButton}
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              loading={!!isPending}
            >
              {copy.generic.sendButton}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <div>
          <Header variant="h3">
            {copy.generic.diffUrlHeader}
            {method ? ` (${method})` : ''}
          </Header>
          <SpaceBetween direction="horizontal" size="xxs">
            <pre style={preStyle}>{url}</pre>
            <CopyToClipboard
              textToCopy={url}
              copyButtonText="Copy"
              copyErrorText="Failed"
              copySuccessText="Copied"
            />
          </SpaceBetween>
        </div>

        <div>
          <Header variant="h3">{copy.generic.diffHeadersHeader}</Header>
          <SpaceBetween direction="horizontal" size="xxs">
            <pre style={preStyle}>{headerText}</pre>
            <CopyToClipboard
              textToCopy={headerText}
              copyButtonText="Copy"
              copyErrorText="Failed"
              copySuccessText="Copied"
            />
          </SpaceBetween>
        </div>

        <div>
          <Header variant="h3">{copy.generic.diffBodyHeader}</Header>
          <SpaceBetween direction="horizontal" size="xxs">
            <pre style={preStyle}>{bodyText}</pre>
            <CopyToClipboard
              textToCopy={bodyText}
              copyButtonText="Copy"
              copyErrorText="Failed"
              copySuccessText="Copied"
            />
          </SpaceBetween>
        </div>
      </SpaceBetween>
    </Modal>
  )
}
