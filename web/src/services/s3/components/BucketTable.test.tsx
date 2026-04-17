import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BucketTable } from './BucketTable'
import type { S3Bucket } from '../../../shared/types'

function wrap(ui: React.ReactNode) {
  return <MemoryRouter initialEntries={['/services/s3']}>{ui}</MemoryRouter>
}

const SAMPLE: S3Bucket[] = [
  { name: 'my-bucket', creationDate: '2026-04-12T10:30:00Z' },
  { name: 'other-bucket', creationDate: '2026-04-15T08:12:00Z' },
]

describe('BucketTable [S3-01]', () => {
  test('renders bucket name as Link navigating to /services/s3/{name}', () => {
    render(
      wrap(
        <BucketTable
          buckets={SAMPLE}
          loading={false}
          error={null}
          selectedItems={[]}
          onRefresh={() => {}}
          onCreate={() => {}}
          onDeleteSelected={() => {}}
          onSelectionChange={() => {}}
        />,
      ),
    )
    const link = screen.getByRole('link', { name: 'my-bucket' })
    expect(link).toHaveAttribute('href', '/services/s3/my-bucket')
  })

  test('empty-state body matches copy.s3.bucketsEmptyBody', () => {
    render(
      wrap(
        <BucketTable
          buckets={[]}
          loading={false}
          error={null}
          selectedItems={[]}
          onRefresh={() => {}}
          onCreate={() => {}}
          onDeleteSelected={() => {}}
          onSelectionChange={() => {}}
        />,
      ),
    )
    expect(
      screen.getAllByText(
        'You have no S3 buckets. Create a bucket to store objects.',
      ).length,
    ).toBeGreaterThan(0)
  })

  test('load-error Alert shows retry button that invokes onRefresh', () => {
    const onRefresh = vi.fn()
    render(
      wrap(
        <BucketTable
          buckets={[]}
          loading={false}
          error={new Error('boom')}
          selectedItems={[]}
          onRefresh={onRefresh}
          onCreate={() => {}}
          onDeleteSelected={() => {}}
          onSelectionChange={() => {}}
        />,
      ),
    )
    expect(screen.getByText('Could not load buckets')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRefresh).toHaveBeenCalled()
  })

  test('row selection fires onSelectionChange with first selected bucket', () => {
    const onSelectionChange = vi.fn()
    render(
      wrap(
        <BucketTable
          buckets={SAMPLE}
          loading={false}
          error={null}
          selectedItems={[]}
          onRefresh={() => {}}
          onCreate={() => {}}
          onDeleteSelected={() => {}}
          onSelectionChange={onSelectionChange}
        />,
      ),
    )
    // Cloudscape renders a checkbox per row. Click the first data-row checkbox.
    // `getAllByRole('checkbox')` order: [select-all, row1, row2]
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(checkboxes[1])
    expect(onSelectionChange).toHaveBeenCalled()
    const arg = onSelectionChange.mock.calls[0][0] as S3Bucket | null
    expect(arg?.name).toBe('my-bucket')
  })
})
