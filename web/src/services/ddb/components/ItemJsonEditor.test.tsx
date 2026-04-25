import { describe, test, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { ItemJsonEditor } from './ItemJsonEditor'

describe('ItemJsonEditor [DDB-03]', () => {
  test('valid JSON → onChange fires with valid=true + parsed object', () => {
    const onChange = vi.fn()
    render(<ItemJsonEditor value='{"pk":{"S":"x"}}' onChange={onChange} />)
    const initial = onChange.mock.calls[0]
    expect(initial[2]).toBe(true)
    expect(initial[1]).toEqual({ pk: { S: 'x' } })
  })

  test('invalid JSON → onChange fires with valid=false + parsed=null', () => {
    const onChange = vi.fn()
    render(<ItemJsonEditor value='{invalid' onChange={onChange} />)
    const initial = onChange.mock.calls[0]
    expect(initial[2]).toBe(false)
    expect(initial[1]).toBeNull()
  })

  test('typing invalid JSON shows error text', () => {
    const onChange = vi.fn()
    render(<ItemJsonEditor value='{}' onChange={onChange} />)
    const textarea = document.querySelector('textarea')!
    fireEvent.change(textarea, { target: { value: '{bogus' } })
    // Error banner contains "Invalid JSON:"
    expect(screen.getAllByText(/Invalid JSON:/).length).toBeGreaterThan(0)
  })
})
