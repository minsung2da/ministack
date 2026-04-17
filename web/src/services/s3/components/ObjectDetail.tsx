import { useState } from 'react'
import Header from '@cloudscape-design/components/header'
import Tabs from '@cloudscape-design/components/tabs'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import Spinner from '@cloudscape-design/components/spinner'
import Alert from '@cloudscape-design/components/alert'
import { copy } from '../../../shared/copy'
import type { S3ObjectEntry } from '../../../shared/types'
import { useObjectMetadata } from '../api/useObjectMetadata'
import { useObjectTags } from '../api/useObjectTags'
import { downloadObject } from '../api/downloadClient'
import { formatBytes } from './columns'

type ObjectDetailProps = {
  bucket: string
  entry: Extract<S3ObjectEntry, { kind: 'file' }>
  onRequestDelete: () => void
}

/**
 * SplitPanel body for a selected file — Properties / Metadata / Tags tabs.
 *
 * - Properties: core HEAD fields (Key, Size, Content type, Last modified,
 *   ETag, Storage class). Copy key + Copy S3 URI actions.
 * - Metadata: user metadata from HeadObject with `x-amz-meta-` stripped
 *   (Pitfall 10, handled by useObjectMetadata hook). React renders values via
 *   `{value}` which escapes HTML → T-3-05-03 mitigation.
 * - Tags: tag set from `GetObjectTagging`.
 *
 * Header actions: Download (triggers downloadObject → blob → revoke in 60s —
 * Pitfall 7 / T-3-05-02), Delete (delegates to parent via onRequestDelete).
 */
export function ObjectDetail({
  bucket,
  entry,
  onRequestDelete,
}: ObjectDetailProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const metadata = useObjectMetadata(bucket, entry.key)
  const tags = useObjectTags(bucket, entry.key)

  const s3Uri = `s3://${bucket}/${entry.key}`

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadObject(bucket, entry.key)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : String(err))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <SpaceBetween size="m">
      <Header
        variant="h2"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <CopyToClipboard
              textToCopy={entry.key}
              copyButtonText={copy.s3.copyKeyButton}
              copySuccessText="Copied"
              copyErrorText="Copy failed"
            />
            <CopyToClipboard
              textToCopy={s3Uri}
              copyButtonText={copy.s3.copyS3UriButton}
              copySuccessText="Copied"
              copyErrorText="Copy failed"
            />
            <Button
              variant="primary"
              loading={downloading}
              onClick={() => void handleDownload()}
            >
              {copy.s3.downloadButton}
            </Button>
            <Button iconName="remove" onClick={onRequestDelete}>
              Delete
            </Button>
          </SpaceBetween>
        }
      >
        {entry.name}
      </Header>
      {downloadError && (
        <Alert type="error">
          {copy.s3.downloadFailureBody(entry.key, downloadError)}
        </Alert>
      )}
      <Tabs
        tabs={[
          {
            id: 'properties',
            label: copy.s3.splitPanelTabProperties,
            content: <PropertiesPanel bucket={bucket} entry={entry} />,
          },
          {
            id: 'metadata',
            label: copy.s3.splitPanelTabMetadata,
            content: (
              <MetadataPanel
                isLoading={metadata.isLoading}
                error={metadata.error as Error | null}
                userMetadata={metadata.data?.userMetadata ?? {}}
              />
            ),
          },
          {
            id: 'tags',
            label: copy.s3.splitPanelTabTags,
            content: (
              <TagsPanel
                isLoading={tags.isLoading}
                error={tags.error as Error | null}
                tags={tags.data ?? []}
              />
            ),
          },
        ]}
      />
    </SpaceBetween>
  )
}

function PropertiesPanel({
  entry,
}: {
  bucket: string
  entry: Extract<S3ObjectEntry, { kind: 'file' }>
}) {
  return (
    <KeyValuePairs
      columns={2}
      items={[
        { label: copy.s3.propertyKey, value: entry.key },
        {
          label: copy.s3.propertySize,
          value: `${entry.size} bytes (${formatBytes(entry.size)})`,
        },
        { label: copy.s3.propertyLastModified, value: entry.lastModified },
        { label: copy.s3.propertyEtag, value: entry.etag },
      ]}
    />
  )
}

function MetadataPanel({
  isLoading,
  error,
  userMetadata,
}: {
  isLoading: boolean
  error: Error | null
  userMetadata: Record<string, string>
}) {
  if (isLoading) return <Spinner />
  if (error) return <Alert type="error">{error.message}</Alert>
  const keys = Object.keys(userMetadata)
  if (keys.length === 0) {
    return (
      <Box variant="p" color="text-status-inactive">
        {copy.s3.metadataEmpty}
      </Box>
    )
  }
  return (
    <KeyValuePairs
      columns={2}
      items={keys.map((k) => ({ label: k, value: userMetadata[k] }))}
    />
  )
}

function TagsPanel({
  isLoading,
  error,
  tags,
}: {
  isLoading: boolean
  error: Error | null
  tags: { key: string; value: string }[]
}) {
  if (isLoading) return <Spinner />
  if (error) return <Alert type="error">{error.message}</Alert>
  if (tags.length === 0) {
    return (
      <Box variant="p" color="text-status-inactive">
        {copy.s3.tagsEmpty}
      </Box>
    )
  }
  return (
    <KeyValuePairs
      columns={2}
      items={tags.map((t) => ({ label: t.key, value: t.value }))}
    />
  )
}
