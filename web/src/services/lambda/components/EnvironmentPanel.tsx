import Table from '@cloudscape-design/components/table'
import TextFilter from '@cloudscape-design/components/text-filter'
import Box from '@cloudscape-design/components/box'
import { useCollection } from '@cloudscape-design/collection-hooks'
import { copy } from '../../../shared/copy'

type EnvEntry = { key: string; value: string }

type Props = {
  environment?: { Variables?: Record<string, string> } | null
}

/**
 * EnvironmentPanel [LAM-03 / D-05]
 *
 * Renders environment variables as a two-column table (Key / Value).
 *
 * D-05 explicit: values are rendered as plaintext strings. See
 * 04-CONTEXT.md §D-05 for the full rationale — MiniStack is a LOCAL
 * emulator; shoulder-surfing is not part of the threat model. Secrets
 * are on the user's own machine.
 */
export function EnvironmentPanel({ environment }: Props) {
  const entries: EnvEntry[] = Object.entries(
    environment?.Variables ?? {},
  ).map(([key, value]) => ({ key, value }))

  if (entries.length === 0) {
    return (
      <Box padding="m" variant="p">
        {copy.lambda.environmentEmpty}
      </Box>
    )
  }

  return <EnvironmentTable entries={entries} />
}

function EnvironmentTable({ entries }: { entries: EnvEntry[] }) {
  const { items, collectionProps, filterProps, filteredItemsCount } =
    useCollection(entries, {
      filtering: {
        empty: (
          <Box padding="m" variant="p">
            {copy.lambda.environmentEmpty}
          </Box>
        ),
        noMatch: (
          <Box padding="m" variant="p">
            No environment variables match the filter.
          </Box>
        ),
      },
      sorting: {
        defaultState: {
          sortingColumn: { sortingField: 'key' },
          isDescending: false,
        },
      },
    })

  return (
    <Table
      {...collectionProps}
      items={items}
      variant="embedded"
      filter={
        <TextFilter
          {...filterProps}
          filteringPlaceholder="Find"
          countText={
            filteredItemsCount !== undefined ? `${filteredItemsCount} matches` : ''
          }
        />
      }
      columnDefinitions={[
        {
          id: 'key',
          header: 'Key',
          sortingField: 'key',
          cell: (e: EnvEntry) => e.key,
        },
        {
          id: 'value',
          header: 'Value',
          sortingField: 'value',
          // D-05: plaintext render — React escapes string content.
          cell: (e: EnvEntry) => e.value,
        },
      ]}
    />
  )
}
