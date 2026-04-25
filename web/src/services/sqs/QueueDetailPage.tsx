import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '@cloudscape-design/components/alert'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Tabs from '@cloudscape-design/components/tabs'
import { useQueues } from './api/useQueues'
import { MessagesTab } from './components/MessagesTab'
import { ConfigurationTab } from './components/ConfigurationTab'
import { SendMessageModal } from './components/SendMessageModal'
import { PurgeQueueModal } from './components/PurgeQueueModal'
import { DeleteQueueModal } from './components/DeleteQueueModal'
import {
  useFlashNotifications,
  FlashNotifications,
} from '../ec2/components/FlashNotifications'
import { copy } from '../../shared/copy'

/**
 * QueueDetailPage [SQS-02 / SQS-03] — 2 tabs: Messages, Configuration.
 * No Test / Triggers tab (those are DDB/Lambda patterns, not applicable to SQS).
 */
export default function QueueDetailPage() {
  const params = useParams<{ queueName: string }>()
  const queueName = params.queueName ?? ''
  const queuesQ = useQueues()
  const { items: flashItems, addSuccess, addError } =
    useFlashNotifications()

  const match = useMemo(
    () =>
      queuesQ.data.find((q) =>
        q.url.endsWith('/' + encodeURIComponent(queueName)) ||
        q.url.endsWith('/' + queueName),
      ),
    [queuesQ.data, queueName],
  )

  const [sendOpen, setSendOpen] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (queuesQ.isLoading) {
    return <div>Loading…</div>
  }

  if (!match) {
    return (
      <SpaceBetween size="m">
        <Alert type="error" header={copy.sqs.notFoundHeader}>
          Queue {queueName} not found in this region.
        </Alert>
        <Link to="/services/sqs">{copy.sqs.notFoundBackLink}</Link>
      </SpaceBetween>
    )
  }

  const queueUrl = match.url
  const attrs = match.attributes

  return (
    <SpaceBetween size="l">
      <FlashNotifications items={flashItems} />
      <BreadcrumbGroup
        items={[
          { text: copy.breadcrumbRoot, href: '/_console' },
          { text: copy.sqs.serviceHeading, href: '/_console/services/sqs' },
          { text: queueName, href: '' },
        ]}
      />
      <Header
        variant="h1"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={() => setSendOpen(true)}>
              {copy.sqs.sendButton}
            </Button>
            <Button onClick={() => setPurgeOpen(true)}>
              {copy.sqs.purgeButton}
            </Button>
            <Button onClick={() => setDeleteOpen(true)}>
              {copy.sqs.deleteButton}
            </Button>
          </SpaceBetween>
        }
      >
        {queueName}
      </Header>

      <Tabs
        tabs={[
          {
            id: 'messages',
            label: copy.sqs.messagesHeading,
            content: (
              <MessagesTab queueUrl={queueUrl} queueName={queueName} />
            ),
          },
          {
            id: 'configuration',
            label: copy.sqs.configurationHeading,
            content: <ConfigurationTab attributes={attrs} />,
          },
        ]}
      />

      <SendMessageModal
        visible={sendOpen}
        queueUrl={queueUrl}
        onDismiss={() => setSendOpen(false)}
        onSent={() => {
          addSuccess(copy.sqs.sendSuccess)
          setSendOpen(false)
        }}
        onFailed={(msg) => addError(`Send failed: ${msg}`)}
      />

      <PurgeQueueModal
        visible={purgeOpen}
        queueName={queueName}
        queueUrl={queueUrl}
        onDismiss={() => setPurgeOpen(false)}
        onPurged={(name) => {
          addSuccess(copy.sqs.purgeSuccess(name))
          setPurgeOpen(false)
        }}
        onFailed={(name, err) => {
          addError(`Purge ${name} failed: ${err.message}`)
          setPurgeOpen(false)
        }}
      />

      <DeleteQueueModal
        visible={deleteOpen}
        queueName={queueName}
        queueUrl={queueUrl}
        onDismiss={() => setDeleteOpen(false)}
        onDeleted={(name) => {
          addSuccess(copy.sqs.deleteSuccess(name))
          setDeleteOpen(false)
        }}
        onFailed={(name, err) => {
          addError(`Delete ${name} failed: ${err.message}`)
          setDeleteOpen(false)
        }}
      />
    </SpaceBetween>
  )
}
