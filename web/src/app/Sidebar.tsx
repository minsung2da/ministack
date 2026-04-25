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
    // Phase 5 — SQS + Generic framework services (Plan 05-06).
    // Rendered as a static section so the descriptor-driven services are
    // always reachable even if the backend /services registry omits them.
    // Only add entries whose key isn't already present in the backend list
    // (dedupe) — backend-supplied SQS/IAM should not double-render.
    const knownKeys = new Set(services.map((s) => s.key))
    const extras: SideNavigationProps.Link[] = []
    const maybeAdd = (text: string, href: string, key: string) => {
      if (!knownKeys.has(key)) {
        extras.push({ type: 'link', text, href })
      }
    }
    maybeAdd('SQS', '/services/sqs', 'sqs')
    maybeAdd('IAM · Users', '/services/iam.users', 'iam.users')
    maybeAdd('IAM · Roles', '/services/iam.roles', 'iam.roles')
    maybeAdd('IAM · Policies', '/services/iam.policies', 'iam.policies')
    maybeAdd('STS', '/services/sts', 'sts')
    maybeAdd(
      'Secrets Manager',
      '/services/secretsmanager',
      'secretsmanager',
    )
    maybeAdd('Systems Manager', '/services/ssm', 'ssm')
    maybeAdd('KMS', '/services/kms', 'kms')
    if (extras.length > 0) {
      sections.push({
        type: 'section',
        text: 'Messaging & Identity',
        items: extras,
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
