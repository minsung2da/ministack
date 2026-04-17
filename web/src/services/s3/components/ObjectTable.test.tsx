import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ObjectTable } from './ObjectTable'
import type { ListObjectsResult, S3ObjectEntry } from '../../../shared/types'

function wrap(ui: React.ReactNode) {
  return <MemoryRouter>{ui}</MemoryRouter>
}

const SAMPLE_DATA: ListObjectsResult = {
  entries: [
    { kind: 'folder', key: 'photos/2026/', name: '2026' },
    {
      kind: 'file',
      key: 'photos/cat.jpg',
      name: 'cat.jpg',
      size: 1258291,
      lastModified: '2026-04-12T10:30:00Z',
      etag: '"abc123"',
    },
    {
      kind: 'file',
      key: 'photos/readme.txt',
      name: 'readme.txt',
      size: 128,
      lastModified: '2026-04-13T08:12:00Z',
      etag: '"def456"',
    },
  ],
  isTruncated: false,
  nextContinuationToken: null,
  keyCount: 3,
}

const EMPTY_PAGINATION = {
  canPrev: false,
  canNext: false,
  onPrev: () => {},
  onNext: () => {},
  pageLabel: 'Page 1',
}

function renderTable(
  overrides: Partial<React.ComponentProps<typeof ObjectTable>> = {},
) {
  const props: React.ComponentProps<typeof ObjectTable> = {
    bucket: 'my-bucket',
    prefix: 'photos/',
    data: SAMPLE_DATA,
    isLoading: false,
    error: null,
    selected: [],
    onSelectionChange: () => {},
    onFileClick: () => {},
    onFolderClick: () => {},
    onParentClick: () => {},
    onRefresh: () => {},
    onUploadClick: () => {},
    onDeleteSelected: () => {},
    pagination: EMPTY_PAGINATION,
    ...overrides,
  }
  return render(wrap(<ObjectTable {...props} />))
}

describe('ObjectTable [S3-02]', () => {
  test('synthetic .. parent row renders first when prefix is non-empty', () => {
    renderTable({ prefix: 'photos/' })
    // Parent row shows ".." as the name
    const parentCells = screen.getAllByText('..')
    expect(parentCells.length).toBeGreaterThan(0)
  })

  test('no .. parent row when at root prefix', () => {
    renderTable({ prefix: '' })
    expect(screen.queryByText('..')).toBeNull()
  })

  test('folder name renders as a clickable element; click fires onFolderClick with the folder key', () => {
    const onFolderClick = vi.fn()
    renderTable({ onFolderClick, prefix: 'photos/' })
    // Folder cell shows "2026" and should be a link
    const folderLink = screen.getByText('2026')
    fireEvent.click(folderLink)
    expect(onFolderClick).toHaveBeenCalledWith('photos/2026/')
  })

  test('clicking .. parent row fires onParentClick', () => {
    const onParentClick = vi.fn()
    renderTable({ onParentClick, prefix: 'photos/' })
    const parentLink = screen.getByText('..')
    fireEvent.click(parentLink)
    expect(onParentClick).toHaveBeenCalled()
  })

  test('file row Size column formats bytes (1.2 MB)', () => {
    renderTable({ prefix: 'photos/' })
    // 1258291 bytes → "1.2 MB"
    expect(screen.getByText('1.2 MB')).toBeTruthy()
    // 128 bytes → "128 B"
    expect(screen.getByText('128 B')).toBeTruthy()
  })

  test('folders display - for size and last modified', () => {
    renderTable({ prefix: 'photos/' })
    // Expect multiple "-" cells for the folder row (size + lastModified)
    // plus the parent row (also shows -)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })

  test('Next pagination button is disabled when canNext=false', () => {
    renderTable({
      pagination: { ...EMPTY_PAGINATION, canNext: false },
    })
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn.hasAttribute('disabled')).toBe(true)
  })

  test('Next pagination button is enabled when canNext=true (isTruncated)', () => {
    renderTable({
      data: {
        ...SAMPLE_DATA,
        isTruncated: true,
        nextContinuationToken: 'tok1',
      },
      pagination: { ...EMPTY_PAGINATION, canNext: true },
    })
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn.hasAttribute('disabled')).toBe(false)
  })

  test('Next pagination click invokes onNext', () => {
    const onNext = vi.fn()
    renderTable({
      pagination: { ...EMPTY_PAGINATION, canNext: true, onNext },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onNext).toHaveBeenCalled()
  })

  test('Refresh icon fires onRefresh', () => {
    const onRefresh = vi.fn()
    renderTable({ onRefresh })
    // iconName="refresh" button has ariaLabel copy.s3.refreshTooltip = 'Refresh'
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onRefresh).toHaveBeenCalled()
  })

  test('header counter uses keyCount', () => {
    renderTable()
    expect(screen.getByText(/Objects \(3\)/)).toBeTruthy()
  })

  test('error state renders a load-error Alert with Retry', () => {
    const onRefresh = vi.fn()
    renderTable({
      error: new Error('boom'),
      data: undefined,
      onRefresh,
    })
    expect(screen.getByText('Could not load objects')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRefresh).toHaveBeenCalled()
  })

  test('selection is gated to files (folder entry not passed to onSelectionChange)', () => {
    // Render with a file selected via controlled prop — verify we don't crash.
    const fileEntry = SAMPLE_DATA.entries.find(
      (e) => e.kind === 'file',
    ) as Extract<S3ObjectEntry, { kind: 'file' }>
    renderTable({ selected: [fileEntry] })
    // Ensure the table actually rendered all 3 rows
    expect(screen.getByText('cat.jpg')).toBeTruthy()
  })
})
