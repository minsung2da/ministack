import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'

type PrefixBreadcrumbProps = {
  bucketName: string
  prefix: string
  onNavigate: (newPrefix: string) => void
}

/**
 * Inner prefix breadcrumb per UI-SPEC §"Prefix Breadcrumb".
 *
 * Renders one breadcrumb item per segment of the current prefix, preceded by
 * the bucket name as the root item.
 *
 *   bucket="my-bucket", prefix="photos/2026/"
 *     → [my-bucket] / [photos] / [2026]
 *
 * Clicking a segment calls `onNavigate` with the accumulated prefix up to and
 * including that segment (with trailing slash). Clicking the bucket-name root
 * item calls `onNavigate('')` to clear the prefix.
 *
 * The last breadcrumb item is treated as "current" by Cloudscape and rendered
 * as non-clickable text automatically.
 */
export function PrefixBreadcrumb({
  bucketName,
  prefix,
  onNavigate,
}: PrefixBreadcrumbProps) {
  const segments = prefix.replace(/\/$/, '').split('/').filter(Boolean)

  type Item = { text: string; href: string }
  const items: Item[] = [
    { text: bucketName, href: '' },
    ...segments.map((seg, i) => ({
      text: seg,
      href: segments.slice(0, i + 1).join('/') + '/',
    })),
  ]

  return (
    <div role="navigation" aria-label="Folder navigation">
      <BreadcrumbGroup
        items={items}
        onFollow={(e) => {
          e.preventDefault()
          onNavigate(e.detail.href)
        }}
      />
    </div>
  )
}
