/**
 * TanStack Query hooks and XML parser for EC2 AMIs (Images).
 *
 * Provides:
 *   Ec2Image       — image type
 *   parseImages    — XML → Ec2Image[]
 *   useImages      — query hook (DescribeImages)
 */

import { useQuery } from '@tanstack/react-query'
import { ec2Query } from './ec2Client'
import { parseXml, getText, getItems, getNameTag } from '../../../shared/api/xml'

export interface Ec2Image {
  imageId: string
  name: string
  description: string
  architecture: string
  platform: string
}

/**
 * Parses a DescribeImages XML response into an array of Ec2Image.
 *
 * Images are inside <imagesSet><item>.
 */
export function parseImages(xml: string): Ec2Image[] {
  const doc = parseXml(xml)
  const items = getItems(doc, 'imagesSet')

  return items.map((el) => ({
    imageId: getText(el, 'imageId'),
    name: getNameTag(el) || getText(el, 'name'),
    description: getText(el, 'description'),
    architecture: getText(el, 'architecture'),
    platform: getText(el, 'platform'),
  }))
}

/**
 * Query hook — fetches all available AMIs via DescribeImages.
 * Long stale time (5 minutes) since AMIs rarely change.
 */
export function useImages() {
  return useQuery({
    queryKey: ['ec2', 'images'],
    queryFn: () => ec2Query('DescribeImages').then(parseImages),
    staleTime: 300_000,
  })
}
