import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import { RelativeTime } from './RelativeTime'
import { copy } from '../../../shared/copy'
import type { LambdaFunctionConfiguration } from '../../../shared/types'

function formatBytes(n: number): string {
  if (!n && n !== 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

type Props = {
  configuration: LambdaFunctionConfiguration
  code: { RepositoryType: string; Location?: string; ImageUri?: string }
}

/**
 * ConfigurationPanel [LAM-03]
 *
 * Read-only KeyValuePairs view of LambdaFunctionConfiguration fields.
 *
 * - When PackageType === 'Image', the CodeSize row is replaced with an
 *   Image URI row sourced from code.ImageUri (D-02 variant).
 * - Function ARN and Role ARN have CopyToClipboard buttons next to them.
 * - Last modified uses <RelativeTime> (D-10) — native span title exposes
 *   the absolute ISO string.
 * - NO version / alias / Qualifier UI (D-08).
 */
export function ConfigurationPanel({ configuration: c, code }: Props) {
  const isImage = c.PackageType === 'Image'

  const arnItem = {
    label: 'Function ARN',
    value: (
      <SpaceBetween direction="horizontal" size="xs">
        <span>{c.FunctionArn}</span>
        <CopyToClipboard
          textToCopy={c.FunctionArn}
          copyButtonText={copy.lambda.copyArnButton}
          copySuccessText="Copied"
          copyErrorText="Copy failed"
        />
      </SpaceBetween>
    ),
  }

  const roleItem = {
    label: 'Role',
    value: (
      <SpaceBetween direction="horizontal" size="xs">
        <span>{c.Role}</span>
        <CopyToClipboard
          textToCopy={c.Role}
          copyButtonText={copy.lambda.copyArnButton}
          copySuccessText="Copied"
          copyErrorText="Copy failed"
        />
      </SpaceBetween>
    ),
  }

  const codeSizeOrImage = isImage
    ? { label: 'Image URI', value: code.ImageUri || '—' }
    : { label: 'Code size', value: formatBytes(c.CodeSize) }

  const items = [
    arnItem,
    { label: 'Runtime', value: isImage ? 'Image' : c.Runtime || '—' },
    { label: 'Handler', value: c.Handler || '—' },
    { label: 'Memory', value: `${c.MemorySize} MB` },
    { label: 'Timeout', value: `${c.Timeout} seconds` },
    codeSizeOrImage,
    roleItem,
    { label: 'Architectures', value: (c.Architectures ?? []).join(', ') || '—' },
    { label: 'Last modified', value: <RelativeTime iso={c.LastModified} /> },
    { label: 'Revision ID', value: c.RevisionId },
    { label: 'State', value: c.State },
    {
      label: 'Ephemeral storage',
      value: c.EphemeralStorage ? `${c.EphemeralStorage.Size} MB` : '—',
    },
  ]

  return (
    <Box padding="s">
      <KeyValuePairs columns={2} items={items} />
    </Box>
  )
}
