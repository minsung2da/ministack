export type ServiceCategory =
  | 'Compute'
  | 'Storage'
  | 'Database'
  | 'Networking & Content Delivery'
  | 'Application Integration'
  | 'Management & Governance'
  | 'Security, Identity & Compliance'
  | 'Other'

export type Service = {
  key: string
  name: string
  category: ServiceCategory
}
