import Box from '@cloudscape-design/components/box'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { RelativeTime } from '../../lambda/components/RelativeTime'
import { copy } from '../../../shared/copy'
import type {
  DdbAttributeDefinition,
  DdbKeySchemaEntry,
  DdbTableDescription,
} from '../../../shared/types/ddb'

type TableDescriptionWithKeys = DdbTableDescription & {
  hashKey: string | null
  sortKey: string | null
}

type Props = {
  tableDescription: TableDescriptionWithKeys
}

type GsiEntry = { IndexName?: string; KeySchema?: DdbKeySchemaEntry[] }

/**
 * ConfigurationTab [DDB-02] — Read-only table metadata.
 *
 * Renders KeyValuePairs for general table state, KeySchema + AttributeDefinitions
 * tables, and a GSI section. Strictly read-only: no mutation handlers anywhere
 * (GSI creation/edit UI deferred per 05-CONTEXT.md "Deferred Ideas").
 */
export function ConfigurationTab({ tableDescription: t }: Props) {
  const billingMode = t.BillingModeSummary?.BillingMode ?? 'PROVISIONED'
  const rcu = t.ProvisionedThroughput?.ReadCapacityUnits
  const wcu = t.ProvisionedThroughput?.WriteCapacityUnits
  const creationIso = t.CreationDateTime
    ? new Date(t.CreationDateTime * 1000).toISOString()
    : ''

  const generalItems = [
    { label: copy.ddb.configTableStatusLabel, value: t.TableStatus ?? '—' },
    { label: copy.ddb.configBillingModeHeading, value: billingMode },
    {
      label: copy.ddb.configCreationDateTimeLabel,
      value: creationIso ? <RelativeTime iso={creationIso} /> : '—',
    },
    {
      label: copy.ddb.configItemCountLabel,
      value:
        t.ItemCount !== undefined ? t.ItemCount.toLocaleString() : '—',
    },
    {
      label: copy.ddb.configTableSizeBytesLabel,
      value:
        t.TableSizeBytes !== undefined
          ? t.TableSizeBytes.toLocaleString()
          : '—',
    },
    { label: copy.ddb.configTableArnLabel, value: t.TableArn ?? '—' },
    ...(billingMode === 'PROVISIONED' && rcu !== undefined
      ? [{ label: copy.ddb.configRcuLabel, value: rcu.toString() }]
      : []),
    ...(billingMode === 'PROVISIONED' && wcu !== undefined
      ? [{ label: copy.ddb.configWcuLabel, value: wcu.toString() }]
      : []),
  ]

  const gsis = (t.GlobalSecondaryIndexes ?? []) as GsiEntry[]

  return (
    <SpaceBetween size="l">
      <Container>
        <Box padding="s">
          <KeyValuePairs columns={2} items={generalItems} />
        </Box>
      </Container>

      <Container
        header={<Header variant="h3">{copy.ddb.configKeySchemaHeading}</Header>}
      >
        <Table
          items={t.KeySchema ?? []}
          variant="embedded"
          columnDefinitions={[
            {
              id: 'attrName',
              header: copy.ddb.configAttrNameColumn,
              cell: (k: DdbKeySchemaEntry) => k.AttributeName,
            },
            {
              id: 'keyType',
              header: copy.ddb.configAttrKeyTypeColumn,
              cell: (k: DdbKeySchemaEntry) =>
                k.KeyType === 'HASH' ? (
                  <StatusIndicator type="success">HASH</StatusIndicator>
                ) : (
                  <StatusIndicator type="info">RANGE</StatusIndicator>
                ),
            },
          ]}
        />
      </Container>

      <Container
        header={
          <Header variant="h3">
            {copy.ddb.configAttributeDefinitionsHeading}
          </Header>
        }
      >
        <Table
          items={t.AttributeDefinitions ?? []}
          variant="embedded"
          columnDefinitions={[
            {
              id: 'attrName',
              header: copy.ddb.configAttrNameColumn,
              cell: (a: DdbAttributeDefinition) => a.AttributeName,
            },
            {
              id: 'attrType',
              header: copy.ddb.configAttrTypeColumn,
              cell: (a: DdbAttributeDefinition) => a.AttributeType,
            },
          ]}
        />
      </Container>

      <Container
        header={<Header variant="h3">{copy.ddb.configGsiHeading}</Header>}
      >
        {gsis.length === 0 ? (
          <Box padding="m">{copy.ddb.configGsiEmpty}</Box>
        ) : (
          <SpaceBetween size="s">
            {gsis.map((g, idx) => (
              <Box padding="s" key={g.IndexName ?? idx}>
                <KeyValuePairs
                  columns={2}
                  items={[
                    { label: 'IndexName', value: g.IndexName ?? '—' },
                    {
                      label: 'KeySchema',
                      value: (g.KeySchema ?? [])
                        .map((k) => `${k.AttributeName} (${k.KeyType})`)
                        .join(', '),
                    },
                  ]}
                />
              </Box>
            ))}
          </SpaceBetween>
        )}
      </Container>
    </SpaceBetween>
  )
}
