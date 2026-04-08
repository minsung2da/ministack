import type { ServiceCategory } from './types'

// Locked order per 01-UI-SPEC.md §"Service Categories" — used to sort the sidebar.
export const CATEGORY_ORDER: readonly ServiceCategory[] = [
  'Compute',
  'Storage',
  'Database',
  'Networking & Content Delivery',
  'Application Integration',
  'Management & Governance',
  'Security, Identity & Compliance',
  'Other',
] as const
