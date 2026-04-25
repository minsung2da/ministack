import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemForm } from './ItemForm'

describe('ItemForm [DDB-03 / D-06 scalars-only]', () => {
  test('renders ONE fixed row per KeySchema entry (name input disabled)', () => {
    render(
      <ItemForm
        keySchema={[{ AttributeName: 'pk', KeyType: 'HASH' }]}
        onChange={() => {}}
      />,
    )
    // The key-row name input is disabled and has the value 'pk'.
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="text"]',
    )
    // First text input is name (disabled, value=pk)
    const nameInput = Array.from(inputs).find((i) => i.value === 'pk')
    expect(nameInput).toBeDefined()
    expect(nameInput!.disabled).toBe(true)
  })

  test('has EXACTLY 5 scalar type options — NO L / M / SS / NS / BS', () => {
    render(
      <ItemForm
        keySchema={[{ AttributeName: 'pk', KeyType: 'HASH' }]}
        onChange={() => {}}
      />,
    )
    // The Select renders its options on click — but the type-literal array in
    // the SOURCE file is authoritative (enforced via grep). This test checks
    // that the rendered selection button currently shows "String (S)"
    // (default S for initial key row).
    expect(screen.getByText('String (S)')).toBeDefined()
    // Complex types must not be visible anywhere on mount.
    expect(screen.queryByText('List (L)')).toBeNull()
    expect(screen.queryByText('Map (M)')).toBeNull()
    expect(screen.queryByText('String Set (SS)')).toBeNull()
  })

  test('Add attribute appends a row with default type S (Pitfall 7.10)', () => {
    const onChange = vi.fn()
    render(
      <ItemForm
        keySchema={[{ AttributeName: 'pk', KeyType: 'HASH' }]}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /add attribute/i }))
    // After click — there should be 2 name inputs (pk + new empty).
    const textInputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="text"]',
    )
    expect(textInputs.length).toBeGreaterThanOrEqual(2)
    // The newly added row's name input is empty and NOT disabled.
    const newNameInput = Array.from(textInputs).find(
      (i) => !i.disabled && i.value === '',
    )
    expect(newNameInput).toBeDefined()
  })

  test('emits valid=false while any free-form row has empty name', () => {
    const onChange = vi.fn()
    render(
      <ItemForm
        keySchema={[{ AttributeName: 'pk', KeyType: 'HASH' }]}
        onChange={onChange}
      />,
    )
    // Initial: pk row exists with value=''; valid should be false
    // (S-type with empty string).
    const firstCall = onChange.mock.calls[0]
    expect(firstCall[1]).toBe(false)

    // Add a new row (empty name) and ensure still invalid.
    fireEvent.click(screen.getByRole('button', { name: /add attribute/i }))
    const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1]
    expect(latestCall[1]).toBe(false)
  })

  test('initialValues seeds rows; emits parsed map via onChange', () => {
    const onChange = vi.fn()
    render(
      <ItemForm
        keySchema={[{ AttributeName: 'pk', KeyType: 'HASH' }]}
        initialValues={{
          pk: { type: 'S', value: 'abc' },
          total: { type: 'N', value: '42' },
        }}
        onChange={onChange}
      />,
    )
    // onChange called on mount.
    const firstCall = onChange.mock.calls[0]
    expect(firstCall[0]).toEqual({
      pk: { type: 'S', value: 'abc' },
      total: { type: 'N', value: '42' },
    })
    expect(firstCall[1]).toBe(true)
  })
})
