import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import Tabs from '@cloudscape-design/components/tabs'
import Header from '@cloudscape-design/components/header'
import Alert from '@cloudscape-design/components/alert'
import Spinner from '@cloudscape-design/components/spinner'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useFunction } from './api/useFunction'
import { ConfigurationPanel } from './components/ConfigurationPanel'
import { EnvironmentPanel } from './components/EnvironmentPanel'
import { TriggersPanel } from './components/TriggersPanel'
import { InvokePanel } from './components/InvokePanel'
import { copy } from '../../shared/copy'

/**
 * FunctionDetailPage [LAM-03]
 *
 * Replaces the Plan 03 stub. Renders a 4-tab shell (Configuration /
 * Environment / Triggers / Test) locked by D-03.
 *
 * Payload state is LIFTED at the page level (Pitfall 10) so it survives
 * tab switches. Open Question 3: payload is reset to '{}' whenever the
 * :functionName route param changes — so switching between two functions
 * does not leak one's payload into the other.
 *
 * D-08 compliance: see 04-CONTEXT.md §D-08 for the scope boundary
 * (versioning UI deferred). All reads operate on the default
 * (unversioned) function via useFunction(name).
 *
 * The Test tab renders the InvokePanel, which consumes the lifted
 * payload state.
 */
export default function FunctionDetailPage() {
  const { functionName = '' } = useParams<{ functionName: string }>()
  const { data, isLoading, error } = useFunction(functionName)
  const [activeTabId, setActiveTabId] = useState<string>('configuration')

  // Pitfall 10 — payload state lifted to page level so Textarea content
  // survives tab switches when Plan 05 lands the InvokePanel.
  const [payload, setPayload] = useState<string>('{}')

  // Open Question 3 — reset payload when route param functionName changes.
  useEffect(() => {
    setPayload('{}')
  }, [functionName])

  if (isLoading) return <Spinner />

  if (error) {
    const message = (error as Error).message ?? ''
    const isNotFound = /404|not found/i.test(message)
    if (isNotFound) {
      return (
        <Alert type="error" header={copy.lambda.notFoundHeader}>
          {copy.lambda.notFoundBody}{' '}
          <RouterLink to="/services/lambda">
            {copy.lambda.notFoundBackLink}
          </RouterLink>
        </Alert>
      )
    }
    return (
      <Alert type="error" header={copy.lambda.detailLoadErrorHeader}>
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
            text: copy.lambda.serviceHeading,
            href: '/_console/services/lambda',
          },
          { text: functionName, href: '' },
        ]}
      />
      <Header
        variant="h1"
        actions={
          <CopyToClipboard
            textToCopy={functionName}
            copyButtonText={copy.lambda.copyFunctionNameButton}
            copySuccessText="Copied"
            copyErrorText="Copy failed"
          />
        }
      >
        {functionName}
      </Header>
      <Tabs
        activeTabId={activeTabId}
        onChange={(e) => setActiveTabId(e.detail.activeTabId)}
        tabs={[
          {
            id: 'configuration',
            label: copy.lambda.configurationHeading,
            content: (
              <ConfigurationPanel
                configuration={data.Configuration}
                code={data.Code}
              />
            ),
          },
          {
            id: 'environment',
            label: copy.lambda.environmentHeading,
            content: (
              <EnvironmentPanel
                environment={data.Configuration.Environment}
              />
            ),
          },
          {
            id: 'triggers',
            label: copy.lambda.triggersHeading,
            content: <TriggersPanel functionName={functionName} />,
          },
          {
            id: 'test',
            label: copy.lambda.testHeading,
            content: (
              <InvokePanel
                functionName={functionName}
                payload={payload}
                onPayloadChange={setPayload}
              />
            ),
          },
        ]}
      />
    </SpaceBetween>
  )
}
