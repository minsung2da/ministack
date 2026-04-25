import { useEffect, useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Spinner from '@cloudscape-design/components/spinner'
import { PayloadEditor } from './PayloadEditor'
import { InvokeResult } from './InvokeResult'
import { useInvoke } from '../api/invokeMutation'
import { copy } from '../../../shared/copy'

/**
 * InvokePanel [LAM-02 / D-04 + D-06 + D-09]
 *
 * Hosts the Test-tab flow: payload editor, Invoke button, cold-start
 * spinner copy state machine (D-09), and result display.
 *
 * State machine for the spinner copy (D-09):
 *   pending=false → copy.lambda.invokingCopy (reset)
 *   pending=true  → copy.lambda.invokingCopy
 *                   after 3000 ms → copy.lambda.stillInvokingCopy
 *
 * No client-side request abort / timeout (see Pitfall 8) — cold starts can
 * legitimately take 10-30s. No abort UI surfaced here either (see D-09).
 *
 * Payload round-trip: the textarea string is JSON.parse'd here; the parsed
 * value goes to `useInvoke`, which re-stringifies in `invokeClient`
 * (Pitfall 3). The `isValid` guard prevents submitting invalid JSON.
 *
 * Cache neutrality (Pitfall 6) is enforced by `useInvoke` itself —
 * re-asserted in the panel-level test by spying on `invalidateQueries`.
 */

type Props = {
  functionName: string
  payload: string
  onPayloadChange: (value: string) => void
}

export function InvokePanel({
  functionName,
  payload,
  onPayloadChange,
}: Props) {
  const [isValid, setIsValid] = useState(true)
  const [spinnerCopy, setSpinnerCopy] = useState<string>(
    copy.lambda.invokingCopy,
  )
  const mutation = useInvoke(functionName)

  // D-09 copy swap at 3000 ms. Reset immediately when pending ends.
  useEffect(() => {
    if (!mutation.isPending) {
      setSpinnerCopy(copy.lambda.invokingCopy)
      return
    }
    setSpinnerCopy(copy.lambda.invokingCopy)
    const timer = setTimeout(() => {
      setSpinnerCopy(copy.lambda.stillInvokingCopy)
    }, 3000)
    return () => clearTimeout(timer)
  }, [mutation.isPending])

  const onSubmit = () => {
    if (!isValid || mutation.isPending || !functionName) return
    try {
      const parsed = JSON.parse(payload)
      mutation.mutate(parsed)
    } catch {
      // isValid guard should have prevented this. No-op.
    }
  }

  const invokeDisabled = !isValid || mutation.isPending || !functionName

  return (
    <SpaceBetween size="l">
      <PayloadEditor
        payload={payload}
        onPayloadChange={onPayloadChange}
        onValidityChange={setIsValid}
        disabled={mutation.isPending}
      />
      <SpaceBetween size="xs" direction="horizontal">
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={invokeDisabled}
        >
          {copy.lambda.invokeButton}
        </Button>
        {mutation.isPending && (
          <SpaceBetween size="xs" direction="horizontal">
            <Spinner />
            <Box variant="span">{spinnerCopy}</Box>
          </SpaceBetween>
        )}
      </SpaceBetween>
      {mutation.isError && (
        <Alert type="error" header="Invoke failed">
          {(mutation.error as Error).message}
        </Alert>
      )}
      {mutation.data && <InvokeResult result={mutation.data} />}
    </SpaceBetween>
  )
}
