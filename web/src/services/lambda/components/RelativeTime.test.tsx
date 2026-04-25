import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelativeTime } from './RelativeTime'

const NOW = new Date('2026-04-17T12:00:00Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RelativeTime [D-10]', () => {
  test('renders relative copy like "3 minutes ago" via Intl.RelativeTimeFormat', () => {
    const iso = new Date(NOW - 3 * 60 * 1000).toISOString()
    render(<RelativeTime iso={iso} />)
    // en locale with {numeric:'auto'} emits "3 minutes ago"
    expect(screen.getByText(/3 minutes ago/i)).toBeDefined()
  })

  test('title attribute exposes absolute ISO string on hover (D-10)', () => {
    const iso = '2026-04-17T11:57:00.000Z'
    render(<RelativeTime iso={iso} />)
    const el = screen.getByText(/3 minutes ago/i)
    expect(el.getAttribute('title')).toBe(iso)
  })

  test('handles future dates', () => {
    const iso = new Date(NOW + 2 * 60 * 60 * 1000).toISOString()
    render(<RelativeTime iso={iso} />)
    // "in 2 hours" for future with numeric:'auto'
    expect(screen.getByText(/in 2 hours/i)).toBeDefined()
  })

  test('"just now" when diff is < 5 seconds', () => {
    const iso = new Date(NOW - 1000).toISOString()
    render(<RelativeTime iso={iso} />)
    expect(screen.getByText(/just now/i)).toBeDefined()
  })

  test('handles very old dates in years', () => {
    const iso = new Date(NOW - 3 * 365 * 86400 * 1000).toISOString()
    render(<RelativeTime iso={iso} />)
    expect(screen.getByText(/3 years ago/i)).toBeDefined()
  })

  test('renders em dash when iso is empty', () => {
    render(<RelativeTime iso="" />)
    expect(screen.getByText('—')).toBeDefined()
  })

  test('falls back to raw string for invalid date', () => {
    render(<RelativeTime iso="not-a-date" />)
    const el = screen.getByText('not-a-date')
    expect(el.getAttribute('title')).toBe('not-a-date')
  })
})
