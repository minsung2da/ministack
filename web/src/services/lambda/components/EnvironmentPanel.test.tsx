import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnvironmentPanel } from './EnvironmentPanel'
import { copy } from '../../../shared/copy'

// [LAM-03 / D-05] Environment tab — plaintext only, no masking.
describe('EnvironmentPanel', () => {
  test('empty env renders empty-state copy and no table', () => {
    const { container } = render(
      <EnvironmentPanel environment={{ Variables: {} }} />,
    )
    expect(screen.getByText(copy.lambda.environmentEmpty)).toBeDefined()
    // No <table> rendered
    expect(container.querySelector('table')).toBeNull()
  })

  test('renders env var key/value rows as plaintext — no masking (D-05)', () => {
    const { container } = render(
      <EnvironmentPanel
        environment={{ Variables: { LOG_LEVEL: 'info', API_KEY: 'abc123' } }}
      />,
    )
    expect(screen.getByText('LOG_LEVEL')).toBeDefined()
    expect(screen.getByText('info')).toBeDefined()
    expect(screen.getByText('API_KEY')).toBeDefined()
    // Value rendered as-is — no masking, no `***`
    expect(screen.getByText('abc123')).toBeDefined()
    expect(container.innerHTML).not.toContain('***')
    expect(container.innerHTML).not.toMatch(/type=["']password["']/)
  })

  test('no show/hide toggle or "Reveal" button rendered (D-05)', () => {
    const { container } = render(
      <EnvironmentPanel
        environment={{ Variables: { SECRET: 'xyz' } }}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /reveal|show|hide|unmask|mask/i }),
    ).toBeNull()
    // HTML must not include masking artifacts
    expect(container.innerHTML).not.toMatch(/password|mask|reveal/i)
  })

  test('filter "API" narrows to API_KEY row', () => {
    render(
      <EnvironmentPanel
        environment={{ Variables: { LOG_LEVEL: 'info', API_KEY: 'abc123' } }}
      />,
    )
    // Cloudscape TextFilter input
    const filterInput = document.querySelector(
      'input[type="search"], input[type="text"]',
    ) as HTMLInputElement | null
    if (filterInput) {
      fireEvent.change(filterInput, { target: { value: 'API' } })
    }
    expect(screen.getByText('API_KEY')).toBeDefined()
    expect(screen.queryByText('LOG_LEVEL')).toBeNull()
  })
})
