import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BreadcrumbGroup, {
  BreadcrumbGroupProps,
} from '@cloudscape-design/components/breadcrumb-group'
import { useServices } from '../shared/api/services'
import { copy } from '../shared/copy'

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { data: services = [] } = useServices()

  const items = useMemo<BreadcrumbGroupProps.Item[]>(() => {
    const parts = pathname.split('/').filter(Boolean)
    const crumbs: BreadcrumbGroupProps.Item[] = [
      { text: copy.breadcrumbRoot, href: '/' },
    ]
    if (parts[0] === 'services' && parts[1]) {
      const svc = services.find((s) => s.key === parts[1])
      crumbs.push({
        text: svc?.name ?? parts[1],
        href: `/services/${parts[1]}`,
      })
    }
    return crumbs
  }, [pathname, services])

  return (
    <BreadcrumbGroup
      items={items}
      onFollow={(e) => {
        e.preventDefault()
        navigate(e.detail.href)
      }}
    />
  )
}
