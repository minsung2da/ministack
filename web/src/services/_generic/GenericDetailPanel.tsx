import { useState } from 'react'
import { Link } from 'react-router-dom'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import { useDescriptorItem } from './hooks/useGenericItem'
import { copy } from '../../shared/copy'
import type { ServiceDescriptor } from './types'

type Props = {
  descriptor: ServiceDescriptor
  id: string | null
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * GenericDetailPanel — descriptor-driven detail view.
 *
 * D-08: fields listed in `descriptor.detail.maskFields` render as `••••••••`
 * by default with a per-field Reveal button. Clicking Reveal flips local
 * state to show the real value with a Hide button to toggle back.
 */
export function GenericDetailPanel({ descriptor, id }: Props) {
  const query = useDescriptorItem(descriptor.serviceKey, id ?? '')
  // maskFields declares which keys require the Reveal toggle (D-08).
  const maskFields = descriptor.detail?.maskFields ?? []
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  if (query.isLoading) {
    return <Box padding="m">{copy.generic.detailLoading}</Box>
  }
  if (query.error) {
    return (
      <Alert type="error" header="Could not load detail">
        {(query.error as Error).message}
      </Alert>
    )
  }

  const record = (query.data ?? {}) as Record<string, unknown>
  const entries = Object.entries(record)

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: copy.breadcrumbRoot, href: '/_console' },
          {
            text: descriptor.displayName,
            href: `/_console/services/${descriptor.serviceKey}`,
          },
          { text: id ?? descriptor.displayName, href: '' },
        ]}
      />
      <Header variant="h1">
        {id ? `${descriptor.displayName} — ${id}` : descriptor.displayName}
      </Header>

      <Container header={<Header variant="h3">Details</Header>}>
        <SpaceBetween size="m">
          {entries.length === 0 && (
            <Box variant="p">No fields returned.</Box>
          )}
          {entries.map(([key, value]) => {
            const isMasked = maskFields.includes(key)
            const isRevealed = revealed[key] === true
            return (
              <div key={key}>
                <Box variant="awsui-key-label">{key}</Box>
                {isMasked && !isRevealed ? (
                  <SpaceBetween direction="horizontal" size="xs">
                    <code>••••••••</code>
                    <Button
                      variant="normal"
                      onClick={() =>
                        setRevealed((r) => ({ ...r, [key]: true }))
                      }
                    >
                      {copy.generic.reveal}
                    </Button>
                  </SpaceBetween>
                ) : (
                  <SpaceBetween direction="horizontal" size="xs">
                    <pre
                      style={{
                        background: '#f2f3f3',
                        padding: '8px',
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        margin: 0,
                      }}
                    >
                      {stringify(value)}
                    </pre>
                    <CopyToClipboard
                      textToCopy={stringify(value)}
                      copyButtonText="Copy"
                      copyErrorText="Failed"
                      copySuccessText="Copied"
                    />
                    {isMasked && (
                      <Button
                        variant="normal"
                        onClick={() =>
                          setRevealed((r) => ({ ...r, [key]: false }))
                        }
                      >
                        {copy.generic.hide}
                      </Button>
                    )}
                  </SpaceBetween>
                )}
              </div>
            )
          })}
        </SpaceBetween>
      </Container>

      <Link to={`/services/${descriptor.serviceKey}`}>
        Back to {descriptor.displayName}
      </Link>
    </SpaceBetween>
  )
}
