import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import Autosuggest from '@cloudscape-design/components/autosuggest'
import { useServices } from '../shared/api/services'
import { copy } from '../shared/copy'

type ServiceOption = {
  value: string
  label: string
  tags: string[]
  __serviceKey: string
}

export function TopBar() {
  const navigate = useNavigate()
  const { data: services = [] } = useServices()
  const [value, setValue] = useState('')

  const options = useMemo<ServiceOption[]>(
    () =>
      services.map((s) => ({
        value: s.name,
        label: s.name,
        tags: [s.category],
        __serviceKey: s.key,
      })),
    [services],
  )

  return (
    <div id="top-nav">
      <TopNavigation
        identity={{
          href: '/_console/',
          title: copy.brand,
        }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: copy.region,
            items: [{ id: 'us-east-1', text: 'us-east-1' }],
          },
        ]}
        search={
          <Autosuggest
            value={value}
            onChange={({ detail }) => setValue(detail.value)}
            onSelect={({ detail }) => {
              const picked = options.find((o) => o.value === detail.value)
              if (picked) {
                navigate(`/services/${picked.__serviceKey}`)
                setValue('')
              }
            }}
            options={options}
            ariaLabel={copy.searchPlaceholder}
            placeholder={copy.searchPlaceholder}
            enteredTextLabel={(v) => `Go to "${v}"`}
            empty={copy.searchEmpty(value)}
            filteringType="auto"
          />
        }
      />
    </div>
  )
}
