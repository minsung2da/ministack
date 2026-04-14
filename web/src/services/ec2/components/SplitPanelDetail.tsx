import type { ReactNode } from 'react'
import Tabs from '@cloudscape-design/components/tabs'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import ColumnLayout from '@cloudscape-design/components/column-layout'

type KeyValueItem = {
  label: string
  value: ReactNode
}

type TabItem = {
  id: string
  label: string
  content: ReactNode
}

type SplitPanelDetailProps = {
  header: string
  tabs?: TabItem[]
  keyValueItems?: KeyValueItem[]
}

export function SplitPanelDetail({
  tabs,
  keyValueItems,
}: SplitPanelDetailProps) {
  if (tabs && tabs.length > 0) {
    return (
      <Tabs
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          content: tab.content,
        }))}
      />
    )
  }

  if (keyValueItems && keyValueItems.length > 0) {
    return (
      <ColumnLayout columns={2} variant="text-grid">
        <KeyValuePairs
          columns={2}
          items={keyValueItems.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
        />
      </ColumnLayout>
    )
  }

  return null
}
