/**
 * RelativeTime — [D-10]
 *
 * Renders an ISO timestamp as relative English copy ("3 minutes ago",
 * "in 2 hours") using Intl.RelativeTimeFormat with {numeric:'auto'}. The
 * absolute ISO string is exposed via the `title` attribute so users can
 * hover to reveal the exact timestamp.
 *
 * Zero dependencies — native Intl API only. No Moment/date-fns/dayjs.
 */

type Unit = { unit: Intl.RelativeTimeFormatUnit; seconds: number }

const UNITS: Unit[] = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
]

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function RelativeTime({ iso }: { iso: string }) {
  if (!iso) return <span>—</span>
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return <span title={iso}>{iso}</span>

  const diffSec = Math.round((then - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)
  if (absSec < 5) return <span title={iso}>just now</span>

  const match = UNITS.find((u) => absSec >= u.seconds) ?? UNITS[UNITS.length - 1]
  const value = Math.round(diffSec / match.seconds)
  return <span title={iso}>{RTF.format(value, match.unit)}</span>
}
