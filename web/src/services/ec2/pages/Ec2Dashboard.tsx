import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import Header from '@cloudscape-design/components/header'
import Tabs from '@cloudscape-design/components/tabs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { copy } from '../../../shared/copy'

const EC2_TABS = [
  { id: 'instances', label: 'Instances', href: 'instances' },
  { id: 'vpcs', label: 'VPCs', href: 'vpcs' },
  { id: 'subnets', label: 'Subnets', href: 'subnets' },
  { id: 'security-groups', label: 'Security Groups', href: 'security-groups' },
  { id: 'key-pairs', label: 'Key Pairs', href: 'key-pairs' },
  { id: 'volumes', label: 'Volumes', href: 'volumes' },
  { id: 'snapshots', label: 'Snapshots', href: 'snapshots' },
  { id: 'elastic-ips', label: 'Elastic IPs', href: 'elastic-ips' },
  { id: 'internet-gateways', label: 'Internet Gateways', href: 'internet-gateways' },
  { id: 'nat-gateways', label: 'NAT Gateways', href: 'nat-gateways' },
  { id: 'route-tables', label: 'Route Tables', href: 'route-tables' },
  { id: 'network-interfaces', label: 'Network Interfaces', href: 'network-interfaces' },
] as const

function getActiveTabId(pathname: string): string {
  // pathname is like /services/ec2/instances or /services/ec2/security-groups
  const segments = pathname.split('/')
  const last = segments[segments.length - 1]
  const match = EC2_TABS.find((tab) => tab.id === last)
  return match ? match.id : 'instances'
}

export default function Ec2Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTabId = getActiveTabId(location.pathname)

  return (
    <SpaceBetween size="l">
      <Header variant="h1">{copy.ec2Heading}</Header>
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => navigate(detail.activeTabId, { replace: true })}
        tabs={EC2_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          content: null,
        }))}
      />
      <Outlet />
    </SpaceBetween>
  )
}
