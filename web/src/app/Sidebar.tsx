import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import SideNavigation, {
  SideNavigationProps,
} from '@cloudscape-design/components/side-navigation'
import { useServices } from '../shared/api/services'
import { CATEGORY_ORDER } from '../shared/serviceCategories'
import { copy } from '../shared/copy'
import type { Service, ServiceCategory } from '../shared/types'

function groupByCategory(
  services: Service[],
): Map<ServiceCategory, Service[]> {
  const groups = new Map<ServiceCategory, Service[]>()
  for (const svc of services) {
    const list = groups.get(svc.category) ?? []
    list.push(svc)
    groups.set(svc.category, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return groups
}

export function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: services = [] } = useServices()

  const items = useMemo<readonly SideNavigationProps.Item[]>(() => {
    const grouped = groupByCategory(services)
    const sections: SideNavigationProps.Item[] = []
    for (const category of CATEGORY_ORDER) {
      const list = grouped.get(category)
      if (!list || list.length === 0) continue
      sections.push({
        type: 'section',
        text: category,
        items: list.map((svc) => ({
          type: 'link',
          text: svc.name,
          href: `/services/${svc.key}`,
        })),
      })
    }
    return sections
  }, [services])

  return (
    <SideNavigation
      header={{ text: copy.sidebarHeader, href: '/' }}
      activeHref={pathname}
      items={items as SideNavigationProps.Item[]}
      onFollow={(e) => {
        if (!e.detail.external) {
          e.preventDefault()
          navigate(e.detail.href)
        }
      }}
    />
  )
}
