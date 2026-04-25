import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import type { InvokeResult as InvokeResultType } from '../../../shared/types'
import { copy } from '../../../shared/copy'

/**
 * InvokeResult [LAM-02 / D-06]
 *
 * D-06 layout: optional red Alert (when X-Amz-Function-Error header present
 * — Pitfall 2) → Response container (JSON pretty-printed) → Logs container
 * (base64-decoded UTF-8 from X-Amz-Log-Result — Pitfall 1 already handled
 * by `decodeLogResult` at the client layer). Vertical stack — no tabs.
 *
 * React auto-escapes children rendered between JSX tags, so `{pretty}`
 * inside `<pre>` is safe (no dangerouslySetInnerHTML).
 */

type Props = { result: InvokeResultType }

const preStyle = { margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } as const

function prettyPrint(body: unknown): string {
  if (typeof body === 'string') return body
  if (body === null || body === undefined) return ''
  try {
    return JSON.stringify(body, null, 2)
  } catch {
    return String(body)
  }
}

export function InvokeResult({ result }: Props) {
  const { body, logResult, functionError } = result
  const pretty = prettyPrint(body)

  return (
    <SpaceBetween size="m">
      {functionError && (
        <Alert type="error" header={copy.lambda.invokeFunctionErrorHeading}>
          <Box variant="span">
            This function raised: <code>{functionError}</code>
          </Box>
        </Alert>
      )}

      <Container
        header={
          <Header
            variant="h3"
            actions={
              <CopyToClipboard
                textToCopy={pretty}
                copyButtonText="Copy"
                copySuccessText="Copied"
                copyErrorText="Copy failed"
              />
            }
          >
            {copy.lambda.invokeResponseHeader}
          </Header>
        }
      >
        <pre style={preStyle}>{pretty}</pre>
      </Container>

      <Container
        header={
          <Header
            variant="h3"
            actions={
              logResult ? (
                <CopyToClipboard
                  textToCopy={logResult}
                  copyButtonText="Copy"
                  copySuccessText="Copied"
                  copyErrorText="Copy failed"
                />
              ) : undefined
            }
          >
            {copy.lambda.invokeLogsHeader}
          </Header>
        }
      >
        {logResult ? (
          <pre style={preStyle}>{logResult}</pre>
        ) : (
          <Box variant="p" color="text-status-inactive">
            {copy.lambda.invokeLogsEmpty}
          </Box>
        )}
      </Container>
    </SpaceBetween>
  )
}
