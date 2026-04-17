import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from './DropZone'

function mockDataTransfer(files: File[]): DataTransfer {
  return {
    files: {
      ...files,
      length: files.length,
      item: (i: number) => files[i] ?? null,
    } as unknown as FileList,
    types: ['Files'],
  } as unknown as DataTransfer
}

describe('DropZone [S3-03]', () => {
  test('onDragOver shows drag-over visual state', () => {
    const onDrop = vi.fn()
    render(
      <DropZone onDrop={onDrop} currentPrefix="">
        <div data-testid="child">inner</div>
      </DropZone>,
    )
    const region = screen.getByRole('region')
    expect(region.getAttribute('data-drag-over')).toBe('false')

    fireEvent.dragEnter(region)
    expect(region.getAttribute('data-drag-over')).toBe('true')
  })

  test('onDragLeave ignores child-to-child transitions (Pitfall 2)', () => {
    const onDrop = vi.fn()
    render(
      <DropZone onDrop={onDrop} currentPrefix="">
        <div data-testid="child">inner</div>
      </DropZone>,
    )
    const region = screen.getByRole('region')
    // Two dragEnter events (parent + child) → depth 2
    fireEvent.dragEnter(region)
    fireEvent.dragEnter(region)
    // One dragLeave → depth 1, still over
    fireEvent.dragLeave(region)
    expect(region.getAttribute('data-drag-over')).toBe('true')
    // Second dragLeave → depth 0, no longer over
    fireEvent.dragLeave(region)
    expect(region.getAttribute('data-drag-over')).toBe('false')
  })

  test('onDrop extracts Array<File> from DataTransfer.files', () => {
    const onDrop = vi.fn()
    render(
      <DropZone onDrop={onDrop} currentPrefix="">
        <div>inner</div>
      </DropZone>,
    )
    const region = screen.getByRole('region')
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' })
    const f2 = new File(['bb'], 'b.txt', { type: 'text/plain' })
    fireEvent.drop(region, { dataTransfer: mockDataTransfer([f1, f2]) })

    expect(onDrop).toHaveBeenCalledTimes(1)
    const arg = onDrop.mock.calls[0][0] as File[]
    expect(arg).toHaveLength(2)
    expect(arg[0].name).toBe('a.txt')
    expect(arg[1].name).toBe('b.txt')
  })

  test('drag-over overlay shows prefix-aware copy', () => {
    render(
      <DropZone onDrop={() => {}} currentPrefix="photos/">
        <div>inner</div>
      </DropZone>,
    )
    const region = screen.getByRole('region')
    fireEvent.dragEnter(region)
    expect(screen.getByText(/photos\//)).toBeTruthy()
  })

  test('disabled prop suppresses onDrop', () => {
    const onDrop = vi.fn()
    render(
      <DropZone onDrop={onDrop} disabled currentPrefix="">
        <div>inner</div>
      </DropZone>,
    )
    const region = screen.getByRole('region')
    const f1 = new File(['a'], 'a.txt')
    fireEvent.drop(region, { dataTransfer: mockDataTransfer([f1]) })
    expect(onDrop).not.toHaveBeenCalled()
  })
})
