import { useParams, Link as RouterLink } from 'react-router-dom'
import { useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Spinner from '@cloudscape-design/components/spinner'
import Tabs from '@cloudscape-design/components/tabs'
import { useTable } from './api/useTable'
import { ItemsTab } from './components/ItemsTab'
import { ConfigurationTab } from './components/ConfigurationTab'
import { copy } from '../../shared/copy'

/**
 * TableDetailPage [DDB-02] — 2-tab shell (Items, Configuration).
 *
 * DDB has no equivalent surface for Triggers / Test tabs (Phase 4 Lambda) —
 * divergence from the 4-tab Lambda structure is intentional and locked.
 */
export default function TableDetailPage() {
  const { tableName = '' } = useParams<{ tableName: string }>()
  const { data, isLoading, error } = useTable(tableName)
  const [activeTabId, setActiveTabId] = useState<'items' | 'configuration'>(
    'items',
  )

  if (isLoading) return <Spinner />

  if (error) {
    const message = (error as Error).message ?? ''
    const isNotFound = /404|not found|ResourceNotFound/i.test(message)
    if (isNotFound) {
      return (
        <Alert type="error" header={copy.ddb.notFoundHeader}>
          {copy.ddb.notFoundBody}{' '}
          <RouterLink to="/services/ddb">
            {copy.ddb.notFoundBackLink}
          </RouterLink>
        </Alert>
      )
    }
    return (
      <Alert type="error" header={copy.ddb.detailLoadErrorHeader}>
        {message}
      </Alert>
    )
  }

  if (!data) return null

  return (
    <SpaceBetween size="l">
      <BreadcrumbGroup
        items={[
          { text: copy.breadcrumbRoot, href: '/_console' },
          {
            text: copy.ddb.serviceHeading,
            href: '/_console/services/ddb',
          },
          { text: tableName, href: '' },
        ]}
      />
      <Header
        variant="h1"
        actions={
          <CopyToClipboard
            textToCopy={tableName}
            copyButtonText={copy.ddb.copyTableNameButton}
            copySuccessText="Copied"
            copyErrorText="Copy failed"
          />
        }
      >
        {tableName}
      </Header>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) =>
          setActiveTabId(detail.activeTabId as 'items' | 'configuration')
        }
        tabs={[
          {
            id: 'items',
            label: copy.ddb.itemsHeading,
            content: <ItemsTab tableDescription={data} />,
          },
          {
            id: 'configuration',
            label: copy.ddb.configurationHeading,
            content: <ConfigurationTab tableDescription={data} />,
          },
        ]}
      />
    </SpaceBetween>
  )
}
